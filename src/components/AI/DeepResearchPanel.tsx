import React, { useState } from 'react';
import { Search, Globe, FileText, ExternalLink, Sparkles, Check, Plus, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { runDeepResearch } from '../../services/searchService';
import { keyService } from '../../services/keyService';
import { DeepResearchResult, DeepResearchQuery } from '../../types/ai';

export const DeepResearchPanel: React.FC = () => {
  const { activeProvider, aiConfigs, openDocument, queueInsert, tabs, activeTabId, documents, setSettingsOpen } =
    useAppStore();

  const [topic, setTopic] = useState<string>('');
  const [depth, setDepth] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [includeCitations, setIncludeCitations] = useState<boolean>(true);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [result, setResult] = useState<DeepResearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  const handleStartResearch = async () => {
    if (!topic.trim() || isSearching) return;

    setIsSearching(true);
    setError(null);
    setResult(null);
    setStatusMessage('Connecting to web search engines (Tavily & Exa)...');

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

      setStatusMessage('Fetching live search results & source snippets...');
      const query: DeepResearchQuery = {
        topic: topic.trim(),
        depth,
        includeCitations
      };

      const res = await runDeepResearch(
        query,
        { tavilyKey, exaKey },
        aiConfig,
        aiKey
      );

      setStatusMessage('Research synthesis complete!');
      setResult(res);
    } catch (err: any) {
      console.error('Deep research failed:', err);
      setError(err.message || 'Research synthesis encountered an unexpected error.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleOpenAsDocument = () => {
    if (!result) return;
    const docId = `doc-${Date.now()}`;
    const filename = `Research_${result.title.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}.md`;

    openDocument({
      id: docId,
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
              <span>Synthesizing Live Research...</span>
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
        {/* Progress indicator */}
        {isSearching && (
          <div className="p-4 bg-sky-950/30 border border-sky-500/20 rounded-md space-y-2 select-none">
            <div className="flex items-center gap-2 text-sky-300 text-xs font-medium">
              <Loader2 size={16} className="animate-spin text-cyan-400" />
              <span>{statusMessage}</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              OmniDoc Studio is crawling high-relevance web sources and feeding structured findings into
              your active AI model for deep synthesis.
            </p>
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
              onClick={() => setSettingsOpen(true)}
              className="text-[11px] underline text-red-300 hover:text-white"
            >
              Configure Tavily & Exa API Keys
            </button>
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

        {/* Empty state */}
        {!result && !isSearching && !error && (
          <div className="flex flex-col items-center justify-center h-52 text-center text-zinc-500 select-none">
            <Globe size={32} className="text-zinc-600 mb-2" />
            <p className="text-xs">Enter a topic above to launch a Deep Web Research report.</p>
            <p className="text-[10px] text-zinc-600 mt-1">
              Supports Tavily & Exa AI live search feeds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
