import { DeepResearchQuery, DeepResearchResult, SearchResult, AIProviderConfig } from '../types/ai';
import { callAI } from './aiService';

export async function tavilySearch(query: string, apiKey: string): Promise<SearchResult[]> {
  if (!apiKey) return [];

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
      })
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
    console.error('Tavily search error:', err);
    return [];
  }
}

export async function exaSearch(query: string, apiKey: string, includeContents = false): Promise<SearchResult[]> {
  if (!apiKey) return [];

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
      })
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
    console.error('Exa search error:', err);
    return [];
  }
}

export async function runDeepResearch(
  query: DeepResearchQuery,
  keys: { tavilyKey?: string | null; exaKey?: string | null },
  aiConfig: AIProviderConfig,
  aiKey: string
): Promise<DeepResearchResult> {
  const searchPromises: Promise<SearchResult[]>[] = [];

  if (keys.tavilyKey) {
    searchPromises.push(tavilySearch(query.topic, keys.tavilyKey));
  }
  if (keys.exaKey) {
    searchPromises.push(exaSearch(query.topic, keys.exaKey, query.depth === 'deep'));
  }

  const rawResults = await Promise.all(searchPromises);
  const combined = rawResults.flat();

  // Deduplicate by URL
  const seenUrls = new Set<string>();
  const sources: SearchResult[] = [];
  for (const s of combined) {
    if (s.url && !seenUrls.has(s.url)) {
      seenUrls.add(s.url);
      sources.push(s);
    }
  }

  const sourceContext = sources
    .map(
      (s, idx) => `[Source ${idx + 1}]: "${s.title}" (${s.url})\nSummary: ${s.snippet.slice(0, 500)}`
    )
    .join('\n\n');

  const researchPrompt = `Please produce a comprehensive, structured research report on the topic:
"${query.topic}"

Depth: ${query.depth}
Include Citations: ${query.includeCitations ? 'YES (use markdown hyperlinked citations [Title](url))' : 'NO'}

Live Web Search Context:
${sourceContext || '(No live web search results were retrieved or search keys were not configured. Synthesize based on domain expertise.)'}

Report Structure to follow:
# Executive Summary
## Key Findings & Core Analysis
## Detailed Breakdown & Insights
## Challenges, Trade-offs & Considerations
## Recommendations & Future Outlook
## References & Sources`;

  const report = await callAI(
    [
      {
        id: 'research-task',
        role: 'user',
        content: researchPrompt,
        timestamp: Date.now()
      }
    ],
    aiConfig,
    aiKey,
    'researcher'
  );

  return {
    title: query.topic,
    markdownContent: report,
    sources
  };
}
