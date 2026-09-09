import { DeepResearchQuery, DeepResearchResult, SearchResult, AIProviderConfig, AIMessage } from '../types/ai';
import { streamAI } from './aiService';
import { linkedSignal } from './aiService';

const SEARCH_TIMEOUT_MS = 45000;

export async function tavilySearch(
  query: string,
  apiKey: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  if (!apiKey) return [];

  const link = linkedSignal(signal, SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'advanced',
        include_answer: true,
        max_results: 6
      }),
      signal: link.signal
    });

    if (!res.ok) {
      console.warn('Tavily search returned status', res.status);
      return [];
    }

    const data = await res.json();
    const results: SearchResult[] = [];

    if (data.answer) {
      results.push({
        title: 'Tavily Direct Synthesis',
        url: 'https://tavily.com',
        snippet: data.answer,
        score: 1.0
      });
    }

    if (Array.isArray(data.results)) {
      for (const item of data.results) {
        results.push({
          title: item.title || 'Untitled Result',
          url: item.url || '',
          snippet: item.content || item.snippet || '',
          score: item.score
        });
      }
    }

    return results;
  } catch (err) {
    if ((err as any)?.name === 'AbortError') throw err;
    console.error('Tavily search error:', err);
    return [];
  } finally {
    link.done();
  }
}

export async function exaSearch(
  query: string,
  apiKey: string,
  includeContents = false,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  if (!apiKey) return [];

  const link = linkedSignal(signal, SEARCH_TIMEOUT_MS);
  try {
    const res = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey
      },
      body: JSON.stringify({
        query,
        numResults: 6,
        useAutoprompt: true,
        contents: includeContents ? { text: { maxCharacters: 1000 } } : undefined
      }),
      signal: link.signal
    });

    if (!res.ok) {
      console.warn('Exa search returned status', res.status);
      return [];
    }

    const data = await res.json();
    const results: SearchResult[] = [];

    if (Array.isArray(data.results)) {
      for (const item of data.results) {
        results.push({
          title: item.title || item.url || 'Web Source',
          url: item.url || '',
          snippet: item.text || item.snippet || '',
          score: item.score
        });
      }
    }

    return results;
  } catch (err) {
    if ((err as any)?.name === 'AbortError') throw err;
    console.error('Exa search error:', err);
    return [];
  } finally {
    link.done();
  }
}

// ---------- retrieval quality ----------

function tokens(s: string): Set<string> {
  const set = new Set<string>();
  for (const w of s.toLowerCase().split(/[^a-z0-9]+/)) {
    if (w.length > 2) set.add(w);
  }
  return set;
}

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/** 0.6 * provider score + 0.4 * keyword overlap with the query. */
export function rerank(query: string, results: SearchResult[]): SearchResult[] {
  const qt = tokens(query);
  return results
    .filter((r) => r.url && r.snippet && r.snippet.trim().length > 0)
    .map((r) => {
      const st = tokens(`${r.title} ${r.snippet}`);
      let overlap = 0;
      if (qt.size > 0) {
        let hit = 0;
        qt.forEach((w) => {
          if (st.has(w)) hit++;
        });
        overlap = hit / qt.size;
      }
      const base = typeof r.score === 'number' ? r.score : 0.5;
      return { ...r, score: 0.6 * base + 0.4 * overlap };
    })
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

/** Merge groups: dedupe by URL, max 2 per domain, score-sorted. */
export function mergeSources(groups: SearchResult[][]): SearchResult[] {
  const seen = new Set<string>();
  const domainCount = new Map<string, number>();
  const all = groups.flat();
  const out: SearchResult[] = [];
  // Greedy: iterate score-desc so caps keep the best per domain
  const sorted = [...all].sort((a, b) => (b.score || 0) - (a.score || 0));
  for (const s of sorted) {
    const key = s.url.toLowerCase().replace(/\/$/, '');
    if (seen.has(key)) continue;
    const d = domainOf(s.url);
    if (d && (domainCount.get(d) || 0) >= 2) continue;
    seen.add(key);
    if (d) domainCount.set(d, (domainCount.get(d) || 0) + 1);
    out.push(s);
  }
  return out;
}

// ---------- citation verification (no LLM call) ----------

function normUrl(u: string): string {
  return u
    .trim()
    .replace(/^https?:\/\/(www\.)?/i, '')
    .split('#')[0]
    .replace(/\/$/, '')
    .toLowerCase();
}

/**
 * Every [text](url) must resolve into the retrieved set (exact, prefix, or
 * vice versa after normalization). Unmatched links are de-linked to plain
 * text and counted.
 */
export function verifyCitations(
  markdown: string,
  sources: SearchResult[]
): { clean: string; removed: number } {
  const known = sources.map((s) => normUrl(s.url)).filter(Boolean);
  if (known.length === 0) {
    // No sources at all: strip every hyperlink, keep text
    let removed = 0;
    const clean = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text) => {
      removed++;
      return String(text);
    });
    return { clean, removed };
  }
  let removed = 0;
  const clean = markdown.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, text, url) => {
    const n = normUrl(String(url));
    const ok = known.some((k) => k === n || k.startsWith(n) || n.startsWith(k));
    if (ok) return m;
    removed++;
    return String(text);
  });
  return { clean, removed };
}

