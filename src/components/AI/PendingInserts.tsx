import React, { useState } from 'react';
import { Check, X, FileDiff } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

const PREVIEW_CHARS = 600;

export const PendingInserts: React.FC = () => {
  const { tabs, activeTabId, documents, pendingInserts, resolveInsert } = useAppStore();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const activeDoc = currentTab ? documents[currentTab.documentId] : null;
  if (!activeDoc) return null;
  if (activeDoc.format !== 'markdown' && activeDoc.format !== 'text' && activeDoc.format !== 'code') return null;

  const list = pendingInserts[activeDoc.id] || [];
  if (list.length === 0) return null;

  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-dark-surface)] px-4 py-2 space-y-2 max-h-56 overflow-y-auto shrink-0">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-300">
        <FileDiff size={13} />
        <span>
          {list.length} AI insertion{list.length === 1 ? '' : 's'} awaiting review
        </span>
      </div>

      {list.map((item) => {
        const isOpen = expanded[item.id];
        const truncated = item.text.length > PREVIEW_CHARS && !isOpen;
        return (
          <div
            key={item.id}
            className="rounded border border-amber-500/30 bg-black/20 p-2.5 text-xs"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-[10px] font-mono text-zinc-500 truncate">
                {item.label} · {new Date(item.timestamp).toLocaleTimeString()}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => resolveInsert(activeDoc.id, item.id, false)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] transition-colors"
                >
                  <X size={11} />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => resolveInsert(activeDoc.id, item.id, true)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] text-[11px] font-semibold transition-colors"
                >
                  <Check size={11} />
                  <span>Accept</span>
                </button>
              </div>
            </div>
            <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-zinc-300 max-h-28 overflow-y-auto">
              {truncated ? item.text.slice(0, PREVIEW_CHARS) + '…' : item.text}
            </pre>
            {item.text.length > PREVIEW_CHARS && (
              <button
                onClick={() => setExpanded((p) => ({ ...p, [item.id]: !isOpen }))}
                className="mt-1 text-[11px] text-sky-300 hover:text-white transition-colors"
              >
                {isOpen ? 'Show less' : `Show full (${item.text.length} chars)`}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
