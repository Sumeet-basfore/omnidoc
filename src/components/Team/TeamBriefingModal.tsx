import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  FileText,
  Sparkles,
  Download,
  Copy,
  Printer,
  Check,
  Loader2,
  Eye,
  Code
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { generateMarkdownBriefing, generateAiSprintBriefing } from '../../services/briefingService';
import { downloadBlob } from '../../services/exportService';

interface TeamBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamBriefingModal: React.FC<TeamBriefingModalProps> = ({ isOpen, onClose }) => {
  const {
    workspaceRules,
    teamMembers,
    kanbanBoard,
    comments,
    documents,
    activeProvider,
    activePersona,
    aiConfigs,
    customInstructions
  } = useAppStore();

  const [aiSummary, setAiSummary] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'preview' | 'markdown'>('preview');

  const briefingMarkdown = useMemo(() => {
    return generateMarkdownBriefing({
      workspaceRules,
      teamMembers,
      kanbanBoard,
      comments,
      documents,
      aiExecutiveSummary: aiSummary || undefined
    });
  }, [workspaceRules, teamMembers, kanbanBoard, comments, documents, aiSummary]);

  if (!isOpen) return null;

  const handleGenerateAiSummary = async () => {
    setIsGeneratingAi(true);
    setAiError(null);
    try {
      const summary = await generateAiSprintBriefing({
        workspaceRules,
        teamMembers,
        kanbanBoard,
        comments,
        documents,
        activeProvider,
        activePersona,
        aiConfigs,
        customInstructions
      });
      setAiSummary(summary);
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI Briefing generation failed');
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(briefingMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMd = () => {
    const blob = new Blob([briefingMarkdown], { type: 'text/markdown;charset=utf-8' });
    const cleanTeamName = (workspaceRules.teamName || 'team')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    downloadBlob(blob, `${cleanTeamName}-briefing-${new Date().toISOString().slice(0, 10)}.md`);
  };

  const handlePrintPdf = async () => {
    if (window.electronAPI?.printToPDF) {
      const pdfBytes = await window.electronAPI.printToPDF();
      if (pdfBytes) {
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        downloadBlob(blob, `team-briefing-${new Date().toISOString().slice(0, 10)}.pdf`);
      }
    } else {
      window.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-3xl h-[85vh] bg-[#121622] rounded-lg border border-white/10 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-white/10 flex items-center justify-between bg-black/30 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-indigo-500/20 text-indigo-400">
              <FileText size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Team Sprint & Review Briefing</h3>
              <p className="text-[11px] text-zinc-400">
                Executive summary of team tasks, unresolved document reviews, and rules
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-black/40 rounded p-0.5 border border-white/10 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer text-xs ${
                  viewMode === 'preview'
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Eye size={12} />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('markdown')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded transition-colors cursor-pointer text-xs ${
                  viewMode === 'markdown'
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Code size={12} />
                <span>Markdown</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 py-2.5 border-b border-white/5 bg-[#161b2a] flex flex-wrap items-center justify-between gap-2 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerateAiSummary}
              disabled={isGeneratingAi}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-pink-950/40 hover:bg-pink-900/50 border border-pink-500/30 text-pink-300 hover:text-white font-medium transition-all cursor-pointer disabled:opacity-40 shadow-sm"
              title="Generate 3-paragraph executive sprint analysis using Omni AI"
            >
              {isGeneratingAi ? (
                <>
                  <Loader2 size={13} className="animate-spin text-pink-400" />
                  <span>Synthesizing Briefing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={13} className="text-pink-400" />
                  <span>{aiSummary ? 'Regenerate AI Analysis' : 'Synthesize AI Analysis'}</span>
                </>
              )}
            </button>

            {aiError && (
              <span className="text-[11px] text-red-400 max-w-xs truncate">{aiError}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Copy markdown to clipboard"
            >
              {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>

            <button
              onClick={handleDownloadMd}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white transition-colors cursor-pointer"
              title="Download as Markdown file"
            >
              <Download size={13} />
              <span>Download .md</span>
            </button>

            <button
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors cursor-pointer shadow-sm"
              title="Print or export to PDF"
            >
              <Printer size={13} />
              <span>Export PDF</span>
            </button>
          </div>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#0a0c12]">
          {viewMode === 'markdown' ? (
            <div className="relative">
              <pre className="p-4 rounded-lg bg-black/60 border border-white/10 font-mono text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed select-text">
                {briefingMarkdown}
              </pre>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-6 text-zinc-200">
              {/* Document Header */}
              <div className="border-b border-white/10 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-semibold">
                    OmniDoc Workspace Briefing
                  </span>
                  <span className="text-xs font-mono text-zinc-500">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
                <h1 className="text-xl font-bold text-white mt-1">
                  {workspaceRules.teamName || 'Workspace Overview'}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-zinc-400">
                  <span>{teamMembers.length} Members</span>
                  <span>·</span>
                  <span>{Object.keys(kanbanBoard.cards).length} Tasks</span>
                  <span>·</span>
                  <span>
                    {
                      Object.values(comments)
                        .flat()
                        .filter((c) => c.status === 'open').length
                    }{' '}
                    Open Reviews
                  </span>
                </div>
              </div>

              {/* AI Executive Summary Card */}
              {aiSummary ? (
                <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-indigo-300">
                    <Sparkles size={14} className="text-pink-400" />
                    <h3 className="text-xs font-semibold uppercase tracking-wider">
                      Omni AI Executive Summary
                    </h3>
                  </div>
                  <div className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">
                    {aiSummary}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-black/30 border border-dashed border-white/10 flex items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-medium text-zinc-300">AI Executive Briefing Available</h4>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      Synthesize velocity, risks, and recommended actions using configured AI provider.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateAiSummary}
                    disabled={isGeneratingAi}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-pink-950/40 hover:bg-pink-900/50 border border-pink-500/30 text-pink-300 hover:text-white text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    <Sparkles size={12} className="text-pink-400" />
                    <span>Synthesize</span>
                  </button>
                </div>
              )}

              {/* Team Roster Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Active Team Roster
                </h3>
                {teamMembers.length === 0 ? (
                  <p className="text-xs text-zinc-600 italic">No registered team members.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {teamMembers.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded bg-[#121622] border border-white/5 flex items-center gap-2.5"
                      >
                        <div
                          style={{ backgroundColor: m.color }}
                          className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[10px]"
                        >
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-white truncate">{m.name}</div>
                          <div className="text-[10px] text-zinc-400 truncate">{m.role}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sprint Workload Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Sprint Planning Matrix
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {kanbanBoard.columns.map((col) => (
                    <div
                      key={col.id}
                      className="p-3 rounded bg-[#121622] border border-white/5 text-center space-y-1"
                    >
                      <div className="text-lg font-bold text-white font-mono">
                        {col.cardIds.length}
                      </div>
                      <div className="text-[11px] text-zinc-400">{col.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Guidelines Badges */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Workspace Style Standards
                </h3>
                <div className="p-3 rounded bg-[#121622] border border-white/5 space-y-2 text-xs">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[11px]">
                      Tone: {workspaceRules.editorialTone}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px]">
                      Level: {workspaceRules.targetReadingLevel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px]">
                      Citations: {workspaceRules.citationStyle}
                    </span>
                  </div>
                  {workspaceRules.prohibitedTerms.length > 0 && (
                    <div className="text-[11px] text-zinc-400">
                      <span className="text-zinc-500">Banned terms: </span>
                      {workspaceRules.prohibitedTerms.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/30 flex items-center justify-between shrink-0 text-xs text-zinc-400">
          <span>Ready for sprint sync, GitHub issues, and team check-ins</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/15 text-white font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