// ---------- research pipeline ----------

export interface ResearchProgress {
  stage: 'plan' | 'search' | 'synthesize' | 'verify' | 'done';
  searched: number;
  total: number;
  note?: string;
}

export interface ResearchOpts {
  signal?: AbortSignal;
  onProgress?: (p: ResearchProgress) => void;
  onUsage?: (u: { in: number; out: number }) => void;
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw (signal as any).reason || new Error('Aborted');
}

function formatSources(list: SearchResult[], cap: number): string {
  return list
    .slice(0, cap)
    .map((s, i) => `[Source ${i + 1}]: "${s.title}" (${s.url})\nSummary: ${s.snippet.slice(0, 500)}`)
    .join('\n\n');
}

function referencesSection(sources: SearchResult[]): string {
  if (sources.length === 0) return '';
  const lines = sources.map((s) => `- [${s.title}](${s.url})`);
  return `\n\n## References\n\n${lines.join('\n')}`;
}

/** Abortable single synthesis call (shares the panel's AbortSignal). */
async function synth(
  promptId: string,
  prompt: string,
  aiConfig: AIProviderConfig,
  aiKey: string,
  signal?: AbortSignal,
  onUsage?: (u: { in: number; out: number }) => void
): Promise<string> {
  const { text, usage } = await streamAI({
    messages: [{ id: promptId, role: 'user', content: prompt, timestamp: Date.now() } as AIMessage],
    config: aiConfig,
    apiKey: aiKey,
    persona: 'researcher',
    signal: signal ?? new AbortController().signal,
    onToken: () => undefined
  });
  if (usage && (usage.in || usage.out)) onUsage?.({ in: usage.in || 0, out: usage.out || 0 });
  return text;
}

const HEURISTIC_SUBS = (topic: string) => [
  `${topic}: background and key concepts`,
  `${topic}: current state and recent developments`,
  `${topic}: challenges, criticism and trade-offs`,
  `${topic}: outlook and recommendations`
];

