import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import { Bold, Italic, Heading1, Heading2, Heading3, Code, Link, Table, Sparkles, Eye, Columns, Edit3 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface SlashDef {
  name: string;
  hint: string;
  text: string;
  cursor?: number; // offset from insert start; defaults to text.length
}

const SLASH_COMMANDS: SlashDef[] = [
  { name: 'h1', hint: 'Heading 1', text: '# ' },
  { name: 'h2', hint: 'Heading 2', text: '## ' },
  { name: 'h3', hint: 'Heading 3', text: '### ' },
  { name: 'bold', hint: 'Bold text', text: '****', cursor: 2 },
  { name: 'italic', hint: 'Italic text', text: '**', cursor: 1 },
  { name: 'link', hint: 'Link', text: '[](https://)', cursor: 1 },
  { name: 'code', hint: 'Code block', text: '```\n\n```', cursor: 4 },
  { name: 'table', hint: 'Table 2x2', text: '| Col 1 | Col 2 |\n| --- | --- |\n|  |  |\n' },
  { name: 'toc', hint: 'Table of contents', text: '' },
  { name: 'katex', hint: 'Math block', text: '$$\n\n$$', cursor: 3 },
  { name: 'hr', hint: 'Divider', text: '---\n' }
];

interface MarkdownEditorProps {
  documentId: string;
  content: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ documentId, content }) => {
  const { updateDocumentContent, tabs, activeTabId, setTabActiveView, setSelectedText, toggleAIDrawer } = useAppStore();
  const currentTab = tabs.find((t) => t.id === activeTabId);
  const activeView = (currentTab?.activeView as 'editor' | 'preview' | 'split') || 'split';

  const [renderedHtml, setRenderedHtml] = useState<string>('');
  const [paperMode, setPaperMode] = useState<boolean>(true);
  const [slash, setSlash] = useState<{ query: string; lineStart: number } | null>(null);
  const [slashIndex, setSlashIndex] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Configure marked with highlight.js
  useEffect(() => {
    marked.setOptions({
      gfm: true,
      breaks: true
    });
  }, []);

  // Render markdown with KaTeX and Highlight.js
  useEffect(() => {
    let parsed = '';
    try {
      parsed = marked.parse(content) as string;

      // Inline math: \( ... \) or $ ... $
      parsed = parsed.replace(/\$([^\$\n]+)\$/g, (_match, expr) => {
        try {
          return katex.renderToString(expr, { displayMode: false, throwOnError: false });
        } catch {
          return expr;
        }
      });

      // Display math: \[ ... \] or $$ ... $$
      parsed = parsed.replace(/\$\$([^\$]+)\$\$/g, (_match, expr) => {
        try {
          return katex.renderToString(expr, { displayMode: true, throwOnError: false });
        } catch {
          return expr;
        }
      });
    } catch (e) {
      console.error('Markdown parse error:', e);
      parsed = content;
    }

    setRenderedHtml(parsed);
  }, [content]);

  // Syntax highlighting for code blocks in preview
  useEffect(() => {
    if (previewRef.current) {
      previewRef.current.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [renderedHtml, activeView]);

  // Handle text selection for inline AI assistant
  const handleSelection = () => {
    const selection = window.getSelection();
    const text = selection ? selection.toString().trim() : '';

    if (text && text.length > 2) {
      const range = selection?.getRangeAt(0);
      const rect = range?.getBoundingClientRect();
      if (rect) {
        setSelectedText(text, {
          top: rect.bottom + window.scrollY,
          left: Math.max(10, rect.left + rect.width / 2 - 120)
        });
        return;
      }
    }
    setSelectedText('', null);
  };

  const handleInsert = (before: string, after: string = '', defaultText: string = '') => {
    if (!textareaRef.current) return;
    const el = textareaRef.current;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selected = el.value.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;
    const nextContent = el.value.substring(0, start) + replacement + el.value.substring(end);

    updateDocumentContent(documentId, nextContent);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const isSyncingScroll = useRef(false);
  const lineHRef = useRef<number>(22.75); // text-sm/relaxed fallback

  // Measure the textarea's real line height once (matches font-mono text-sm leading-relaxed)
  useEffect(() => {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:absolute;visibility:hidden;top:0;left:0;font-family:var(--font-mono);font-size:14px;line-height:1.625;';
    probe.textContent = 'Ag';
    document.body.appendChild(probe);
    const h = probe.getBoundingClientRect().height;
    if (h > 0) lineHRef.current = h;
    probe.remove();
  }, []);

  // Fence-aware source block starts (line numbers). Lists/quotes/induced
  // continuations merge so one rendered block ~= one entry.
  const sourceBlocks = React.useMemo(() => {
    const lines = content.split('\n');
    const starts: number[] = [];
    let inFence = false;
    const isFence = (l: string) => /^(`{3,}|~{3,})/.test(l.trim());
    const isList = (l: string) => /^\s*([-*+]|\d+[.)])\s+/.test(l);
    const isQuote = (l: string) => /^\s*>/.test(l);
    const isBlank = (l: string) => l.trim() === '';
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (isFence(l)) {
        if (!inFence) starts.push(i);
        inFence = !inFence;
        continue;
      }
      if (inFence || isBlank(l)) continue;
      const prev = i === 0 ? '' : lines[i - 1];
      const continues =
        !isBlank(prev) &&
        (isList(l) || isQuote(l) || isList(prev) || isQuote(prev) || /^( {2,}|\t)/.test(l));
      if (starts.length === 0 || !continues) starts.push(i);
    }
    return starts;
  }, [content]);

  const previewBlocks = (): HTMLElement[] => {
    const root = previewRef.current?.firstElementChild;
    if (!root) return [];
    return Array.from(root.children).filter((el) => el instanceof HTMLElement) as HTMLElement[];
  };

  const syncScroll = (source: 'editor' | 'preview') => {
    if (activeView !== 'split' || isSyncingScroll.current) return;
    isSyncingScroll.current = true;
    const kids = previewBlocks();
    // Fall back to percentage sync when block maps are unusable
    if (source === 'editor' && textareaRef.current && previewRef.current) {
      if (kids.length === 0 || sourceBlocks.length === 0) {
        const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
        const maxScroll = scrollHeight - clientHeight;
        const pct = maxScroll > 0 ? scrollTop / maxScroll : 0;
        const { scrollHeight: pH, clientHeight: pCH } = previewRef.current;
        previewRef.current.scrollTop = pct * (pH - pCH);
      } else {
        const firstLine = Math.max(0, Math.round(textareaRef.current.scrollTop / lineHRef.current));
        let idx = 0;
        for (let i = 0; i < sourceBlocks.length; i++) {
          if (sourceBlocks[i] <= firstLine) idx = i;
          else break;
        }
        const target = kids[Math.min(idx, kids.length - 1)];
        previewRef.current.scrollTop = Math.max(0, target.offsetTop - 16);
      }
    } else if (source === 'preview' && previewRef.current && textareaRef.current) {
      if (kids.length === 0 || sourceBlocks.length === 0) {
        const { scrollTop, scrollHeight, clientHeight } = previewRef.current;
        const maxScroll = scrollHeight - clientHeight;
        const pct = maxScroll > 0 ? scrollTop / maxScroll : 0;
        const { scrollHeight: eH, clientHeight: eCH } = textareaRef.current;
        textareaRef.current.scrollTop = pct * (eH - eCH);
      } else {
        const top = previewRef.current.scrollTop + 16;
        let idx = 0;
        for (let i = 0; i < kids.length; i++) {
          if (kids[i].offsetTop <= top) idx = i;
          else break;
        }
        const line = sourceBlocks[Math.min(idx, sourceBlocks.length - 1)];
        textareaRef.current.scrollTop = line * lineHRef.current;
      }
    }

    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  };

  const handleInsertTOC = () => {
    const headings = content.match(/^#{1,3} .+/gm) || [];
    if (headings.length === 0) return;

    const toc = headings
      .map((h) => {
        const level = h.match(/^(#+)/)?.[1].length ?? 1;
        const title = h.replace(/^#+\s/, '');
        const anchor = title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        const indent = '  '.repeat(level - 1);
        return `${indent}- [${title}](#${anchor})`;
      })
      .join('\n');

    const tocBlock = `## Table of Contents\n\n${toc}\n\n`;
    updateDocumentContent(documentId, tocBlock + content);
  };

  const slashMatches = (query: string) =>
    SLASH_COMMANDS.filter((c) => c.name.startsWith(query.toLowerCase()));

  const checkSlash = (value: string, cursor: number) => {
    const lineStart = value.lastIndexOf('\n', cursor - 1) + 1;
    const before = value.slice(lineStart, cursor);
    const m = before.match(/^\/(\w*)$/);
    if (m && slashMatches(m[1]).length > 0) {
      setSlash({ query: m[1], lineStart });
      setSlashIndex(0);
    } else {
      setSlash(null);
    }
  };

  const applySlash = (def: SlashDef) => {
    const el = textareaRef.current;
    if (!el || !slash) return;
    const cursor = el.selectionStart;
    if (def.name === 'toc') {
      const cleaned = content.slice(0, slash.lineStart) + content.slice(cursor);
      const headings = cleaned.match(/^#{1,3} .+/gm) || [];
      if (headings.length === 0) {
        updateDocumentContent(documentId, cleaned);
      } else {
        const toc = headings
          .map((h) => {
            const level = h.match(/^(#+)/)?.[1].length ?? 1;
            const title = h.replace(/^#+\s/, '');
            const anchor = title.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
            return `${'  '.repeat(level - 1)}- [${title}](#${anchor})`;
          })
          .join('\n');
        updateDocumentContent(documentId, cleaned.slice(0, slash.lineStart) + `## Table of Contents\n\n${toc}\n\n` + cleaned.slice(slash.lineStart));
      }
    } else {
      const next = content.slice(0, slash.lineStart) + def.text + content.slice(cursor);
      updateDocumentContent(documentId, next);
      const pos = slash.lineStart + (def.cursor ?? def.text.length);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(pos, pos);
      }, 0);
    }
    setSlash(null);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-dark-surface)] overflow-hidden">
      {/* Editor Sub-Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] select-none text-xs">
        {/* Formatting Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleInsert('**', '**', 'bold text')}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Bold (Cmd+B)"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => handleInsert('*', '*', 'italic text')}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Italic (Cmd+I)"
          >
            <Italic size={14} />
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <button
            onClick={() => handleInsert('# ', '', 'Heading 1')}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Heading 1"
          >
            <Heading1 size={14} />
          </button>
          <button
            onClick={() => handleInsert('## ', '', 'Heading 2')}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Heading 2"
          >
            <Heading2 size={14} />
          </button>
          <button
            onClick={() => handleInsert('### ', '', 'Heading 3')}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Heading 3"
          >
            <Heading3 size={14} />
          </button>
          <div className="w-[1px] h-4 bg-white/10 mx-1" />
          <button
            onClick={() => handleInsert('[', '](https://example.com)', 'Link title')}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Insert Link"
          >
            <Link size={14} />
          </button>
          <button
            onClick={() => handleInsert('```\n', '\n```', 'code here')}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Code Block"
          >
            <Code size={14} />
          </button>
          <button
            onClick={() => handleInsert('\n| Column 1 | Column 2 |\n| :--- | :--- |\n| Data 1 | Data 2 |\n')}
            className="p-1.5 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors"
            title="Insert Table"
          >
            <Table size={14} />
          </button>
          <button
            onClick={handleInsertTOC}
            className="px-2 py-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white font-mono text-[11px] transition-colors"
            title="Insert Table of Contents"
          >
            TOC
          </button>
          <button
            onClick={() => handleInsert('$$\n', '\n$$', 'E = mc^2')}
            className="px-2 py-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white font-mono text-[11px] transition-colors"
            title="Insert KaTeX Math"
          >
            KaTeX
          </button>
          <button
            onClick={() => setPaperMode(!paperMode)}
            className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
              paperMode
                ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold'
                : 'hover:bg-white/10 text-[var(--text-muted)] hover:text-white'
            }`}
            title="Toggle paper canvas for preview"
          >
            Paper
          </button>
        </div>

        {/* View Switchers & Stats */}
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-dim)] text-[11px]">
            {content.trim().split(/\s+/).filter(Boolean).length} words
          </span>

          <div className="flex bg-black/40 p-0.5 rounded border border-white/10">
            <button
              onClick={() => currentTab && setTabActiveView(currentTab.id, 'editor')}
              className={`p-1 px-2 rounded-md flex items-center gap-1 transition-all ${
                activeView === 'editor' ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Editor View"
            >
              <Edit3 size={13} />
              <span>Raw</span>
            </button>
            <button
              onClick={() => currentTab && setTabActiveView(currentTab.id, 'split')}
              className={`p-1 px-2 rounded-md flex items-center gap-1 transition-all ${
                activeView === 'split' ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Split View"
            >
              <Columns size={13} />
              <span>Split</span>
            </button>
            <button
              onClick={() => currentTab && setTabActiveView(currentTab.id, 'preview')}
              className={`p-1 px-2 rounded-md flex items-center gap-1 transition-all ${
                activeView === 'preview' ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Preview View"
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Source Textarea */}
        {(activeView === 'editor' || activeView === 'split') && (
          <div className={`h-full overflow-hidden flex flex-col relative ${activeView === 'split' ? 'w-1/2 border-r border-[var(--border-subtle)]' : 'w-full'}`}>
            {slash && slashMatches(slash.query).length > 0 && (
              <div className="absolute top-2 left-3 z-20 w-56 bg-[var(--bg-dark-elevated)] border border-[var(--border-subtle)] rounded-md shadow-2xl py-1 animate-modal">
                {slashMatches(slash.query).map((cmd, idx) => (
                  <button
                    key={cmd.name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySlash(cmd);
                    }}
                    onMouseEnter={() => setSlashIndex(idx)}
                    className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs transition-colors ${
                      slashIndex === idx ? 'bg-sky-500/15 text-white' : 'text-zinc-300'
                    }`}
                  >
                    <span className="font-mono text-sky-300">/{cmd.name}</span>
                    <span className="text-zinc-500">{cmd.hint}</span>
                  </button>
                ))}
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => {
                updateDocumentContent(documentId, e.target.value);
                checkSlash(e.target.value, e.target.selectionStart);
              }}
              onScroll={() => syncScroll('editor')}
              onSelect={(e) => {
                handleSelection();
                const el = e.target as HTMLTextAreaElement;
                checkSlash(el.value, el.selectionStart);
              }}
              onMouseUp={handleSelection}
              onKeyUp={handleSelection}
              onKeyDown={(e) => {
                if (!slash) return;
                const matches = slashMatches(slash.query);
                if (matches.length === 0) return;
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                  e.preventDefault();
                  e.stopPropagation();
                  setSlashIndex((i) => (e.key === 'ArrowDown' ? (i + 1) % matches.length : (i - 1 + matches.length) % matches.length));
                } else if (e.key === 'Enter') {
                  e.preventDefault();
                  e.stopPropagation();
                  applySlash(matches[slashIndex] || matches[0]);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  e.stopPropagation();
                  setSlash(null);
                }
              }}
              placeholder="Write your Markdown here..."
              className="w-full h-full p-6 bg-transparent text-[var(--text-main)] font-mono text-sm leading-relaxed resize-none outline-none overflow-y-auto selection:bg-sky-500/40"
              spellCheck={false}
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(activeView === 'preview' || activeView === 'split') && (
          <div
            ref={previewRef}
            onScroll={() => syncScroll('preview')}
            onMouseUp={handleSelection}
            onKeyUp={handleSelection}
            data-canvas={paperMode ? 'paper' : undefined}
            className={`h-full overflow-y-auto p-8 bg-[var(--bg-dark-base)] ${activeView === 'split' ? 'w-1/2' : 'w-full'}`}
          >
            <div
              className="doc-prose max-w-3xl mx-auto"
              style={{ minHeight: '100%' }}
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
