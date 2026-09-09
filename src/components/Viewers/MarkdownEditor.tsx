import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import { Bold, Italic, Heading1, Heading2, Heading3, Code, Link, Table, Sparkles, Eye, Columns, Edit3 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface MarkdownEditorProps {
  documentId: string;
  content: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ documentId, content }) => {
  const { updateDocumentContent, tabs, activeTabId, setTabActiveView, setSelectedText, toggleAIDrawer } = useAppStore();
  const currentTab = tabs.find((t) => t.id === activeTabId);
  const activeView = (currentTab?.activeView as 'editor' | 'preview' | 'split') || 'split';

  const [renderedHtml, setRenderedHtml] = useState<string>('');
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

  return (
    <div className="flex flex-col h-full w-full bg-[#0d1017] overflow-hidden">
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
            onClick={() => handleInsert('$$\n', '\n$$', 'E = mc^2')}
            className="px-2 py-1 rounded hover:bg-white/10 text-[var(--text-muted)] hover:text-white font-mono text-[11px] transition-colors"
            title="Insert KaTeX Math"
          >
            KaTeX
          </button>
        </div>

        {/* View Switchers & Stats */}
        <div className="flex items-center gap-3">
          <span className="text-[var(--text-dim)] text-[11px]">
            {content.trim().split(/\s+/).filter(Boolean).length} words
          </span>

          <div className="flex bg-black/40 p-0.5 rounded-lg border border-white/10">
            <button
              onClick={() => currentTab && setTabActiveView(currentTab.id, 'editor')}
              className={`p-1 px-2 rounded-md flex items-center gap-1 transition-all ${
                activeView === 'editor' ? 'bg-[var(--accent-primary)] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Editor View"
            >
              <Edit3 size={13} />
              <span>Raw</span>
            </button>
            <button
              onClick={() => currentTab && setTabActiveView(currentTab.id, 'split')}
              className={`p-1 px-2 rounded-md flex items-center gap-1 transition-all ${
                activeView === 'split' ? 'bg-[var(--accent-primary)] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Split View"
            >
              <Columns size={13} />
              <span>Split</span>
            </button>
            <button
              onClick={() => currentTab && setTabActiveView(currentTab.id, 'preview')}
              className={`p-1 px-2 rounded-md flex items-center gap-1 transition-all ${
                activeView === 'preview' ? 'bg-[var(--accent-primary)] text-white font-medium' : 'text-zinc-400 hover:text-zinc-200'
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
          <div className={`h-full overflow-hidden flex flex-col ${activeView === 'split' ? 'w-1/2 border-r border-[var(--border-subtle)]' : 'w-full'}`}>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => updateDocumentContent(documentId, e.target.value)}
              onSelect={handleSelection}
              onMouseUp={handleSelection}
              onKeyUp={handleSelection}
              placeholder="Write your Markdown here..."
              className="w-full h-full p-6 bg-transparent text-[var(--text-main)] font-mono text-sm leading-relaxed resize-none outline-none overflow-y-auto selection:bg-indigo-500/40"
              spellCheck={false}
            />
          </div>
        )}

        {/* Live Preview Pane */}
        {(activeView === 'preview' || activeView === 'split') && (
          <div
            ref={previewRef}
            onMouseUp={handleSelection}
            onKeyUp={handleSelection}
            className={`h-full overflow-y-auto p-8 bg-[var(--bg-dark-surface)]/50 ${activeView === 'split' ? 'w-1/2' : 'w-full'}`}
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