async function planSubQuestions(
  topic: string,
  aiConfig: AIProviderConfig,
  aiKey: string,
  signal?: AbortSignal,
  onUsage?: (u: { in: number; out: number }) => void
): Promise<string[]> {
  try {
    const raw = await synth('planner', `Break the research topic "${topic}" into 4 focused sub-questions covering background, current state, challenges, and outlook. Reply with one sub-question per line, no numbering, no extra text.`, aiConfig,
      aiKey,
      signal,
      onUsage);
    const lines = raw
      .split('\n')
      .map((l) => l.replace(/^[\s*\-\d.)\]]+/, '').replace(/["“”]/g, '').trim())
      .filter((l) => l.length > 12)
      .slice(0, 5);
    if (lines.length >= 3) return lines;
  } catch (err) {
    console.warn('Planner failed, using heuristic split:', err);
  }
  return HEURISTIC_SUBS(topic);
}

async function searchOne(
  q: string,
  keys: { tavilyKey?: string | null; exaKey?: string | null },
  deep: boolean,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const jobs: Promise<SearchResult[]>[] = [];
  if (keys.tavilyKey) jobs.push(tavilySearch(q, keys.tavilyKey, signal));
  if (keys.exaKey) jobs.push(exaSearch(q, keys.exaKey, deep, signal));
  const out = (await Promise.all(jobs)).flat();
  return rerank(q, out);
}

/** Bounded-concurrency pool; aborts stop scheduling, partial results kept. */
async function mapPool<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
  onDone?: (done: number, total: number) => void
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (true) {
      if (signal?.aborted) return;
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
      done++;
      onDone?.(done, items.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  checkAbort(signal);
  return results;
}

async function synthesizeSection(
  topic: string,
  sub: string,
  sources: SearchResult[],
  includeCitations: boolean,
  aiConfig: AIProviderConfig,
  aiKey: string,
  signal?: AbortSignal,
  onUsage?: (u: { in: number; out: number }) => void
): Promise<string> {
  if (sources.length === 0) {
    return `## ${sub}\n\nNo live sources were retrieved for this section — skipping rather than inventing coverage.`;
  }
  const body = await synth('section-task', `You are writing one section of a research report on "${topic}".\nSection focus: "${sub}"\n\nStart with a "## <short heading>" line of your choice, then the section.\nUse ONLY the sources below. Every factual claim must carry an inline markdown citation [Title](url) with the exact URLs given.${includeCitations ? '' : ' Citations are disabled for this report: do NOT emit any markdown links.'}\nIf sources lack material, say so briefly instead of inventing.\n\nSources:\n${formatSources(sources, 6)}`, aiConfig,
      aiKey,
      signal,
      onUsage);
  return body.trim();
}

export async function runDeepResearch(
  query: DeepResearchQuery,
  keys: { tavilyKey?: string | null; exaKey?: string | null },
  aiConfig: AIProviderConfig,
  aiKey: string,
  opts: ResearchOpts = {}
): Promise<DeepResearchResult> {
  const { signal, onProgress, onUsage } = opts;
  const reportUsage = (u: { in: number; out: number }) => onUsage?.(u);
  const emit = (p: ResearchProgress) => onProgress?.(p);
  const hasSearch = !!(keys.tavilyKey || keys.exaKey);

  // ---- no-keys mode: model knowledge only, citations forbidden
  if (!hasSearch) {
    emit({ stage: 'synthesize', searched: 0, total: 0, note: 'No search keys — model knowledge only' });
    const report = await synth('research-task', `Write a comprehensive research report on "${query.topic}" from your own knowledge (no live sources available — state this limitation up top). Do NOT emit any markdown hyperlinks or citations.\n\nStructure:\n# Executive Summary\n## Key Findings & Core Analysis\n## Detailed Breakdown & Insights\n## Challenges, Trade-offs & Considerations\n## Recommendations & Future Outlook`, aiConfig,
      aiKey,
      signal,
      reportUsage);
    emit({ stage: 'done', searched: 0, total: 0 });
    return { title: query.topic, markdownContent: report, sources: [], unverifiedRemoved: 0, modelOnly: true };
  }

  // Collected groups feed the abort path: cancel keeps sources found so far.
  const collected: SearchResult[][] = [];
  const collect = async (q: string, d: boolean): Promise<SearchResult[]> => {
    const g = await searchOne(q, keys, d, signal);
    collected.push(g);
    return g;
  };
  const abortError = (): any => ({
    aborted: true,
    message: 'Aborted',
    partialSources: mergeSources(collected)
  });

  // ---- quick: single search + single synthesis (fast path)
  try {
  if (query.depth === 'quick') {
    emit({ stage: 'search', searched: 0, total: 1 });
    const group = await collect(query.topic, false).catch((err) => {
      if (err?.name === 'AbortError' || signal?.aborted) throw abortError();
      throw err;
    });
    checkAbort(signal);
    emit({ stage: 'search', searched: 1, total: 1 });
    const sources = mergeSources([group]);
    emit({ stage: 'synthesize', searched: 1, total: 1 });
    const sourceContext = formatSources(sources, 8);
    const report = await synth('research-task', `Write a concise research brief on "${query.topic}".\n${query.includeCitations ? 'Use inline markdown citations [Title](url) with the exact URLs below for factual claims.' : 'Do NOT emit markdown links.'}\n\nLive Web Search Context:\n${sourceContext || '(No results retrieved.)'}\n\nStructure:\n# Executive Summary\n## Key Findings\n## Details\n## References & Sources (link every source used)`, aiConfig,
      aiKey,
      signal,
      reportUsage);
    emit({ stage: 'verify', searched: 1, total: 1 });
    const { clean, removed } = verifyCitations(report, sources);
    emit({ stage: 'done', searched: 1, total: 1 });
    return {
      title: query.topic,
      markdownContent: clean + referencesSection(sources),
      sources,
      unverifiedRemoved: removed,
      modelOnly: false
    };
  }

  // ---- standard & deep: plan → parallel search → per-section synthesis
  emit({ stage: 'plan', searched: 0, total: 0 });
  const subs = await planSubQuestions(query.topic, aiConfig, aiKey, signal, reportUsage);
  checkAbort(signal);

  const deep = query.depth === 'deep';
  emit({ stage: 'search', searched: 0, total: subs.length });
  const groups = await mapPool(
    subs,
    3,
    (sub) => collect(sub, deep),
    signal,
    (done, total) => emit({ stage: 'search', searched: done, total })
  );

  let sectionGroups = groups.map((g, i) => ({ sub: subs[i], sources: g.slice(0, 6) }));

  // ---- deep: gap pass on section summaries
  if (deep) {
    checkAbort(signal);
    emit({ stage: 'search', searched: subs.length, total: subs.length, note: 'Gap analysis' });
    const digest = sectionGroups
      .map((g) => `### ${g.sub}\n${g.sources.map((s) => `- ${s.title}: ${s.snippet.slice(0, 160)}`).join('\n')}`)
      .join('\n\n')
      .slice(0, 6000);
    let gaps: string[] = [];
    try {
      const raw = await synth('gap-task', `Given these research section summaries on "${query.topic}", list 2-4 follow-up questions exposing gaps, missing data, or dissenting views. One per line, no numbering.\n\n${digest}`, aiConfig,
      aiKey,
      signal,
      reportUsage);
      gaps = raw
        .split('\n')
        .map((l) => l.replace(/^[\s*\-\d.)\]]+/, '').replace(/["“”]/g, '').trim())
        .filter((l) => l.length > 12)
        .slice(0, 4);
    } catch (err) {
      console.warn('Gap analysis failed, skipping:', err);
    }
    if (gaps.length > 0) {
      checkAbort(signal);
      const gapGroups = await mapPool(
        gaps,
        3,
        (g) => collect(g, true),
        signal,
        (done, total) => emit({ stage: 'search', searched: subs.length + done, total: subs.length + gaps.length })
      );
      gapGroups.forEach((g, i) => {
        if (g.length > 0) sectionGroups.push({ sub: `Further angle: ${gaps[i]}`, sources: g.slice(0, 6) });
      });
    }
  }

  emit({ stage: 'synthesize', searched: sectionGroups.length, total: sectionGroups.length, note: 'Writing sections' });
  const sections = await mapPool(
    sectionGroups,
    2,
    (g) => synthesizeSection(query.topic, g.sub, g.sources, query.includeCitations, aiConfig, aiKey, signal, reportUsage),
    signal
  );

  const merged = mergeSources(sectionGroups.map((g) => g.sources));
  emit({ stage: 'verify', searched: sectionGroups.length, total: sectionGroups.length });
  const stitched = `# ${query.topic}\n\n${sections.join('\n\n')}`;
  const { clean, removed } = verifyCitations(stitched, merged);
  emit({ stage: 'done', searched: sectionGroups.length, total: sectionGroups.length });
  return {
    title: query.topic,
    markdownContent: clean + referencesSection(merged),
    sources: merged,
    unverifiedRemoved: removed,
    modelOnly: false
  };
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) throw abortError();
    throw err;
  }
}
