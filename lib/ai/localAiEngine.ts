/**
 * localAiEngine.ts
 *
 * Browser-side local AI engine — all inference runs inside a Web Worker via
 * Transformers.js (Xenova build). Completely offline after first model download.
 *
 * Architecture:
 *   1. PDF text → page-level chunks (preserving page refs)
 *   2. Chunk embeddings   (all-MiniLM-L6-v2, ~22 MB quantised)
 *   3. Semantic search / RAG retrieval
 *   4. Prompt construction → flan-t5-base generation (~60 MB quantised)
 *   5. Structured output returned to caller
 */

export interface PagedChunk {
  text: string;
  pageNumber: number;
  chunkIndex: number;
}

export interface IndexedDocument {
  fileName: string;
  chunks: PagedChunk[];
  embeddings: number[][];     // one per chunk
}

export interface SummaryResult {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
  rawSections: { title: string; body: string }[];
  method: 'neural' | 'extractive';
  modelNote: string;
}

export interface ChatResult {
  answer: string;
  sourceChunks: { text: string; page: number }[];
  method: 'neural' | 'extractive';
}

export interface QaPair {
  question: string;
  answer: string;
  category: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
}

// ── Worker bridge ─────────────────────────────────────────────────────────────

let worker: Worker | null = null;
let pendingRequests = new Map<string, { resolve: Function; reject: Function }>();

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker('/workers/ai-worker.js');
  worker.onmessage = (e) => {
    const { id, type } = e.data;
    if (type === 'model_progress' || type === 'embed_progress') {
      // broadcast progress to any registered listener
      progressListeners.forEach((fn) => fn(e.data));
      return;
    }
    const pending = pendingRequests.get(id);
    if (!pending) return;
    pendingRequests.delete(id);
    if (type === 'error') {
      pending.reject(new Error(e.data.error));
    } else {
      pending.resolve(e.data);
    }
  };
  worker.onerror = (e) => {
    console.error('[AI Worker error]', e);
  };
  return worker;
}

const progressListeners = new Set<(data: any) => void>();

export function onAiProgress(fn: (data: any) => void) {
  progressListeners.add(fn);
  return () => progressListeners.delete(fn);
}

let reqCounter = 0;
function callWorker(action: string, payload: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const id = `req-${++reqCounter}`;
    pendingRequests.set(id, { resolve, reject });
    getWorker().postMessage({ id, action, payload });
  });
}

// ── Text helpers ──────────────────────────────────────────────────────────────

/** Split extracted page text into overlapping ~400-token chunks */
function chunkPageText(pageText: string, pageNumber: number, startIdx: number): PagedChunk[] {
  const CHUNK_SIZE = 400;   // chars ≈ ~100 tokens for English
  const OVERLAP = 80;
  const chunks: PagedChunk[] = [];
  let pos = 0;
  let chunkIdx = startIdx;

  while (pos < pageText.length) {
    const end = Math.min(pos + CHUNK_SIZE, pageText.length);
    const text = pageText.slice(pos, end).trim();
    if (text.length > 20) {
      chunks.push({ text, pageNumber, chunkIndex: chunkIdx++ });
    }
    if (end >= pageText.length) break;
    pos = end - OVERLAP;
  }
  return chunks;
}

/** Split full document text from extractPdfThumbnails into paged chunks */
export function buildChunks(pageTexts: string[]): PagedChunk[] {
  const allChunks: PagedChunk[] = [];
  let globalIdx = 0;
  for (let p = 0; p < pageTexts.length; p++) {
    const txt = (pageTexts[p] || '').trim();
    if (!txt) continue;
    const pageChunks = chunkPageText(txt, p + 1, globalIdx);
    allChunks.push(...pageChunks);
    globalIdx += pageChunks.length;
  }
  return allChunks;
}

/** Batch embed all chunks via the Worker */
export async function embedChunks(chunks: PagedChunk[]): Promise<number[][]> {
  const texts = chunks.map((c) => c.text);
  const result = await callWorker('embed', { texts });
  return result.embeddings as number[][];
}

// ── RAG search ────────────────────────────────────────────────────────────────

/** Return top-K most semantically relevant chunks for a query */
export async function retrieveChunks(
  query: string,
  doc: IndexedDocument,
  topK = 5
): Promise<{ chunk: PagedChunk; score: number }[]> {
  const result = await callWorker('search', {
    query,
    chunkEmbeddings: doc.embeddings,
    topK,
  });
  return (result.results as { index: number; score: number }[]).map((r) => ({
    chunk: doc.chunks[r.index],
    score: r.score,
  }));
}

// ── Text generation ────────────────────────────────────────────────────────────

async function generate(prompt: string, maxTokens = 256): Promise<string> {
  const result = await callWorker('generate', { prompt, maxTokens });
  return (result.text || '').trim();
}

// ── Executive Summary ─────────────────────────────────────────────────────────

/**
 * Map-reduce summarisation:
 *  1. Summarise each 800-char block of text individually (map)
 *  2. Combine intermediate summaries (reduce)
 *  3. Extract key points and action items from the combined summary
 */
