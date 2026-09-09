import React, { useState, useEffect } from 'react';
import { Check, X, FileDiff, Sparkles, ChevronLeft, ChevronRight, Eye, Code2, CheckCheck } from 'lucide-react';
import { marked } from 'marked';
import { useAppStore } from '../../store/useAppStore';

const PREVIEW_CHARS = 1200;

export const PendingInserts: React.FC = () => {
  const { tabs, activeTabId, documents, pendingInserts, resolveInsert } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'diff' | 'markdown' | 'raw'>('diff');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const activeDoc = currentTab ? documents[currentTab.documentId] : null;

  const list = activeDoc ? pendingInserts[activeDoc.id] || [] : [];

  // Reset or clamp index when list changes
  useEffect(() => {
    if (currentIndex >= list.length && list.length > 0) {
      setCurrentIndex(list.length - 1);
    }
  }, [list.length, currentIndex]);

  // Global key listener for Cmd+Enter (Accept) and Esc (Reject) when review banner is visible
  useEffect(() => {
    if (list.length === 0 || !activeDoc) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in chat input or settings
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || (target.tagName === 'TEXTAREA' && !target.closest('main')))) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        const activeItem = list[currentIndex] || list[0];
        if (activeItem) {
          resolveInsert(activeDoc.id, activeItem.id, true);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        const activeItem = list[currentIndex] || list[0];
        if (activeItem) {
          resolveInsert(activeDoc.id, activeItem.id, false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [list, currentIndex, activeDoc, resolveInsert]);

  if (!activeDoc || list.length === 0) return null;
  if (activeDoc.format !== 'markdown' && activeDoc.format !== 'text' && activeDoc.format !== 'code') return null;

  const currentItem = list[currentIndex] || list[0];
  if (!currentItem) return null;

  const lines = currentItem.text.split('\n');
  const lineCount = lines.length;
  const isTruncated = currentItem.text.length > PREVIEW_CHARS && !isExpanded;

  const handleAcceptAll = () => {
    // Process all pending proposals for this document
    [...list].forEach((item) => {
      resolveInsert(activeDoc.id, item.id, true);
    });
  };

  const handleRejectAll = () => {
    [...list].forEach((item) => {
      resolveInsert(activeDoc.id, item.id, false);
    });
  };

  return (
    <div className="border-b border-indigo-500/30 bg-[#121622] px-4 py-2.5 shadow-2xl z-20 select-none animate-slide-down">
      {/* Top Header Strip */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Indicator & Multi-item navigation */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <Sparkles size={13} className="text-pink-400" />
            <span>Omni Proposal</span>
          </div>

          <span className="text-xs text-zinc-300 font-medium truncate max-w-xs">
            {currentItem.label || 'Proposed Insertion'}
          </span>

          <span className="text-[11px] font-mono text-emerald-400 px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30">
            +{lineCount} line{lineCount === 1 ? '' : 's'}
          </span>

          <span className="text-[10px] font-mono text-zinc-500 hidden sm:inline">
            {new Date(currentItem.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>

          {/* Multi-Proposal Navigator */}
          {list.length > 1 && (
            <div className="flex items-center gap-1 ml-2 bg-black/40 px-2 py-0.5 rounded-md border border-white/10 text-[11px] text-zinc-400 font-mono">
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="hover:text-white disabled:opacity-30 p-0.5 transition-colors"
                title="Previous Proposal"
              >
                <ChevronLeft size={12} />
              </button>
              <span>
                {currentIndex + 1} of {list.length}
              </span>
              <button
                onClick={() => setCurrentIndex((i) => Math.min(list.length - 1, i + 1))}
                disabled={currentIndex === list.length - 1}
                className="hover:text-white disabled:opacity-30 p-0.5 transition-colors"
                title="Next Proposal"
              >
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Right: View Toggles & Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10 text-[11px]">
            <button
              onClick={() => setViewMode('diff')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'diff' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Diff View"
            >
              <FileDiff size={12} />
              <span>Diff</span>
            </button>
            <button
              onClick={() => setViewMode('markdown')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'markdown' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Rendered Markdown Preview"
            >
              <Eye size={12} />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
                viewMode === 'raw' ? 'bg-indigo-600 text-white shadow' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Raw Plain Text"
            >
              <Code2 size={12} />
              <span>Raw</span>
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 ml-1">
            <button
              onClick={() => resolveInsert(activeDoc.id, currentItem.id, false)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-950/40 hover:border-red-500/40 border border-white/10 text-zinc-300 hover:text-red-300 text-xs transition-all cursor-pointer"
              title="Reject Proposal (Esc)"
            >
              <X size={13} />
              <span>Reject</span>
              <kbd className="ml-1 px-1 py-0.2 rounded bg-white/10 text-[9px] font-mono text-zinc-400">Esc</kbd>
            </button>

            <button
              onClick={() => resolveInsert(activeDoc.id, currentItem.id, true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-semibold transition-all shadow-md cursor-pointer"
              title="Accept & Insert into Document (⌘Enter)"
            >
              <Check size={13} />
              <span>Accept</span>
              <kbd className="ml-1 px-1 py-0.2 rounded bg-black/30 text-[9px] font-mono text-indigo-100">⌘↵</kbd>
            </button>

            {list.length > 1 && (
              <button
                onClick={handleAcceptAll}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-emerald-950/40 hover:border-emerald-500/40 border border-white/10 text-emerald-300 text-xs transition-all cursor-pointer"
                title="Accept all pending proposals"
              >
                <CheckCheck size={13} />
                <span className="hidden md:inline">Accept All</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Preview Body */}
      <div className="mt-2 rounded-lg border border-white/10 bg-black/40 overflow-hidden text-xs max-h-56 overflow-y-auto">
        {viewMode === 'diff' && (
          <div className="font-mono text-[11px] leading-relaxed select-text">
            {lines.slice(0, isExpanded ? lines.length : 20).map((line, idx) => (
              <div
                key={idx}
                className="flex items-start bg-emerald-950/20 text-emerald-200 border-l-2 border-emerald-400 hover:bg-emerald-950/30 transition-colors"
              >
                <span className="w-8 px-2 py-0.5 text-[10px] text-emerald-600 select-none text-right shrink-0">
                  +{idx + 1}
                </span>
                <span className="w-4 text-emerald-500 font-bold select-none text-center shrink-0">+</span>
                <span className="py-0.5 pr-3 whitespace-pre-wrap break-all flex-1">{line || ' '}</span>
              </div>
            ))}
            {lines.length > 20 && !isExpanded && (
              <div className="p-2 text-center text-zinc-500 font-mono text-[10px] bg-black/30 border-t border-white/5">
                ... {lines.length - 20} more lines
              </div>
            )}
          </div>
        )}

        {viewMode === 'markdown' && (
          <div className="p-3 select-text bg-[#0e121c]">
            <div
              className="doc-prose text-xs text-zinc-200"
              dangerouslySetInnerHTML={{
                __html: marked.parse(
                  isTruncated ? currentItem.text.slice(0, PREVIEW_CHARS) + '\n\n*... [preview truncated]*' : currentItem.text
                ) as string
              }}
            />
          </div>
        )}

        {viewMode === 'raw' && (
          <pre className="p-3 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-300 select-text">
            {isTruncated ? currentItem.text.slice(0, PREVIEW_CHARS) + '…' : currentItem.text}
          </pre>
        )}
      </div>

      {/* Expansion Toggle if long */}
      {(currentItem.text.length > PREVIEW_CHARS || lines.length > 20) && (
        <div className="flex items-center justify-between pt-1.5 text-[11px]">
          <span className="text-zinc-500 font-mono text-[10px]">
            Total length: {currentItem.text.length} characters ({lineCount} lines)
          </span>
          <button
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors cursor-pointer"
          >
            {isExpanded ? 'Collapse preview' : 'Expand full content'}
          </button>
        </div>
      )}
    </div>
  );
};
