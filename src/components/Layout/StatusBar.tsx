import React, { useEffect, useState } from 'react';
import { Check, Loader2, Cpu } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

function docStat(name: string, format: string, content: string): string {
  try {
    if (format === 'csv') {
      const rows = content.split(/\r?\n/).filter((l) => l.trim()).length;
      return `${Math.max(0, rows - 1)} rows`;
    }
    if (format === 'json') {
      const parsed = JSON.parse(content || 'null');
      if (Array.isArray(parsed)) return `${parsed.length} items`;
      if (parsed && typeof parsed === 'object') return `${Object.keys(parsed).length} keys`;
      return 'JSON';
    }
    if (format === 'pdf' || format === 'docx') return format.toUpperCase();
    const text = format === 'docx' ? content.replace(/<[^>]*>/g, ' ') : content;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    return `${words} word${words === 1 ? '' : 's'}`;
  } catch {
    return format.toUpperCase();
  }
}

export const StatusBar: React.FC = () => {
  const {
    tabs,
    activeTabId,
    documents,
    lastSavedAt,
    activeProvider,
    aiConfigs,
    isAILoading,
    pendingInserts,
    sessionUsage,
    usageLog,
    dailyTokenAlert,
    toggleSidebar,
    setLeftPanel
  } = useAppStore();

  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    if (lastSavedAt === null) return;
    setShowSaved(true);
    const timer = setTimeout(() => setShowSaved(false), 1500);
    return () => clearTimeout(timer);
  }, [lastSavedAt]);

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const activeDoc = currentTab ? documents[currentTab.documentId] : null;
  const config = aiConfigs[activeProvider];
  const pendingCount = activeDoc ? (pendingInserts[activeDoc.id] || []).length : 0;
  const sessionK = (sessionUsage.in + sessionUsage.out) / 1000;
  const dayStart = (() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  })();
  const todayTok = usageLog.reduce(
    (a, e) => a + (e.t >= dayStart ? e.inTok + e.outTok : 0),
    0
  );
  const budgetHit = dailyTokenAlert > 0 && todayTok >= dailyTokenAlert;

  return (
    <footer className="h-6 border-t border-[var(--border-subtle)] bg-[var(--bg-dark-surface)] px-3 flex items-center justify-between text-[11px] select-none shrink-0">
      {/* Left: document state */}
      <div className="flex items-center gap-2 text-zinc-500 min-w-0">
        {activeDoc ? (
          <>
            <span className="truncate max-w-[220px] text-zinc-400">{activeDoc.name}</span>
            {showSaved ? (
              <span className="flex items-center gap-1 text-emerald-400">
                <Check size={11} />
                <span>Saved</span>
              </span>
            ) : activeDoc.isDirty ? (
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                <span>Unsaved</span>
              </span>
            ) : null}
            <span className="text-zinc-600">·</span>
            <span className="font-mono">{docStat(activeDoc.name, activeDoc.format, activeDoc.content)}</span>
            {pendingCount > 0 && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="text-amber-300">{pendingCount} to review</span>
              </>
            )}
          </>
        ) : (
          <span>No document</span>
        )}
      </div>

      {/* Right: AI state */}
      <div className="flex items-center gap-3 shrink-0">
        {isAILoading && (
          <span className="flex items-center gap-1.5 text-zinc-400">
            <Loader2 size={11} className="animate-spin text-sky-400" />
            <span>Working…</span>
          </span>
        )}
        <button
          onClick={() => {
            toggleSidebar(true);
            setLeftPanel('settings');
          }}
          className="flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors"
          title={
            budgetHit
              ? `Daily usage budget reached (${todayTok.toLocaleString()} tokens) — open usage settings`
              : sessionK > 0
                ? `Configure AI provider · ~${sessionK.toFixed(1)}k tokens this chat`
                : 'Configure AI provider'
          }
        >
          {budgetHit && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
          <Cpu size={11} />
          <span className="font-mono">
            {config.name} / {config.model}
          </span>
        </button>
      </div>
    </footer>
  );
};
