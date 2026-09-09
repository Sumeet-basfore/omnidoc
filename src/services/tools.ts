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
      default:
        return `Error: unknown tool "${name}". Available: ${AGENT_TOOLS.map((t) => t.name).join(', ')}.`;
    }
  } catch (err: any) {
    return `Error executing ${name}: ${err?.message || err}`;
  }
}