export async function generateSummary(doc: IndexedDocument): Promise<SummaryResult> {
  const fullText = doc.chunks.map((c) => c.text).join(' ');

  // ── Map step: summarise each ~800-char block ──────────────────────────
  const BLOCK_SIZE = 800;
  const blocks: string[] = [];
  for (let i = 0; i < fullText.length; i += BLOCK_SIZE) {
    const b = fullText.slice(i, i + BLOCK_SIZE).trim();
    if (b.length > 50) blocks.push(b);
  }

  const intermediateSummaries: string[] = [];
  for (const block of blocks.slice(0, 20)) { // cap at 20 blocks for speed
    const prompt = `Summarize the following text in 2-3 sentences:\n\n${block}`;
    const s = await generate(prompt, 120);
    if (s) intermediateSummaries.push(s);
  }

  // ── Reduce step: combine intermediate summaries ───────────────────────
  const combined = intermediateSummaries.join(' ').slice(0, 1200);
  const overviewPrompt = `Write a concise executive summary (3-4 sentences) of this document:\n\n${combined}`;
  const overview = await generate(overviewPrompt, 200) || combined.slice(0, 300);

  // ── Key points ────────────────────────────────────────────────────────
  const kpPrompt = `List 5 key points from the following summary as numbered items:\n\n${combined.slice(0, 900)}`;
  const kpRaw = await generate(kpPrompt, 200);
  const keyPoints = kpRaw
    .split(/\n/)
    .map((l: string) => l.replace(/^\d+[\.\)]\s*/, '').trim())
    .filter((l: string) => l.length > 20)
    .slice(0, 6);

  // ── Action items ──────────────────────────────────────────────────────
  const aiPrompt = `List 4 recommended actions or next steps based on this summary:\n\n${combined.slice(0, 900)}`;
  const aiRaw = await generate(aiPrompt, 160);
  const actionItems = aiRaw
    .split(/\n/)
    .map((l: string) => l.replace(/^\d+[\.\)]\s*|\-\s*/, '').trim())
    .filter((l: string) => l.length > 15)
    .slice(0, 5);

  return {
    overview,
    keyPoints: keyPoints.length > 0 ? keyPoints : intermediateSummaries.slice(0, 3),
    actionItems: actionItems.length > 0 ? actionItems : [],
    rawSections: intermediateSummaries.map((s, i) => ({
      title: `Section ${i + 1}`,
      body: s,
    })),
    method: 'neural',
    modelNote: 'Powered by Flan-T5-Base (local, offline) via Transformers.js',
  };
}

// ── Chat (RAG QA) ─────────────────────────────────────────────────────────────

export async function answerQuestion(
  question: string,
  doc: IndexedDocument,
  conversationHistory: { role: string; text: string }[] = []
): Promise<ChatResult> {
  const relevant = await retrieveChunks(question, doc, 5);
  const context = relevant
    .map((r) => `[Page ${r.chunk.pageNumber}]: ${r.chunk.text}`)
    .join('\n\n');

  // Include last 2 turns of conversation history for follow-ups
  const historyText = conversationHistory
    .slice(-4)
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');

  const prompt = [
    'Answer the question based on the document context below. Be specific and concise.',
    '',
    historyText ? `Conversation so far:\n${historyText}\n` : '',
    `Document context:\n${context}`,
    '',
    `Question: ${question}`,
    'Answer:',
  ].filter(Boolean).join('\n');

  const answer = await generate(prompt, 300);

  return {
    answer: answer || 'I could not find a clear answer to that in the document.',
    sourceChunks: relevant.map((r) => ({
      text: r.chunk.text.slice(0, 150) + (r.chunk.text.length > 150 ? '...' : ''),
      page: r.chunk.pageNumber,
    })),
    method: 'neural',
  };
}

// ── Q&A Generation ────────────────────────────────────────────────────────────

const QA_CATEGORIES: Array<{ label: string; prompt: string; difficulty: QaPair['difficulty'] }> = [
  {
    label: 'Overview',
    prompt: 'What is the main purpose and topic of this document?',
    difficulty: 'Easy',
  },
  {
    label: 'Key Findings',
    prompt: 'What are the most important findings or conclusions?',
    difficulty: 'Medium',
  },
  {
    label: 'Details',
    prompt: 'What specific details, data, or evidence are presented?',
    difficulty: 'Medium',
  },
  {
    label: 'Critical Analysis',
    prompt: 'What limitations, challenges, or open questions does this document raise?',
    difficulty: 'Hard',
  },
  {
    label: 'Application',
    prompt: 'How can the information in this document be applied in practice?',
    difficulty: 'Hard',
  },
  {
    label: 'Summary',
    prompt: 'What is the final conclusion or recommendation of this document?',
    difficulty: 'Easy',
  },
];

export async function generateQaPairs(doc: IndexedDocument): Promise<QaPair[]> {
  const fullText = doc.chunks.map((c) => c.text).join(' ').slice(0, 2000);
  const results: QaPair[] = [];

  for (const cat of QA_CATEGORIES) {
    const prompt = `Based on this document:\n\n${fullText.slice(0, 1000)}\n\nQuestion: ${cat.prompt}\nAnswer:`;
    const answer = await generate(prompt, 200);
    if (answer && answer.length > 15) {
      results.push({
        question: cat.prompt,
        answer,
        category: cat.label,
        difficulty: cat.difficulty,
      });
    }
  }

  return results;
}
