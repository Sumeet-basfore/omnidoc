import { tavilySearch, exaSearch } from './searchService';
import { keyService } from './keyService';
import type { DocumentItem } from '../types/document';

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

const str = { type: 'string' };
const optNum = { type: 'number' };

export const AGENT_TOOLS: ToolDef[] = [
  {
    name: 'web_search',
    description:
      'Search the live web (Tavily + Exa). Use for current facts, docs, prices, news. Returns numbered results with titles, URLs, snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: { ...str, description: 'Search query' },
        count: { ...optNum, description: 'Max results, default 5' }
      },
      required: ['query']
    }
  },
  {
    name: 'read_document',
    description:
      'Read more of the active document by line numbers. The prompt only includes a preview; use this for the rest.',
    parameters: {
      type: 'object',
      properties: {
        startLine: { ...optNum, description: '1-based first line, default 1' },
        endLine: { ...optNum, description: '1-based last line, default start+400' }
      }
    }
  },
  {
    name: 'propose_insert',
    description:
      'Propose text to append to the active document. It goes to the user review queue — never applied directly. Use for drafts, sections, rewrites.',
    parameters: {
      type: 'object',
      properties: {
        text: { ...str, description: 'Markdown/text to propose' },
        label: { ...str, description: 'Short label for the review queue' }
      },
      required: ['text']
    }
  },
  {
    name: 'get_selection',
    description: 'Get the text currently selected in the editor, if any.',
    parameters: { type: 'object', properties: {} }
  },
  {
    name: 'search_within_doc',
    description:
      'Search for keywords or regex patterns within the active document. Returns matching lines and line numbers.',
    parameters: {
      type: 'object',
      properties: {
        query: { ...str, description: 'Search term or regex pattern' },
        is_regex: { type: 'boolean', description: 'Treat query as a regular expression (optional)' }
      },
      required: ['query']
    }
  },
  {
    name: 'get_document_stats',
    description:
      'Compute statistical metrics for the active document: word count, character count, estimated reading time, reading grade level (Flesch-Kincaid), and vocabulary richness.',
    parameters: {
      type: 'object',
      properties: {
        metrics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific metrics to return: "word_count", "readability", "vocabulary", "lines"'
        }
      }
    }
  }
];

export interface ToolContext {
  getActiveDoc: () => DocumentItem | null;
  getSelection: () => string;
  queueInsert: (docId: string, text: string, label: string) => void;
}

const RESULT_CAP = 3000;

function cap(s: string): string {
  return s.length > RESULT_CAP ? s.slice(0, RESULT_CAP) + '…[truncated]' : s;
}

const TEXT_FORMATS = new Set(['markdown', 'text', 'code']);

