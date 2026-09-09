import React, { useState, useRef } from 'react';
import { Search, Globe, FileText, ExternalLink, Plus, AlertCircle, Loader2, X, History } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { runDeepResearch, ResearchProgress } from '../../services/searchService';
import { keyService } from '../../services/keyService';
import { DeepResearchResult, DeepResearchQuery, SearchResult } from '../../types/ai';

interface PastReport {
  result: DeepResearchResult;
  at: number;
}

const STAGES: Array<ResearchProgress['stage']> = ['plan', 'search', 'synthesize', 'verify'];

const STAGE_LABEL: Record<string, string> = {
  plan: 'Plan',
  search: 'Search',
  synthesize: 'Synthesize',
  verify: 'Verify'
};

export const DeepResearchPanel: React.FC = () => {
  const { activeProvider, aiConfigs, openDocument, queueInsert, tabs, activeTabId, documents, toggleSidebar, setLeftPanel, logUsage } =
    useAppStore();

  const [topic, setTopic] = useState<string>('');
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [includeCitations, setIncludeCitations] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [progress, setProgress] = useState<ResearchProgress | null>(null);
  const [result, setResult] = useState<DeepResearchResult | null>(null);
  const [reports, setReports] = useState<PastReport[]>([]);
  const [partialSources, setPartialSources] = useState<SearchResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  const handleStartResearch = async () => {
    if (!topic.trim() || isSearching) return;

    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setIsSearching(true);
    setError(null);
    setResult(null);
    setPartialSources(null);
    setProgress({ stage: 'plan', searched: 0, total: 0 });

    try {
      const tavilyKey = await keyService.get('tavily');
      const exaKey = await keyService.get('exa');
      const aiKey = (await keyService.get(activeProvider as any)) || '';
      const aiConfig = aiConfigs[activeProvider];

      if (!aiKey && activeProvider !== 'custom') {
        throw new Error(
          `AI Key for ${aiConfig.name} is missing. Configure it in Settings to enable research synthesis.`
        );
      }

      const query: DeepResearchQuery = {
        topic: topic.trim(),
        depth,
        includeCitations
      };

      const res = await runDeepResearch(query, { tavilyKey, exaKey }, aiConfig, aiKey, {
        signal: ctrl.signal,
        onProgress: setProgress,
        onUsage: (u) =>
          logUsage({ provider: activeProvider, model: aiConfig.model, inTok: u.in, outTok: u.out })
      });

      setResult(res);
      setReports((prev) => [{ result: res, at: Date.now() }, ...prev].slice(0, 10));
    } catch (err: any) {
      const aborted = err?.aborted || err?.name === 'AbortError' || ctrl.signal.aborted;
      if (aborted && Array.isArray(err?.partialSources) && err.partialSources.length > 0) {
        setPartialSources(err.partialSources);
        setError(null);
      } else if (!aborted) {
        console.error('Deep research failed:', err);
        setError(err.message || 'Research synthesis encountered an unexpected error.');
      } else {
        setError(null);
      }
    } finally {
      abortRef.current = null;
      setIsSearching(false);
      setProgress(null);
    }
  };

  const handleCancel = () => {
    abortRef.current?.abort();
  };

  const handleOpenAsDocument = () => {
    if (!result) return;
    const slug = result.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30) || 'Research';
    const taken = new Set(Object.values(documents).map((d) => d.name));
    let filename = `Research_${slug}.md`;
    for (let v = 2; taken.has(filename); v++) {
      filename = `Research_${slug}_v${v}.md`;
    }

    openDocument({
      id: `doc-${Date.now()}`,
      name: filename,
      format: 'markdown',
      content: `# ${result.title}\n\n${result.markdownContent}`,
      isDirty: true
    });
  };

  const handleInsertIntoActive = () => {
    if (!result || !activeDoc) return;
    if (activeDoc.format !== 'markdown' && activeDoc.format !== 'text' && activeDoc.format !== 'code') return;
    queueInsert(activeDoc.id, `# Research: ${result.title}\n\n${result.markdownContent}`, 'Deep research');
  };

  const stageIndex = (s: ResearchProgress['stage']): number => {
    if (s === 'done') return STAGES.length;
    return STAGES.indexOf(s);
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-dark-surface)] select-none">
      {/* Research Configuration Header */}
      <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
            Research Topic or Question
          </label>
          <div className="relative flex items-center">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleStartResearch();
              }}
              placeholder="e.g. Current state of Quantum Computing 2026..."
              className="w-full pl-8 pr-3 py-2 bg-[var(--bg-dark-surface)] border border-white/10 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
            <Search size={14} className="absolute left-2.5 text-zinc-400" />
          </div>
        </div>

        {/* Options Row */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">Depth:</span>
            <div className="flex bg-black/40 p-0.5 rounded border border-white/10">
              {(['quick', 'standard', 'deep'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDepth(d)}
                  title={
                    d === 'quick'
                      ? 'One search round, fast brief'
                      : d === 'standard'
                        ? 'Plan → parallel sub-searches → per-section synthesis'
                        : 'Standard + gap-analysis follow-up round'
                  }
                  className={`px-2 py-0.5 rounded capitalize text-[11px] transition-all ${
                    depth === d
                      ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer text-zinc-300 text-[11px]">
            <input
              type="checkbox"
              checked={includeCitations}
              onChange={(e) => setIncludeCitations(e.target.checked)}
              className="rounded bg-zinc-800 border-zinc-700 text-sky-600 focus:ring-0"
            />
            <span>Citations</span>
          </label>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartResearch}
          disabled={!topic.trim() || isSearching}
          className="w-full py-2 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-30 text-[var(--text-on-accent)] font-semibold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          {isSearching ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Researching…</span>
            </>
          ) : (
            <>
              <Globe size={14} />
              <span>Start Deep Web Research</span>
            </>
          )}
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 select-text">
        {/* Staged progress */}
        {isSearching && progress && (
          <div className="p-3 bg-[var(--bg-dark-surface)] border border-white/10 rounded-md space-y-2 select-none">
            {STAGES.map((s, i) => {
              const active = stageIndex(progress.stage) === i;
              const doneStage = stageIndex(progress.stage) > i;
              return (
                <div key={s} className="flex items-center gap-2 text-[11px]">
                  {doneStage ? (
                    <span className="text-emerald-400 font-mono w-4">✓</span>
                  ) : active ? (
                    <Loader2 size={12} className="animate-spin text-sky-400 shrink-0" />
                  ) : (
                    <span className="text-zinc-600 font-mono w-4">·</span>
                  )}
                  <span className={doneStage ? 'text-zinc-400' : active ? 'text-zinc-200' : 'text-zinc-600'}>
                    {STAGE_LABEL[s]}
                    {s === 'search' && progress.total > 0 && (
                      <span className="font-mono text-zinc-500"> {progress.searched}/{progress.total}</span>
                    )}
                  </span>
                  {active && progress.note && (
                    <span className="text-zinc-500 truncate">— {progress.note}</span>
                  )}
                </div>
              );
            })}
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 mt-1 px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-zinc-300 text-[11px] transition-colors"
            >
              <X size={11} />
              <span>Cancel (keeps sources found so far)</span>
            </button>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-md space-y-2 text-xs text-red-200">
            <div className="flex items-center gap-2 font-medium text-red-300">
              <AlertCircle size={15} />
              <span>Research Failed</span>
            </div>
            <p className="text-[11px] text-red-200/90">{error}</p>
            <button
              onClick={() => {
                toggleSidebar(true);
                setLeftPanel('settings');
              }}
              className="text-[11px] underline text-red-300 hover:text-white"
            >
              Configure Tavily & Exa API Keys
            </button>
          </div>
        )}

        {/* Partial sources after cancel */}
        {!result && partialSources && partialSources.length > 0 && (
          <div className="p-3 bg-amber-950/30 border border-amber-500/30 rounded-md space-y-2">
            <div className="text-[11px] font-medium text-amber-200">
              Cancelled — {partialSources.length} source{partialSources.length === 1 ? '' : 's'} retrieved first
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {partialSources.map((s, idx) => (
                <a
                  key={idx}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block p-1.5 rounded hover:bg-white/5 text-[11px] transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate max-w-[240px] text-sky-300 group-hover:text-sky-200">
                      {s.title}
                    </span>
                    <ExternalLink size={10} className="text-zinc-500 group-hover:text-zinc-300" />
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate">{s.snippet}</p>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Result view */}
        {result && (
          <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex items-center gap-2 select-none">
              <button
                onClick={handleOpenAsDocument}
                className="flex-1 py-1.5 px-3 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] text-xs font-medium flex items-center justify-center gap-1.5 transition-all shadow"
              >
                <FileText size={13} />
                <span>Open as New Tab</span>
              </button>
              {activeDoc &&
                (activeDoc.format === 'markdown' ||
                  activeDoc.format === 'text' ||
                  activeDoc.format === 'code') && (
                <button
                  onClick={handleInsertIntoActive}
                  className="py-1.5 px-3 rounded bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                  title="Queue for review before inserting"
                >
                  <Plus size={13} />
                  <span>Insert Here</span>
                </button>
              )}
            </div>

            {result.modelOnly && (
              <div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-md text-[11px] text-amber-200">
                Model knowledge only — no live sources. Add Tavily or Exa keys for web research.
              </div>
            )}

            {(result.unverifiedRemoved || 0) > 0 && (
              <div className="text-[10px] font-mono text-zinc-500 select-none">
                {result.unverifiedRemoved} unverified claim{result.unverifiedRemoved === 1 ? '' : 's'} de-linked during verification
              </div>
            )}

            {/* Sources list */}
            {result.sources.length > 0 && (
              <div className="p-3 bg-[var(--bg-dark-surface)] border border-white/10 rounded-md space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-medium text-cyan-300 select-none">
                  <Globe size={13} />
                  <span>Verified Web Sources ({result.sources.length})</span>
                </div>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {result.sources.map((s, idx) => (
                    <a
                      key={idx}
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block p-1.5 rounded hover:bg-white/5 text-[11px] text-zinc-300 hover:text-white transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate max-w-[240px] text-sky-300 group-hover:text-sky-200">
                          {s.title}
                        </span>
                        <ExternalLink size={10} className="text-zinc-500 group-hover:text-zinc-300" />
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate">{s.snippet}</p>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Report Content Preview */}
            <div className="p-4 bg-[var(--bg-dark-surface)] border border-white/10 rounded-md text-xs leading-relaxed whitespace-pre-wrap doc-prose">
              {result.markdownContent}
            </div>
          </div>
        )}

        {/* Session history */}
        {!result && !isSearching && !error && reports.length > 0 && (
          <div className="space-y-1.5 select-none">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-zinc-400 px-1">
              <History size={12} />
              <span>This session</span>
            </div>
            {reports.map((r, i) => (
              <button
                key={i}
                onClick={() => setResult(r.result)}
                className="w-full text-left p-2 rounded bg-white/[0.02] hover:bg-white/5 border border-white/5 transition-colors"
              >
                <div className="text-xs text-zinc-200 truncate">{r.result.title}</div>
                <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  {new Date(r.at).toLocaleTimeString()} · {r.result.sources.length} sources
                  {r.result.modelOnly ? ' · model only' : ''}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!result && !isSearching && !error && reports.length === 0 && !partialSources && (
          <div className="flex flex-col items-center justify-center h-52 text-center text-zinc-500 select-none">
            <Globe size={32} className="text-zinc-600 mb-2" />
            <p className="text-xs">Enter a topic above to launch a Deep Web Research report.</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Quick briefs instantly · Standard plans + parallel search · Deep adds gap analysis
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
