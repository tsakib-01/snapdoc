/**
 * Intelligent In-Memory Document Analysis, Semantic Search, and Q&A Engine for Chat-with-PDF
 */

export interface DocumentSummary {
  overview: string;
  keyPoints: string[];
  actionItems: string[];
}

export interface QaPair {
  question: string;
  answer: string;
  category?: string;
}

const STOP_WORDS = new Set([
  'the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'in', 'with',
  'that', 'this', 'to', 'from', 'by', 'for', 'about', 'what', 'when',
  'where', 'who', 'how', 'why', 'does', 'did', 'have', 'has', 'had',
  'will', 'would', 'can', 'could', 'should', 'been', 'there', 'their',
  'are', 'was', 'were', 'it', 'its', 'they', 'them', 'you', 'your', 'we', 'our',
  'i', 'me', 'my', 'be', 'of', 'as', 'into', 'such', 'then', 'than',
  'these', 'those', 'also', 'just', 'more', 'some', 'any', 'both', 'each'
]);

/**
 * Splits document text into clean, trimmed sentences.
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.?!])\s+(?=[A-Z0-9$€£৳])|\n{2,}|\r\n{2,}/)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => s.length > 20);
}

/**
 * Splits document into logical paragraphs or sections.
 */
export function splitIntoParagraphs(text: string): string[] {
  if (!text) return [];
  return text
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length > 30);
}

/**
 * Extracts and categorizes all figures, numbers, currencies, dates, and metrics from text.
 */
export function extractFiguresAndMetrics(text: string): {
  financial: string[];
  percentages: string[];
  dates: string[];
  quantities: string[];
} {
  const sentences = splitIntoSentences(text);
  const financial: string[] = [];
  const percentages: string[] = [];
  const dates: string[] = [];
  const quantities: string[] = [];

  const seenSentences = new Set<string>();

  for (const s of sentences) {
    if (seenSentences.has(s)) continue;

    // Currency / Financial
    if (/(\$|€|£|¥|৳|₹|USD|EUR|GBP|BDT|INR)\s*[\d,]+(?:\.\d+)?|\b[\d,]+(?:\.\d+)?\s*(?:dollars|euros|cents|million|billion|trillion|lakh|crore)\b/i.test(s)) {
      financial.push(s);
      seenSentences.add(s);
      continue;
    }

    // Percentages
    if (/\b\d+(?:\.\d+)?%|\b\d+(?:\.\d+)?\s*(?:percent|percentage)\b/i.test(s)) {
      percentages.push(s);
      seenSentences.add(s);
      continue;
    }

    // Dates & Timelines
    if (/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?|\b(?:Q[1-4]|FY\d{2,4})\b|\b(?:19|20)\d{2}\b|\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/i.test(s)) {
      dates.push(s);
      seenSentences.add(s);
      continue;
    }

    // Quantities / Measurements
    if (/\b[\d,]+(?:\.\d+)?\s*(?:kg|g|km|m|cm|mm|miles|hours|hrs|minutes|mins|days|weeks|months|years|units|users|clients|pages|items|tickets|orders|mb|gb|tb|hz|khz|mhz|ghz)\b/i.test(s)) {
      quantities.push(s);
      seenSentences.add(s);
      continue;
    }
  }

  return {
    financial: financial.slice(0, 6),
    percentages: percentages.slice(0, 6),
    dates: dates.slice(0, 6),
    quantities: quantities.slice(0, 6),
  };
}

/**
 * Extracts action items, recommendations, and directives from the text.
 */
export function extractActionItems(text: string): string[] {
  const sentences = splitIntoSentences(text);
  const actionItems: string[] = [];
  const actionRegex = /\b(?:must|shall|should|need to|required to|ensure|implement|deploy|review|submit|prepare|finalize|schedule|complete|contact|follow up|deliver|execute|assign|approve|verify|establish|maintain)\b/i;

  // Also check lines starting with bullet points or dashes
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^[-•*]\s+/.test(line) && actionRegex.test(line)) {
      const cleanLine = line.replace(/^[-•*]\s+/, '').trim();
      if (cleanLine.length > 15 && !actionItems.includes(cleanLine)) {
        actionItems.push(cleanLine);
      }
    }
  }

  for (const s of sentences) {
    if (actionRegex.test(s) && !actionItems.some((item) => item.includes(s.substring(0, 30)))) {
      actionItems.push(s);
    }
    if (actionItems.length >= 8) break;
  }

  return actionItems.slice(0, 8);
}

/**
 * Extracts key findings, conclusions, and primary takeaways.
 */
export function extractKeyFindings(text: string): string[] {
  const sentences = splitIntoSentences(text);
  const findings: string[] = [];
  const findingRegex = /\b(?:findings|results|conclude|concluded|conclusion|showed|demonstrates|indicates|revealed|achieved|improved|reached|increased|decreased|growth|outcome|impact|key takeaway|significant)\b/i;

  for (const s of sentences) {
    if (findingRegex.test(s) && s.length > 25) {
      findings.push(s);
    }
    if (findings.length >= 8) break;
  }

  return findings.length > 0 ? findings : sentences.slice(0, 5);
}

