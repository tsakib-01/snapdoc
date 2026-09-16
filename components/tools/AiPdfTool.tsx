'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, MessageSquare, ListCheck, HelpCircle, Loader2, RotateCcw, Send, CornerDownLeft } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';
import {
  processPdfChatQuery,
  generateSmartDocumentQa,
  extractActionItems,
  extractKeyFindings,
  splitIntoSentences,
  DocumentSummary,
  QaPair,
} from '@/lib/ai/pdfQuestionAnswering';

interface AiPdfToolProps {
  defaultTab?: 'summary' | 'chat' | 'quiz';
}

export default function AiPdfTool({ defaultTab = 'summary' }: AiPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'quiz'>(defaultTab);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [summary, setSummary] = useState<DocumentSummary | null>(null);
  const [quizzes, setQuizzes] = useState<QaPair[]>([]);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setProcessing(true);

    try {
      const { extractedText: pageTexts } = await extractPdfThumbnails(selectedFile);
      const fullText = (pageTexts || []).filter(Boolean).join('\n\n').trim();
      setExtractedText(fullText);

      // Generate enhanced structured summary & Q&A
      buildDocumentIntelligence(fullText, selectedFile.name);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const buildDocumentIntelligence = (text: string, filename: string) => {
    const sentences = splitIntoSentences(text);

    const overview =
      sentences.slice(0, 3).join(' ') ||
      `This document (${filename}) contains ${text.length > 0 ? text.length + ' characters of extracted text' : 'scanned or visual pages'} ready for interactive exploration and inquiry.`;

    const keyPoints = extractKeyFindings(text);
    const actionItems = extractActionItems(text);

    const docSummary: DocumentSummary = {
      overview,
      keyPoints: keyPoints.length > 0 ? keyPoints.slice(0, 6) : sentences.slice(0, 4),
      actionItems: actionItems.length > 0 ? actionItems.slice(0, 5) : [
        'Review highlighted key statements and findings.',
        'Use the Chat tab to query specific sections or numbers.'
      ],
    };

    setSummary(docSummary);

    // Generate smart, relevant Q&A pairs
    const smartQa = generateSmartDocumentQa(text, filename);
    setQuizzes(smartQa);

    setMessages([
      {
        role: 'assistant',
        text: `Hello! I've loaded "${filename}". I can analyze the text, find specific figures and numbers, extract action items, or answer any question about this document. What would you like to know?`,
      },
    ]);
  };

  const sendQuery = (queryText: string) => {
    if (!queryText.trim()) return;

    const userQ = queryText.trim();
    const newMsgs = [...messages, { role: 'user' as const, text: userQ }];
    setMessages(newMsgs);
    setInputQuestion('');

    setTimeout(() => {
      const responseText = processPdfChatQuery(
        userQ,
        extractedText,
        file?.name || 'Document',
        summary
      );
      setMessages((prev) => [...prev, { role: 'assistant', text: responseText }]);
    }, 150);
  };

  const handleSendMessage = () => {
    sendQuery(inputQuestion);
  };

  const handleAskInChat = (questionText: string) => {
    setActiveTab('chat');
    sendQuery(questionText);
  };

  const handleReset = () => {
    setFile(null);
    setExtractedText('');
    setSummary(null);
    setMessages([]);
    setQuizzes([]);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {(!file || processing) && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF for AI Assistant & Summarizer"
          subtitle="Get instant executive summaries, ask questions in real-time chat, and generate key takeaways."
          onFilesSelected={(files) => handleFileSelected(files[0])}
          loading={processing}
          loadingMessage="Analyzing document with AI Engine & generating insights..."
          files={file ? [file] : []}
        />
      )}

      {file && !processing && summary && (
        <div className="p-6 sm:p-8 rounded-3xl bg-base-100 border border-base-300 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-base-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 to-primary text-white flex items-center justify-center shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-base-content">{file.name}</h3>
                <p className="text-xs text-base-content/60">{formatBytes(file.size)}</p>
              </div>
            </div>
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle" title="Upload another document">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 p-1.5 bg-base-200 rounded-2xl w-fit">
            <button
              onClick={() => setActiveTab('summary')}
              className={`btn btn-xs sm:btn-sm rounded-xl gap-1.5 ${activeTab === 'summary' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Executive Summary</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`btn btn-xs sm:btn-sm rounded-xl gap-1.5 ${activeTab === 'chat' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat with PDF</span>
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`btn btn-xs sm:btn-sm rounded-xl gap-1.5 ${activeTab === 'quiz' ? 'btn-primary' : 'btn-ghost'}`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Questions & Q&A</span>
            </button>
          </div>

          {/* Tab 1: Summary */}
          {activeTab === 'summary' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  <span>Document Overview</span>
                </h4>
                <p className="text-xs text-base-content/80 leading-relaxed">{summary.overview}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                  <ListCheck className="w-4 h-4 text-emerald-500" />
                  <span>Key Points & Takeaways</span>
                </h4>
                <ul className="space-y-1.5">
                  {summary.keyPoints.map((pt, i) => (
                    <li key={i} className="text-xs text-base-content/80 flex items-start gap-2 bg-base-100 p-2.5 rounded-xl border border-base-200">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        {i + 1}
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {summary.actionItems.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-base-content/70 flex items-center gap-1.5">
                    <ListCheck className="w-4 h-4 text-primary" />
                    <span>Action Items & Directives</span>
                  </h4>
                  <ul className="space-y-1.5">
                    {summary.actionItems.map((act, i) => (
                      <li key={i} className="text-xs text-base-content/80 flex items-start gap-2 bg-base-100 p-2.5 rounded-xl border border-base-200">
                        <span className="text-primary font-bold">✓</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Chat */}
          {activeTab === 'chat' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="h-80 overflow-y-auto p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                        m.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none shadow-sm'
                          : 'bg-base-100 text-base-content border border-base-300 rounded-tl-none shadow-sm'
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>

              {/* Suggested Prompt Pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase font-bold text-base-content/50">Suggestions:</span>
                {[
                  'What figures or numbers are mentioned?',
                  'What are the action items?',
                  'What are the key findings?',
                  'Summarize main ideas',
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => sendQuery(prompt)}
                    className="btn btn-xs rounded-lg bg-base-200 hover:bg-primary/15 hover:text-primary border-none text-[11px] font-medium transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputQuestion}
                  onChange={(e) => setInputQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask any question about this document..."
                  className="input input-bordered input-sm flex-1 rounded-xl"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputQuestion.trim()}
                  className="btn btn-primary btn-sm rounded-xl gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Ask</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab 3: Questions & Q&A */}
          {activeTab === 'quiz' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-base-content/60">
                  Document Questions & Verified Answers
                </span>
                <span className="badge badge-sm badge-primary text-[10px]">
                  {quizzes.length} Questions Generated
                </span>
              </div>

              <div className="space-y-3">
                {quizzes.map((q, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-2.5 transition-all hover:border-primary/40">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {q.category && (
                          <span className="badge badge-xs badge-neutral text-[9px] uppercase font-bold">
                            {q.category}
                          </span>
                        )}
                        <h5 className="font-bold text-xs text-base-content">{q.question}</h5>
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
                    <div className="text-xs text-base-content/85 bg-base-100 p-3 rounded-xl border border-base-200 leading-relaxed">
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
