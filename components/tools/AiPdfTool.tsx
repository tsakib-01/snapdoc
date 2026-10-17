'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Bot,
  Sparkles,
  MessageSquare,
  HelpCircle,
  Loader2,
  RotateCcw,
  Send,
  CornerDownLeft,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Zap,
  Database,
  Cpu,
} from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';
import {
  buildChunks,
  embedChunks,
  generateSummary,
  answerQuestion,
  generateQaPairs,
  onAiProgress,
  IndexedDocument,
  SummaryResult,
  QaPair,
  ChatResult,
} from '@/lib/ai/localAiEngine';

// ── Extractive fallback (no neural model needed) ──────────────────────────────
import {
  extractKeyFindings,
  extractActionItems,
  splitIntoSentences,
  generateSmartDocumentQa,
  processPdfChatQuery,
} from '@/lib/ai/pdfQuestionAnswering';

interface AiPdfToolProps {
  defaultTab?: 'summary' | 'chat' | 'quiz';
}

type ModelPhase =
  | 'idle'
  | 'extracting'
  | 'chunking'
  | 'loading_models'
  | 'embedding'
  | 'summarising'
  | 'generating_qa'
  | 'ready'
  | 'error';

interface ProgressInfo {
  phase: ModelPhase;
  message: string;
  pct: number;         // 0-100
  neural: boolean;     // true = neural path active
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiPdfTool({ defaultTab = 'summary' }: AiPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'quiz'>(defaultTab);

  // Indexed document (chunks + embeddings)
  const [doc, setDoc] = useState<IndexedDocument | null>(null);
  const [pageTexts, setPageTexts] = useState<string[]>([]);

  // Results
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [quizzes, setQuizzes] = useState<QaPair[]>([]);
  const [messages, setMessages] = useState<
    { role: 'user' | 'assistant'; text: string; sources?: { text: string; page: number }[] }[]
  >([]);

  // Progress / UI state
  const [progress, setProgress] = useState<ProgressInfo>({
    phase: 'idle',
    message: '',
    pct: 0,
    neural: false,
  });
  const [chatLoading, setChatLoading] = useState(false);
  const [inputQuestion, setInputQuestion] = useState('');
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [modelNote, setModelNote] = useState('');

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const conversationHistory = useRef<{ role: string; text: string }[]>([]);

  // ── Auto-scroll chat internally without moving the browser window ───────────
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ── AI model progress forwarding ────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAiProgress((data) => {
      if (data.type === 'model_progress') {
        const pct = data.progress?.progress != null
          ? Math.round(data.progress.progress * 100)
          : undefined;
        setProgress((prev) => ({
          ...prev,
          message: `Downloading ${data.model} model weights… ${pct != null ? pct + '%' : ''}`,
          pct: pct ?? prev.pct,
        }));
      }
      if (data.type === 'embed_progress') {
        const pct = Math.round((data.done / data.total) * 100);
        setProgress((prev) => ({
          ...prev,
          message: `Embedding chunks ${data.done}/${data.total}…`,
          pct,
        }));
      }
    });
    return () => { unsub(); };
  }, []);

  // ── Main pipeline ───────────────────────────────────────────────────────────
  const handleFileSelected = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setSummary(null);
    setDoc(null);
    setQuizzes([]);
    setMessages([]);
    conversationHistory.current = [];

    // 1. Extract text
    setProgress({ phase: 'extracting', message: 'Extracting text from PDF…', pct: 5, neural: false });
    let pages: string[] = [];
    try {
      const result = await extractPdfThumbnails(selectedFile);
      pages = (result.extractedText || []).map((t: any) => (typeof t === 'string' ? t : String(t || '')));
      setPageTexts(pages);
    } catch (err) {
      console.error('PDF extraction error', err);
      setProgress({ phase: 'error', message: 'Failed to extract PDF text.', pct: 0, neural: false });
      return;
    }

    const fullText = pages.join('\n\n').trim();
    if (!fullText) {
      setProgress({ phase: 'error', message: 'No text found — this may be a scanned/image-only PDF. Use the OCR tool first.', pct: 0, neural: false });
      return;
    }

    // 2. Chunk
    setProgress({ phase: 'chunking', message: 'Splitting document into chunks…', pct: 15, neural: false });
    const chunks = buildChunks(pages);

    // 3. Try neural path
    let localDoc: IndexedDocument | null = null;
    let neuralOk = false;
    try {
      setProgress({ phase: 'loading_models', message: 'Loading AI models (first run: ~80 MB download, cached after)…', pct: 20, neural: true });
      const embeddings = await embedChunks(chunks);

      setProgress({ phase: 'embedding', message: 'Building document index…', pct: 55, neural: true });
      localDoc = { fileName: selectedFile.name, chunks, embeddings };
      setDoc(localDoc);
      neuralOk = true;
    } catch (err) {
      console.warn('[AI] Neural embedding failed — falling back to extractive mode', err);
    }

    // 4. Summarise
    setProgress({ phase: 'summarising', message: neuralOk ? 'Generating neural summary…' : 'Generating extractive summary…', pct: 60, neural: neuralOk });

    let finalSummary: SummaryResult;
    if (neuralOk && localDoc) {
      try {
        finalSummary = await generateSummary(localDoc);
      } catch (err) {
        console.warn('[AI] Neural summarisation failed — extractive fallback', err);
        finalSummary = extractiveSummary(fullText, selectedFile.name);
      }
    } else {
      finalSummary = extractiveSummary(fullText, selectedFile.name);
    }
    setSummary(finalSummary);
    setModelNote(finalSummary.modelNote);

    // 5. Q&A
    setProgress({ phase: 'generating_qa', message: 'Generating questions & answers…', pct: 80, neural: neuralOk });
    let qa: QaPair[] = [];
    if (neuralOk && localDoc) {
      try {
        qa = await generateQaPairs(localDoc);
      } catch (err) {
        console.warn('[AI] Neural Q&A failed — extractive fallback', err);
        qa = legacyQa(fullText, selectedFile.name);
      }
    } else {
      qa = legacyQa(fullText, selectedFile.name);
    }
    setQuizzes(qa);

    // 6. Welcome chat message
    setMessages([{
      role: 'assistant',
      text: `Hi! I've analysed "${selectedFile.name}" (${pages.length} page${pages.length !== 1 ? 's' : ''}, ${chunks.length} chunks).\n\n${neuralOk ? '🧠 Neural AI is active — I can answer detailed questions about this document.' : '⚡ Running in fast extractive mode — ask me anything about the content!'}\n\nWhat would you like to know?`,
    }]);

    setProgress({ phase: 'ready', message: '', pct: 100, neural: neuralOk });
  }, []);

  // ── Extractive fallbacks ────────────────────────────────────────────────────
  function extractiveSummary(text: string, name: string): SummaryResult {
    const sentences = splitIntoSentences(text);
    const overview = sentences.slice(0, 2).join(' ') || `Document: ${name}`;
    const keyPoints = extractKeyFindings(text).slice(0, 6);
    const actionItems = extractActionItems(text).slice(0, 5);
    return {
      overview,
      keyPoints: keyPoints.length ? keyPoints : sentences.slice(0, 4),
      actionItems,
      rawSections: [],
      method: 'extractive',
      modelNote: 'Extractive mode — neural models unavailable on this device.',
    };
  }

  function legacyQa(text: string, name: string): QaPair[] {
    return generateSmartDocumentQa(text, name).map((q) => ({
      ...q,
      category: q.category || 'General',
      difficulty: 'Medium' as const,
    }));
  }

  // ── Chat send ───────────────────────────────────────────────────────────────
  const sendQuery = useCallback(async (queryText: string) => {
    if (!queryText.trim() || chatLoading) return;
    const q = queryText.trim();

    const userMsg = { role: 'user' as const, text: q };
    setMessages((prev) => [...prev, userMsg]);
    conversationHistory.current.push(userMsg);
    setInputQuestion('');
    setChatLoading(true);

    try {
      let result: ChatResult;
      if (doc) {
        // Neural RAG path
        result = await answerQuestion(q, doc, conversationHistory.current);
      } else {
        // Extractive fallback
        const fullText = pageTexts.join('\n\n');
        const legacyAnswer = processPdfChatQuery(q, fullText, file?.name || 'Document', summary
          ? { overview: summary.overview, keyPoints: summary.keyPoints, actionItems: summary.actionItems }
          : null);
        result = { answer: legacyAnswer, sourceChunks: [], method: 'extractive' };
      }

      const assistantMsg = {
        role: 'assistant' as const,
        text: result.answer,
        sources: result.sourceChunks.length > 0 ? result.sourceChunks : undefined,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      conversationHistory.current.push({ role: 'assistant', text: result.answer });
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: '⚠️ An error occurred while generating the response. Please try again.',
      }]);
    } finally {
      setChatLoading(false);
    }
  }, [doc, pageTexts, file, summary, chatLoading]);

  const handleSendMessage = () => sendQuery(inputQuestion);
  const handleAskInChat = (q: string) => { setActiveTab('chat'); sendQuery(q); };
  const handleReset = () => {
    setFile(null);
    setSummary(null);
    setDoc(null);
    setPageTexts([]);
    setQuizzes([]);
    setMessages([]);
    setProgress({ phase: 'idle', message: '', pct: 0, neural: false });
    conversationHistory.current = [];
  };

  const isProcessing = ['extracting', 'chunking', 'loading_models', 'embedding', 'summarising', 'generating_qa'].includes(progress.phase);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Upload / Loading state */}
      {(!file || isProcessing || progress.phase === 'error') && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF for AI Assistant & Summarizer"
          subtitle="Local neural AI — your document never leaves your device."
          onFilesSelected={(files) => handleFileSelected(files[0])}
          loading={isProcessing}
          loadingMessage={progress.message || 'Processing…'}
          files={file ? [file] : []}
        />
      )}

      {/* Processing progress bar */}
      {isProcessing && (
        <div className="rounded-2xl bg-base-100 border border-base-300 p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-3">
            {progress.neural ? (
              <Cpu className="w-5 h-5 text-violet-500 animate-pulse shrink-0" />
            ) : (
              <Zap className="w-5 h-5 text-amber-500 animate-pulse shrink-0" />
            )}
            <span className="text-sm font-medium text-base-content">{progress.message}</span>
          </div>
          <div className="w-full h-2 bg-base-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress.pct}%`,
                background: progress.neural
                  ? 'linear-gradient(90deg, #7c3aed, #6366f1)'
                  : 'linear-gradient(90deg, #f59e0b, #f97316)',
              }}
            />
          </div>
          {progress.phase === 'loading_models' && (
            <p className="text-[11px] text-base-content/55 flex items-center gap-1.5">
              <Database className="w-3 h-3" />
              Model weights are downloaded once and cached in your browser. Subsequent runs are instant and fully offline.
            </p>
          )}
        </div>
      )}

      {/* Error state */}
      {progress.phase === 'error' && (
        <div className="rounded-2xl bg-error/10 border border-error/30 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-error">Processing failed</p>
            <p className="text-xs text-base-content/70">{progress.message}</p>
          </div>
        </div>
      )}

      {/* Main tool UI */}
      {file && progress.phase === 'ready' && summary && (
        <div className="p-6 sm:p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-primary text-white flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content">{file.name}</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs text-base-content/60">{formatBytes(file.size)}</p>
                  {doc && (
                    <span className="badge badge-xs badge-success gap-1">
                      <Cpu className="w-2.5 h-2.5" /> Neural AI Active
                    </span>
                  )}
                  {!doc && (
                    <span className="badge badge-xs badge-warning gap-1">
                      <Zap className="w-2.5 h-2.5" /> Extractive Mode
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle" title="Upload another document">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Model note */}
          {modelNote && (
            <p className="text-[11px] text-base-content/50 bg-base-200/50 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <Database className="w-3 h-3 shrink-0" /> {modelNote}
            </p>
          )}

          {/* Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-base-200 rounded-2xl w-fit flex-wrap">
            {([
              { id: 'summary', label: 'Executive Summary', icon: Sparkles },
              { id: 'chat', label: 'Chat with PDF', icon: MessageSquare },
              { id: 'quiz', label: 'Questions & Q&A', icon: HelpCircle },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`btn btn-xs sm:btn-sm rounded-xl gap-1.5 ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* ── Tab: Executive Summary ─────────────────────────────────────── */}
          {activeTab === 'summary' && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Overview */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 border border-violet-200/60 dark:border-violet-700/30 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Document Overview
                </h4>
                <p className="text-sm text-base-content/85 leading-relaxed">{summary.overview}</p>
              </div>

              {/* Key Points */}
              {summary.keyPoints.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center text-[10px]">✓</span>
                    Key Points & Takeaways
                  </h4>
                  <ul className="space-y-1.5">
                    {summary.keyPoints.map((pt, i) => (
                      <li key={i} className="text-sm text-base-content/80 flex items-start gap-2 bg-base-100 p-3 rounded-xl border border-base-200">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                          {i + 1}
                        </span>
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action Items */}
              {summary.actionItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                    <span className="text-primary">→</span>
                    Action Items & Recommendations
                  </h4>
                  <ul className="space-y-1.5">
                    {summary.actionItems.map((act, i) => (
                      <li key={i} className="text-sm text-base-content/80 flex items-start gap-2 bg-primary/5 p-3 rounded-xl border border-primary/15">
                        <span className="text-primary font-bold shrink-0">✓</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Neural section details */}
              {summary.method === 'neural' && summary.rawSections.length > 0 && (
                <details className="group rounded-2xl border border-base-300 overflow-hidden">
                  <summary className="cursor-pointer p-3 bg-base-200/50 text-xs font-semibold flex items-center justify-between hover:bg-base-200 transition-colors">
                    <span>📄 Section-by-section summaries ({summary.rawSections.length} sections)</span>
                    <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="p-4 space-y-3">
                    {summary.rawSections.map((sec, i) => (
                      <div key={i} className="p-3 rounded-xl bg-base-100 border border-base-200">
                        <p className="text-[10px] font-bold uppercase text-base-content/50 mb-1">{sec.title}</p>
                        <p className="text-xs text-base-content/80 leading-relaxed">{sec.body}</p>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* ── Tab: Chat with PDF ─────────────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              {/* Messages */}
              <div ref={chatContainerRef} className="h-96 overflow-y-auto p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-3 scroll-smooth">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-[88%] space-y-1.5">
                      <div
                        className={`p-3.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                          m.role === 'user'
                            ? 'bg-primary text-white rounded-tr-none shadow-sm'
                            : 'bg-base-100 text-base-content border border-base-300 rounded-tl-none shadow-sm'
                        }`}
                      >
                        {m.text}
                      </div>
                      {/* Source citations */}
                      {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                        <div>
                          <button
                            onClick={() =>
                              setExpandedSources((prev) => {
                                const next = new Set(prev);
                                next.has(i) ? next.delete(i) : next.add(i);
                                return next;
                              })
                            }
                            className="text-[10px] text-base-content/50 hover:text-primary flex items-center gap-1 px-1 transition-colors"
                          >
                            {expandedSources.has(i) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {m.sources.length} source{m.sources.length !== 1 ? 's' : ''}
                          </button>
                          {expandedSources.has(i) && (
                            <div className="mt-1 space-y-1.5 pl-2 border-l-2 border-primary/30">
                              {m.sources.map((src, si) => (
                                <div key={si} className="text-[11px] text-base-content/60 bg-base-100 rounded-lg p-2 border border-base-200">
                                  <span className="font-bold text-primary mr-1">p.{src.page}</span>
                                  {src.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-base-100 border border-base-300 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-sm text-base-content/60">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {doc ? 'Thinking…' : 'Searching…'}
                    </div>
                  </div>
                )}
              </div>

              {/* Suggestion pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] uppercase font-bold text-base-content/40">Try:</span>
                {[
                  'What is this document about?',
                  'What are the key findings?',
                  'What are the main recommendations?',
                  'Summarize in simple terms',
                ].map((prompt, pi) => (
                  <button
                    key={pi}
                    onClick={() => sendQuery(prompt)}
                    disabled={chatLoading}
                    className="btn btn-xs rounded-lg bg-base-200 hover:bg-primary/15 hover:text-primary border-none text-[11px] font-medium transition-colors disabled:opacity-40"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !chatLoading && handleSendMessage()}
                  placeholder="Ask any question about this document…"
                  className="input input-bordered input-sm flex-1 rounded-xl"
                  disabled={chatLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputQuestion.trim() || chatLoading}
                  className="btn btn-primary btn-sm rounded-xl gap-1.5"
                >
                  {chatLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  <span>{chatLoading ? 'Thinking' : 'Ask'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Tab: Questions & Q&A ───────────────────────────────────────── */}
          {activeTab === 'quiz' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-base-content/60">
                  Document Questions & Verified Answers
                </span>
                <div className="flex items-center gap-2">
                  <span className="badge badge-sm badge-primary text-[10px]">
                    {quizzes.length} Questions
                  </span>
                  {doc && (
                    <span className="badge badge-sm badge-success text-[10px] gap-1">
                      <Cpu className="w-2.5 h-2.5" /> Neural
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {quizzes.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-2.5 transition-all hover:border-primary/40"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {q.category && (
                          <span className="badge badge-xs badge-neutral text-[9px] uppercase font-bold">
                            {q.category}
                          </span>
                        )}
                        {q.difficulty && (
                          <span className={`badge badge-xs text-[9px] uppercase font-bold ${
                            q.difficulty === 'Easy' ? 'badge-success' :
                            q.difficulty === 'Medium' ? 'badge-warning' : 'badge-error'
                          }`}>
                            {q.difficulty}
                          </span>
                        )}
                        <h5 className="font-bold text-sm text-base-content">{q.question}</h5>
                      </div>
                      <button
                        onClick={() => handleAskInChat(q.question)}
                        className="btn btn-ghost btn-xs text-primary gap-1 shrink-0 hover:bg-primary/10 rounded-lg text-[10px]"
                        title="Explore in Chat"
                      >
                        <CornerDownLeft className="w-3 h-3" />
                        <span>Ask in Chat</span>
                      </button>
                    </div>
                    <div className="text-sm text-base-content/85 bg-base-100 p-3 rounded-xl border border-base-200 leading-relaxed">
                      {q.answer}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
