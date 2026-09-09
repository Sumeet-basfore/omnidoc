import React, { useState, useEffect, useMemo, useRef } from 'react';
import { codeToHtml } from 'shiki';
import { Copy, Check, WrapText, Sparkles, Code2, Search } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface CodeViewerProps {
  documentId: string;
  name: string;
  content: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({ documentId, name, content }) => {
  const { addChatMessage, toggleAIDrawer, setSelectedText } = useAppStore();
  const [copied, setCopied] = useState<boolean>(false);
  const [wordWrap, setWordWrap] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [highlightedHtml, setHighlightedHtml] = useState<string>('');
  const codeContainerRef = useRef<HTMLDivElement>(null);

  // Detect language from file extension
  const detectedLang = useMemo(() => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    const map: Record<string, string> = {
      js: 'javascript',
      jsx: 'javascript',
      ts: 'typescript',
      tsx: 'typescript',
      py: 'python',
      rb: 'ruby',
      rs: 'rust',
      go: 'go',
      java: 'java',
      c: 'c',
      cpp: 'cpp',
      cs: 'csharp',
      html: 'html',
      xml: 'xml',
      css: 'css',
      scss: 'scss',
      json: 'json',
      yaml: 'yaml',
      yml: 'yaml',
      sh: 'bash',
      sql: 'sql'
    };
    return map[ext] || 'plaintext';
  }, [name]);

  const lines = useMemo(() => content.split('\n'), [content]);

  useEffect(() => {
    let cancelled = false;
    const highlight = async () => {
      try {
        const html = await codeToHtml(content, {
          lang: detectedLang === 'plaintext' ? 'text' : detectedLang,
          theme: 'one-dark-pro'
        });
        if (!cancelled) setHighlightedHtml(html);
      } catch {
        // If lang unsupported, fall back to plain text render
        if (!cancelled) setHighlightedHtml('');
      }
    };
    highlight();
    return () => {
      cancelled = true;
    };
  }, [content, detectedLang]);

  // Highlight matching lines when searching in Shiki output
  useEffect(() => {
    if (!codeContainerRef.current) return;
    const wrapper = codeContainerRef.current.querySelector('.shiki-wrapper');
    if (!wrapper) return;

    const codeLines = wrapper.querySelectorAll('.line');
    codeLines.forEach((lineEl) => {
      const text = lineEl.textContent || '';
      if (searchQuery && text.toLowerCase().includes(searchQuery.toLowerCase())) {
        (lineEl as HTMLElement).style.backgroundColor = 'rgba(234, 179, 8, 0.25)';
        (lineEl as HTMLElement).style.borderRadius = '2px';
      } else {
        (lineEl as HTMLElement).style.backgroundColor = '';
      }
    });
  }, [searchQuery, highlightedHtml]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAIExplain = (mode: 'explain' | 'summary' | 'bugs') => {
    let prompt = '';
    if (mode === 'explain') {
      prompt = `Please explain the architecture, design patterns, and functionality of this code file (${name}):\n\n\`\`\`${detectedLang}\n${content.slice(0, 8000)}\n\`\`\``;
    } else if (mode === 'summary') {
      prompt = `Please provide a high-level summary of the logic and key functions in this code file (${name}):\n\n\`\`\`${detectedLang}\n${content.slice(0, 8000)}\n\`\`\``;
    } else {
      prompt = `Review this code for potential edge-case bugs, performance bottlenecks, or security flaws:\n\n\`\`\`${detectedLang}\n${content.slice(0, 8000)}\n\`\`\``;
    }

    addChatMessage({
      role: 'user',
      content: prompt
    });
    toggleAIDrawer(true);
  };

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

  return (
    <div className="flex flex-col h-full w-full bg-[#0a0c12] overflow-hidden select-none">
      {/* Code Sub-Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[11px]">
            <Code2 size={13} />
            <span>{detectedLang.toUpperCase()}</span>
          </div>

          <div className="relative flex items-center">
            <Search size={13} className="absolute left-2.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Find in file..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-7 pr-2 py-1 bg-black/30 border border-white/10 rounded-md text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 w-36"
            />
          </div>

          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1 px-2 rounded flex items-center gap-1 transition-colors ${
              wordWrap ? 'bg-white/20 text-white' : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText size={13} />
            <span>Wrap</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Code Actions */}
          <button
            onClick={() => handleAIExplain('explain')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-600/40 transition-all text-xs"
          >
            <Sparkles size={12} className="text-pink-400" />
            <span>Explain File</span>
          </button>
          <button
            onClick={() => handleAIExplain('summary')}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-xs"
          >
            <span>Summarize Logic</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-all text-xs ml-2"
          >
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Viewer Body */}
      <div
        ref={codeContainerRef}
        onMouseUp={handleSelection}
        onKeyUp={handleSelection}
        className="flex-1 overflow-auto bg-[#0a0c12] p-4 font-mono text-xs leading-relaxed select-text"
      >
        <div className="flex min-w-full">
          {/* Line Numbers */}
          <div className="select-none pr-4 text-right text-zinc-600 border-r border-white/5 font-mono text-[11px] w-12 shrink-0">
            {lines.map((_, i) => (
              <div key={i} className="h-5">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Body (Shiki Syntax Highlighted or Fallback) */}
          {highlightedHtml ? (
            <div
              className={`shiki-wrapper pl-4 flex-1 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          ) : (
            <div className={`pl-4 flex-1 ${wordWrap ? 'whitespace-pre-wrap break-all' : 'whitespace-pre'}`}>
              {lines.map((line, i) => {
                const isMatch = searchQuery && line.toLowerCase().includes(searchQuery.toLowerCase());
                return (
                  <div
                    key={i}
                    className={`h-5 font-mono ${isMatch ? 'bg-yellow-500/20 text-yellow-200' : 'text-zinc-300'}`}
                  >
                    {line || ' '}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
