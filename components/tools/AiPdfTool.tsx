'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, MessageSquare, ListCheck, HelpCircle, Download, Loader2, RotateCcw, Send, FileText } from 'lucide-react';
import UploadZone from '@/components/ui/UploadZone';
import { extractPdfThumbnails } from '@/lib/pdf/pdfThumbnailHelper';
import { formatBytes } from '@/lib/utils/formatters';

interface AiPdfToolProps {
  defaultTab?: 'summary' | 'chat' | 'quiz';
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'with',
  'that', 'this', 'to', 'from', 'by', 'for', 'about', 'what', 'when',
  'where', 'who', 'how', 'why', 'does', 'did', 'have', 'has', 'had',
  'will', 'would', 'can', 'could', 'should', 'been', 'there', 'their'
]);

export default function AiPdfTool({ defaultTab = 'summary' }: AiPdfToolProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [processing, setProcessing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'chat' | 'quiz'>(defaultTab);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [inputQuestion, setInputQuestion] = useState<string>('');
  const [summary, setSummary] = useState<{
    overview: string;
    keyPoints: string[];
    actionItems: string[];
  } | null>(null);
  const [quizzes, setQuizzes] = useState<{ question: string; answer: string }[]>([]);

  const handleFileSelected = async (selectedFile: File) => {
    setFile(selectedFile);
    setProcessing(true);

    try {
      const { extractedText: pageTexts } = await extractPdfThumbnails(selectedFile);
      const fullText = (pageTexts || []).filter(Boolean).join('\n\n').trim();
      setExtractedText(fullText);

      // Generate structured summary from document
      generateSummary(fullText, selectedFile.name);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const generateSummary = (text: string, filename: string) => {
    // Split into sentences, or clean chunks if punctuation is sparse
    let sentences = text
      .split(/(?<=[.?!])\s+|\n+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25);

    if (sentences.length === 0) {
      // Fallback: chunk into 150-char blocks
      const words = text.split(/\s+/);
      for (let i = 0; i < words.length; i += 20) {
        sentences.push(words.slice(i, i + 20).join(' '));
      }
    }

    const overview =
      sentences.slice(0, 3).join(' ') ||
      `This document (${filename}) contains ${text.length > 0 ? text.length + ' characters of text' : 'scanned or visual pages'} ready for interactive exploration and inquiry.`;

    const keyPoints =
      sentences.length > 3
        ? sentences.slice(3, 8)
        : [
            sentences[0] || 'Text extracted successfully.',
            'Ready to answer specific queries, clauses, or figures.',
            'In-memory contextual analysis without cloud retention.'
          ];

    const actionItems =
      sentences.length > 8
        ? sentences.slice(8, 12)
        : [
            'Review highlighted sections and key statements.',
            'Ask targeted questions in the Chat tab for specific topics.'
          ];

    setSummary({
      overview,
      keyPoints,
      actionItems,
    });

    // Generate quick Q&A quiz
    const generatedQuiz = sentences.slice(0, 4).map((s, idx) => ({
      question: `Key Concept #${idx + 1}: What does the document state regarding "${s.split(' ').slice(0, 5).join(' ')}..."?`,
      answer: s,
    }));

    setQuizzes(generatedQuiz);

    setMessages([
      {
        role: 'assistant',
        text: `Hello! I've loaded "${filename}". What would you like to know or find in this document?`,
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
      // 1. Check for general summary requests
      const lower = userQ.toLowerCase();
      if (/summary|summarize|overview|about|what is this/i.test(lower)) {
        const reply = `Here is a summary of the document:\n\n${summary?.overview}\n\n• Key Point: ${summary?.keyPoints[0] || 'See full summary tab.'}`;
        setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
        return;
      }

      // 2. Keyword relevance scoring across chunks/paragraphs
      const keywords = lower
        .replace(/[^\w\s]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

      // Break text into paragraphs or blocks of 3 sentences
      const chunks = extractedText.split(/\n\s*\n+|\n{2,}/).filter((p) => p.trim().length > 20);
      const textChunks = chunks.length > 0 ? chunks : extractedText.split(/(?<=[.?!])\s+/);

      let bestChunk = '';
      let highestScore = 0;

      for (const chunk of textChunks) {
        const chunkLower = chunk.toLowerCase();
        let score = 0;
        for (const kw of keywords) {
          if (chunkLower.includes(kw)) {
            score += 1;
          }
        }
        if (score > highestScore) {
          highestScore = score;
          bestChunk = chunk.trim();
        }
      }

      let responseText = '';
      if (highestScore > 0 && bestChunk) {
        const cleanExcerpt = bestChunk.length > 400 ? bestChunk.substring(0, 400) + '...' : bestChunk;
        responseText = `Based on your document:\n\n"${cleanExcerpt}"`;
      } else {
        responseText = `I searched the document for "${userQ}". While an exact reference wasn't located, here is what this document covers:\n\n${summary?.overview.substring(0, 180)}...`;
      }

      setMessages((prev) => [...prev, { role: 'assistant', text: responseText }]);
    }, 250);
  };

  const handleSendMessage = () => {
    sendQuery(inputQuestion);
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
      {!file && (
        <UploadZone
          accept="application/pdf"
          maxFiles={1}
          maxSizeMb={50}
          title="Upload PDF for AI Assistant & Summarizer"
          subtitle="Get instant executive summaries, ask questions in real-time chat, and generate key takeaways."
          onFilesSelected={(files) => handleFileSelected(files[0])}
        />
      )}

      {processing && (
        <div className="p-8 rounded-3xl bg-base-100 border border-base-300 text-center space-y-4 shadow-sm">
          <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
          <h3 className="font-bold text-base">Analyzing Document with AI Engine...</h3>
          <p className="text-xs text-base-content/60">Extracting context, key insights, and Q&A references in memory</p>
        </div>
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
            <button onClick={handleReset} className="btn btn-ghost btn-sm btn-circle">
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
                  <span>Overview</span>
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
                    <li key={i} className="text-xs text-base-content/80 flex items-start gap-2 bg-base-100 p-2 rounded-xl border border-base-200">
                      <span className="w-4 h-4 rounded-full bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0 text-[10px]">
                        {i + 1}
                      </span>
                      <span>{pt}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Tab 2: Chat */}
          {activeTab === 'chat' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="h-72 overflow-y-auto p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-3">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none'
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
                  'Summarize main ideas',
                  'What are the key findings?',
                  'What figures or numbers are mentioned?',
                  'What are the action items?'
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => sendQuery(prompt)}
                    className="btn btn-xs rounded-lg bg-base-200 hover:bg-primary/15 hover:text-primary border-none text-[11px] font-medium"
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

          {/* Tab 3: Quiz */}
          {activeTab === 'quiz' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              {quizzes.map((q, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-base-200/50 border border-base-300 space-y-2">
                  <h5 className="font-bold text-xs text-base-content">{q.question}</h5>
                  <p className="text-xs text-base-content/70 italic bg-base-100 p-2.5 rounded-xl border border-base-200">
                    &quot;{q.answer}&quot;
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
