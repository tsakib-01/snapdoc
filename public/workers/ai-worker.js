/**
 * AI Web Worker — runs Transformers.js inference off the main thread.
 * Handles: embedding generation, text generation (summarisation / QA / Q-gen).
 *
 * All model weights are cached in the browser's Cache API so subsequent loads
 * are instant and fully offline.
 */

/* global importScripts, self */

// Dynamically import Transformers.js from CDN (cached after first use)
// We use the ESM CDN build that works in Workers without a bundler.
const TRANSFORMERS_CDN = 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/dist/transformers.min.js';

let pipeline = null;
let env = null;
let transformersLoaded = false;
let loadError = null;

async function loadTransformers() {
  if (transformersLoaded) return true;
  try {
    // importScripts works in classic workers
    importScripts(TRANSFORMERS_CDN);
    // After importScripts, the global `Transformers` object is available
    pipeline = self.Transformers?.pipeline;
    env = self.Transformers?.env;
    if (!pipeline) {
      throw new Error('Transformers.js did not expose pipeline function');
    }
    // Use CDN hosted models; cache aggressively in browser
    if (env) {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
    }
    transformersLoaded = true;
    return true;
  } catch (err) {
    loadError = err.message || String(err);
    return false;
  }
}

// ── Model singletons ────────────────────────────────────────────────────────
let embedder = null;
let generator = null;

async function getEmbedder() {
  if (embedder) return embedder;
  // ~22 MB quantized — fast, offline-capable after first download
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    quantized: true,
    progress_callback: (p) => {
      self.postMessage({ type: 'model_progress', model: 'embedder', progress: p });
    },
  });
  return embedder;
}

async function getGenerator() {
  if (generator) return generator;
  // ~60 MB 4-bit quantized Flan-T5-base — strong enough for summarisation & QA
  generator = await pipeline('text2text-generation', 'Xenova/flan-t5-base', {
    quantized: true,
    progress_callback: (p) => {
      self.postMessage({ type: 'model_progress', model: 'generator', progress: p });
    },
  });
  return generator;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Cosine similarity between two Float32 arrays */
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-8);
}

/** Mean-pool a raw tensor output (shape [1, seq, dim]) into a 1-D array */
function meanPool(tensor) {
  // tensor.data is a flat Float32Array of shape [1, seq_len, dim]
  const [, seqLen, dim] = tensor.dims;
  const pooled = new Float32Array(dim);
  for (let t = 0; t < seqLen; t++) {
    for (let d = 0; d < dim; d++) {
      pooled[d] += tensor.data[t * dim + d];
    }
  }
  for (let d = 0; d < dim; d++) pooled[d] /= seqLen;
  return pooled;
}

// ── Message handler ─────────────────────────────────────────────────────────

self.onmessage = async function (event) {
  const { id, action, payload } = event.data;

  try {
    const ok = await loadTransformers();
    if (!ok) {
      self.postMessage({ id, type: 'error', error: 'Failed to load Transformers.js: ' + loadError });
      return;
    }

    // ── 1. Embed a list of text chunks ───────────────────────────────────
    if (action === 'embed') {
      const { texts } = payload;
      const emb = await getEmbedder();
      const embeddings = [];
      for (let i = 0; i < texts.length; i++) {
        const out = await emb(texts[i], { pooling: 'mean', normalize: true });
        embeddings.push(Array.from(out.data));
        self.postMessage({ id, type: 'embed_progress', done: i + 1, total: texts.length });
      }
      self.postMessage({ id, type: 'embed_result', embeddings });
      return;
    }

    // ── 2. Semantic search ───────────────────────────────────────────────
    if (action === 'search') {
      const { query, chunkEmbeddings, topK } = payload;
      const emb = await getEmbedder();
      const qOut = await emb(query, { pooling: 'mean', normalize: true });
      const qVec = Array.from(qOut.data);

      const scored = chunkEmbeddings.map((vec, i) => ({
        index: i,
        score: cosineSim(qVec, vec),
      }));
      scored.sort((a, b) => b.score - a.score);
      const top = scored.slice(0, topK || 5);
      self.postMessage({ id, type: 'search_result', results: top });
      return;
    }

    // ── 3. Generate text (summarise / answer / generate Qs) ─────────────
    if (action === 'generate') {
      const { prompt, maxTokens } = payload;
      const gen = await getGenerator();
      const out = await gen(prompt, {
        max_new_tokens: maxTokens || 256,
        do_sample: false,
      });
      const text = out[0]?.generated_text || '';
      self.postMessage({ id, type: 'generate_result', text });
      return;
    }

    self.postMessage({ id, type: 'error', error: 'Unknown action: ' + action });
  } catch (err) {
    self.postMessage({ id, type: 'error', error: err.message || String(err) });
  }
};