export async function executeTool(
  name: string,
  args: Record<string, any>,
  ctx: ToolContext
): Promise<string> {
  try {
    switch (name) {
      case 'web_search': {
        const query = String(args.query || '').trim();
        if (!query) return 'Error: query is required.';
        const count = Math.min(10, Math.max(1, Number(args.count) || 5));
        const [tavilyKey, exaKey] = await Promise.all([
          keyService.get('tavily'),
          keyService.get('exa')
        ]);
        if (!tavilyKey && !exaKey) {
          return 'Web search is not configured. The user must add Tavily or Exa keys in Settings > Deep research keys. Tell them that instead of guessing web facts.';
        }
        const parts: Promise<Array<{ title: string; url: string; snippet: string }>>[] = [];
        if (tavilyKey) parts.push(tavilySearch(query, tavilyKey));
        if (exaKey) parts.push(exaSearch(query, exaKey));
        const combined = (await Promise.all(parts)).flat().slice(0, count * 2);
        if (combined.length === 0) return `No results for "${query}".`;
        return cap(
          combined
            .slice(0, count)
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet.slice(0, 300)}`)
            .join('\n\n')
        );
      }
      case 'read_document': {
        const doc = ctx.getActiveDoc();
        if (!doc) return 'Error: no active document.';
        const lines = doc.content.split('\n');
        let start = Math.max(1, Number(args.startLine) || 0);
        let end = Number(args.endLine) || 0;
        if (!start && !end) {
          // Default to the user's selection when present, else head of doc
          const sel = ctx.getSelection().trim();
          const idx = sel ? doc.content.indexOf(sel.slice(0, 120)) : -1;
          if (idx >= 0) {
            const line = doc.content.slice(0, idx).split('\n').length;
            start = Math.max(1, line - 40);
            end = Math.min(lines.length, line + 40);
          } else {
            start = 1;
            end = Math.min(lines.length, start + 400);
          }
        } else {
          if (!start) start = 1;
          if (!end) end = Math.min(lines.length, start + 400);
          end = Math.min(lines.length, end);
        }
        if (start > lines.length) return `Error: document has ${lines.length} lines.`;
        const chunk = lines.slice(start - 1, end).join('\n');
        return cap(`[${doc.name}, lines ${start}-${end} of ${lines.length}]\n${chunk.slice(0, 8000)}`);
      }
      case 'propose_insert': {
        const doc = ctx.getActiveDoc();
        if (!doc) return 'Error: no active document.';
        if (!TEXT_FORMATS.has(doc.format)) {
          return `Error: cannot propose inserts into ${doc.format.toUpperCase()} documents (markdown/text/code only). Offer "Open as new tab" via chat text instead.`;
        }
        const text = String(args.text || '').trim();
        if (!text) return 'Error: text is required.';
        ctx.queueInsert(doc.id, text, String(args.label || 'Agent proposal'));
        return 'Queued for user review. Tell the user to check the review strip above the editor to Accept or Reject it.';
      }
      case 'get_selection': {
        const sel = ctx.getSelection().trim();
        return sel ? `Selected text:\n"""\n${cap(sel)}\n"""` : '(no text selected)';
      }
      case 'search_within_doc': {
        const doc = ctx.getActiveDoc();
        if (!doc) return 'Error: no active document.';
        const query = String(args.query || '').trim();
        if (!query) return 'Error: query is required.';

        const lines = doc.content.split('\n');
        const matches: Array<{ line: number; text: string }> = [];

        if (args.is_regex) {
          try {
            const re = new RegExp(query, 'i');
            lines.forEach((line, i) => {
              if (re.test(line)) {
                matches.push({ line: i + 1, text: line.trim() });
              }
            });
          } catch (e: any) {
            return `Error: invalid regular expression: ${e.message}`;
          }
        } else {
          const lower = query.toLowerCase();
          lines.forEach((line, i) => {
            if (line.toLowerCase().includes(lower)) {
              matches.push({ line: i + 1, text: line.trim() });
            }
          });
        }

        if (matches.length === 0) {
          return `No matches found for "${query}" in ${doc.name} (${lines.length} lines searched).`;
        }

        const capped = matches.slice(0, 25);
        const list = capped.map((m) => `L${m.line}: ${m.text}`).join('\n');
        const notice = matches.length > 25 ? `\n... and ${matches.length - 25} more matches.` : '';
        return `Found ${matches.length} match(es) for "${query}" in ${doc.name}:\n${list}${notice}`;
      }
      case 'get_document_stats': {
        const doc = ctx.getActiveDoc();
        if (!doc) return 'Error: no active document.';
        const content = doc.content.trim();
        const words = content.split(/\s+/).filter(Boolean);
        const wordCount = words.length;
        const charCount = doc.content.length;
        const lineCount = doc.content.split('\n').length;
        const readingTimeMin = Math.ceil(wordCount / 225) || 1;

        // Flesch-Kincaid Grade Level calculation
        const sentences = content.split(/[.!?]+/).filter((s) => s.trim().length > 0).length || 1;
        const syllables = words.reduce((acc, word) => {
          const w = word.toLowerCase().replace(/[^a-z]/g, '');
          if (!w) return acc;
          const count = (w.match(/[aeiouy]{1,2}/g) || []).length;
          return acc + Math.max(1, count);
        }, 0);

        const avgWordsPerSentence = wordCount / sentences;
        const avgSyllablesPerWord = wordCount > 0 ? syllables / wordCount : 1;
        const gradeLevel = Math.max(
          1,
          Math.round((0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59) * 10) / 10
        );

        // Lexical Diversity (Type-Token Ratio)
        const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ''))).size;
        const lexicalDiversity = wordCount > 0 ? Math.round((uniqueWords / wordCount) * 100) : 0;

        let readabilityDescription = 'Standard';
        if (gradeLevel <= 6) readabilityDescription = 'Elementary (very easy to read)';
        else if (gradeLevel <= 8) readabilityDescription = 'Middle School (plain conversational)';
        else if (gradeLevel <= 12) readabilityDescription = 'High School (standard publication)';
        else if (gradeLevel <= 16) readabilityDescription = 'Undergraduate (technical/academic)';
        else readabilityDescription = 'Advanced / Graduate (dense academic)';

        return JSON.stringify(
          {
            document: doc.name,
            format: doc.format,
            word_count: wordCount,
            character_count: charCount,
            line_count: lineCount,
            estimated_reading_time: `${readingTimeMin} min`,
            flesch_kincaid_grade_level: gradeLevel,
            readability_level: readabilityDescription,
            unique_vocabulary_terms: uniqueWords,
            lexical_diversity_pct: `${lexicalDiversity}%`
          },
          null,
          2
        );
      }
      default:
        return `Error: unknown tool "${name}". Available: ${AGENT_TOOLS.map((t) => t.name).join(', ')}.`;
    }
  } catch (err: any) {
    return `Error executing ${name}: ${err?.message || err}`;
  }
}