/**
 * Answers a user query intelligently based on extracted PDF context.
 */
export function processPdfChatQuery(
  userQuery: string,
  fullText: string,
  filename: string,
  summary: DocumentSummary | null
): string {
  const q = userQuery.trim();
  if (!q) return 'Please type a question about this document.';

  const qLower = q.toLowerCase();

  // 1. INTENT: Figures, Numbers, Metrics, Statistics
  if (
    /figures|numbers|metrics|statistics|amounts|values|dates|percentages|prices|cost|revenue|budget|financials/i.test(
      qLower
    )
  ) {
    const data = extractFiguresAndMetrics(fullText);
    const hasAny =
      data.financial.length > 0 ||
      data.percentages.length > 0 ||
      data.dates.length > 0 ||
      data.quantities.length > 0;

    if (!hasAny) {
      return `I scanned the document for numbers, metrics, and quantitative figures, but could not detect explicit numerical statistics in the extracted text. The document appears to be primarily conceptual or narrative.`;
    }

    const sections: string[] = ['### 📊 Key Figures & Quantitative Data Mentioned:'];

    if (data.financial.length > 0) {
      sections.push('**Financial & Currency Values:**');
      data.financial.forEach((item) => sections.push(`• ${item}`));
    }

    if (data.percentages.length > 0) {
      sections.push('\n**Percentages & Proportions:**');
      data.percentages.forEach((item) => sections.push(`• ${item}`));
    }

    if (data.dates.length > 0) {
      sections.push('\n**Dates, Years & Timelines:**');
      data.dates.forEach((item) => sections.push(`• ${item}`));
    }

    if (data.quantities.length > 0) {
      sections.push('\n**Quantities & Operational Metrics:**');
      data.quantities.forEach((item) => sections.push(`• ${item}`));
    }

    return sections.join('\n');
  }

  // 2. INTENT: Action Items, Tasks, Recommendations
  if (/action items|actions|next steps|recommendations|tasks|to-do|deliverables|what should (we|i) do/i.test(qLower)) {
    const actions = extractActionItems(fullText);
    if (actions.length === 0) {
      return `I analyzed the document for explicit action items or directives, but no imperative instructions were found. Based on the document overview, the suggested next step is:\n\n• Review the core sections and formulate specific inquiries regarding topics of interest.`;
    }

    const res = ['### 📋 Action Items & Directives:'];
    actions.forEach((act, idx) => {
      res.push(`${idx + 1}. ${act}`);
    });
    return res.join('\n');
  }

  // 3. INTENT: Key Findings, Conclusions, Insights
  if (/key findings|findings|conclusions|results|takeaways|outcomes|highlights/i.test(qLower)) {
    const findings = extractKeyFindings(fullText);
    const res = ['### 💡 Key Findings & Document Takeaways:'];
    findings.forEach((f, idx) => {
      res.push(`• ${f}`);
    });
    return res.join('\n');
  }

  // 4. INTENT: Summary / Overview
  if (/summary|summarize|overview|about|what is this/i.test(qLower)) {
    if (summary) {
      const parts = [
        `### 📄 Executive Summary: ${filename}`,
        summary.overview,
        '\n**Primary Highlights:**',
        ...summary.keyPoints.slice(0, 4).map((pt) => `• ${pt}`),
      ];
      if (summary.actionItems.length > 0) {
        parts.push('\n**Key Directives / Next Steps:**');
        parts.push(...summary.actionItems.slice(0, 3).map((act) => `• ${act}`));
      }
      return parts.join('\n');
    }
  }

  // 5. INTENT: Specific Fact / Open Natural Language Question
  const keywords = qLower
    .replace(/[^\w\s$€£৳%]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

  const sentences = splitIntoSentences(fullText);
  const scoredSentences: { sentence: string; score: number; index: number }[] = [];

  const isWhoQuestion = /^who\b/i.test(qLower);
  const isWhenQuestion = /^(when|what date|what year|what time)\b/i.test(qLower);
  const isWhereQuestion = /^where\b/i.test(qLower);
  const isHowMuchQuestion = /^(how much|how many|what is the cost|what is the price|what is the fee)\b/i.test(qLower);
  const isWhyQuestion = /^why\b/i.test(qLower);

  sentences.forEach((s, idx) => {
    const sLower = s.toLowerCase();
    let score = 0;

    // Exact query match bonus
    if (sLower.includes(qLower)) {
      score += 35;
    }

    // Keyword matches
    let matchedKwCount = 0;
    for (const kw of keywords) {
      if (sLower.includes(kw)) {
        score += 5;
        matchedKwCount++;
      }
    }

    // Density bonus if multiple keywords match
    if (keywords.length > 0 && matchedKwCount === keywords.length) {
      score += 15;
    }

    // Question type semantic heuristics
    if (isWhenQuestion && (/\b(?:19|20)\d{2}\b/i.test(s) || /\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\b/i.test(s))) {
      score += 10;
    }
    if (isHowMuchQuestion && (/\$|€|£|¥|৳|₹|\bpercent\b|%/i.test(s) || /\b[\d,]+(?:\.\d+)?\b/.test(s))) {
      score += 10;
    }
    if (isWhoQuestion && (/\bby\b|\bauthor\b|\bprepared by\b|\bclient\b|\bdr\b|\bmr\b|\bms\b/i.test(s) || /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(s))) {
      score += 8;
    }
    if (isWhyQuestion && (/\bbecause\b|\bdue to\b|\bin order to\b|\bas a result\b|\bsince\b/i.test(s))) {
      score += 10;
    }

    if (score > 0) {
      scoredSentences.push({ sentence: s, score, index: idx });
    }
  });

  scoredSentences.sort((a, b) => b.score - a.score);

  if (scoredSentences.length > 0 && scoredSentences[0].score >= 5) {
    const best = scoredSentences[0];
    // Gather surrounding context (previous or next sentence if available)
    const contextList = [best.sentence];
    if (best.index > 0 && sentences[best.index - 1]) {
      contextList.unshift(sentences[best.index - 1]);
    }
    if (best.index < sentences.length - 1 && sentences[best.index + 1]) {
      contextList.push(sentences[best.index + 1]);
    }

    const answerExcerpt = contextList.join(' ');

    return `Based on your document:\n\n**Direct Answer:**\n${best.sentence}\n\n**Context:**\n> "${answerExcerpt}"`;
  }

  // Fallback with relevant context guidance
  const topSentences = sentences.slice(0, 3).join(' ');
  return `I searched the document for your inquiry about "${q}". While a direct match for those exact words wasn't identified, here is what this document discusses:\n\n> "${topSentences}"\n\n💡 *Tip: Try asking about specific terms, numbers, or section titles present in the file.*`;
}

/**
 * Generates high-quality, highly relevant Questions and Answers from the PDF content.
 */
export function generateSmartDocumentQa(fullText: string, filename: string): QaPair[] {
  const sentences = splitIntoSentences(fullText);
  if (sentences.length === 0) {
    return [
      {
        question: `What type of document is "${filename}"?`,
        answer: 'This PDF file has been uploaded and ready for query processing.',
        category: 'Overview',
      },
    ];
  }

  const qaList: QaPair[] = [];

  // 1. Overall Purpose Q&A
  const purposeSentence = sentences.find((s) =>
    /\b(purpose|objective|aim|designed to|overview|intended to|report|summary|guide|agreement)\b/i.test(s)
  ) || sentences[0];

  qaList.push({
    question: 'What is the primary purpose and scope of this document?',
    answer: purposeSentence,
    category: 'Executive Overview',
  });

  // 2. Key Findings / Core Topic Q&A
  const findings = extractKeyFindings(fullText);
  if (findings.length > 0) {
    qaList.push({
      question: 'What are the main findings, insights, or conclusions highlighted?',
      answer: findings.slice(0, 2).join(' '),
      category: 'Key Findings',
    });
  }

  // 3. Figures & Metrics Q&A (if present)
  const metrics = extractFiguresAndMetrics(fullText);
  const metricItems = [...metrics.financial, ...metrics.percentages, ...metrics.dates].slice(0, 3);
  if (metricItems.length > 0) {
    qaList.push({
      question: 'What key figures, numerical data, or timelines are specified?',
      answer: metricItems.join(' • '),
      category: 'Metrics & Data',
    });
  }

  // 4. Action Items & Next Steps Q&A (if present)
  const actions = extractActionItems(fullText);
  if (actions.length > 0) {
    qaList.push({
      question: 'What key action items, procedures, or requirements are established?',
      answer: actions.slice(0, 2).join(' • '),
      category: 'Action Items',
    });
  }

  // 5. Specific Paragraph Topics
  const paragraphs = splitIntoParagraphs(fullText);
  if (paragraphs.length > 2) {
    const midParagraph = paragraphs[Math.floor(paragraphs.length / 2)];
    const midSentences = splitIntoSentences(midParagraph);
    if (midSentences.length > 0) {
      qaList.push({
        question: 'What details are discussed in the core body of the document?',
        answer: midSentences.slice(0, 2).join(' '),
        category: 'Core Content',
      });
    }
  }

  // 6. Conclusion / Final Notes
  if (sentences.length > 5) {
    const lastSentence = sentences[sentences.length - 1];
    if (lastSentence.length > 30) {
      qaList.push({
        question: 'What is the final conclusion or closing statement of this document?',
        answer: lastSentence,
        category: 'Conclusion',
      });
    }
  }

  return qaList.slice(0, 6);
}
