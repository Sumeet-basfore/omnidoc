import React, { useState } from 'react';
import {
  MessageSquare,
  X,
  CheckCircle2,
  Circle,
  Trash2,
  Send,
  Sparkles,
  Download,
  Plus,
  CornerDownRight,
  MessageSquarePlus,
  Loader2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { callAI } from '../../services/aiService';
import { keyService } from '../../services/keyService';
import { downloadBlob } from '../../services/exportService';
import { PERSONA_LABELS } from '../../services/personas';
import type { DocumentComment } from '../../types/comment';

export const CommentsPanel: React.FC = () => {
  const {
    isCommentsPanelOpen,
    toggleCommentsPanel,
    activeCommentId,
    setActiveCommentId,
    comments,
    addComment,
    addReply,
    resolveComment,
    deleteComment,
    deleteReply,
    tabs,
    activeTabId,
    documents,
    selectedText,
    setSelectedText,
    activeProvider,
    activePersona,
    aiConfigs,
    customInstructions,
    workspaceRules
  } = useAppStore();

  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [authorName, setAuthorName] = useState<string>('You');
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [isDrafting, setIsDrafting] = useState<boolean>(false);
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [aiLoadingCommentId, setAiLoadingCommentId] = useState<string | null>(null);

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  if (!isCommentsPanelOpen) return null;

  const docComments: DocumentComment[] = (activeDoc && comments[activeDoc.id]) || [];

  const openCount = docComments.filter((c) => c.status === 'open').length;
  const resolvedCount = docComments.filter((c) => c.status === 'resolved').length;

  const filteredComments = docComments.filter((c) => {
    if (filter === 'open') return c.status === 'open';
    if (filter === 'resolved') return c.status === 'resolved';
    return true;
  });

  const handleStartNewComment = () => {
    setIsDrafting(true);
  };

  const handlePostComment = () => {
    if (!activeDoc || !newCommentText.trim()) return;
    const highlight = selectedText.trim() || 'Document Selection';
    addComment(activeDoc.id, highlight, newCommentText.trim(), authorName.trim() || 'You');
    setNewCommentText('');
    setIsDrafting(false);
    setSelectedText('', null);
  };

  const handleCancelDraft = () => {
    setIsDrafting(false);
    setNewCommentText('');
  };

  const handlePostReply = (commentId: string) => {
    const text = (replyInputs[commentId] || '').trim();
    if (!activeDoc || !text) return;
    addReply(activeDoc.id, commentId, text, authorName.trim() || 'You', false);
    setReplyInputs((prev) => ({ ...prev, [commentId]: '' }));
  };

  const handleAskOmni = async (comment: DocumentComment) => {
    if (!activeDoc || aiLoadingCommentId) return;
    const config = aiConfigs[activeProvider];
    const key = (await keyService.get(activeProvider as any)) || '';

    setAiLoadingCommentId(comment.id);
    try {
      const prompt = `You are Omni (${PERSONA_LABELS[activePersona] || activePersona}). A team member left a review comment on this passage:

HIGHLIGHTED PASSAGE:
"""
${comment.highlightedText}
"""

REVIEW COMMENT / QUESTION:
"""
${comment.content}
"""

Provide your expert critique, answer, or recommendation directly and concisely.`;

      const replyText = await callAI(
        [{ id: `ask-${Date.now()}`, role: 'user', content: prompt, timestamp: Date.now() }],
        config,
        key,
        activePersona,
        {
          name: activeDoc.name,
          format: activeDoc.format,
          content: activeDoc.content,
          selectedText: comment.highlightedText
        },
        customInstructions,
        workspaceRules
      );

      addReply(activeDoc.id, comment.id, replyText.trim(), `Omni (${PERSONA_LABELS[activePersona]})`, true);
    } catch (err: any) {
      console.error('Failed to get Omni reply:', err);
      addReply(
        activeDoc.id,
        comment.id,
        `⚠️ Omni failed to respond: ${err?.message || 'Unknown error'}`,
        'Omni (Error)',
        true
      );
    } finally {
      setAiLoadingCommentId(null);
    }
  };

  const handleExportComments = () => {
    if (!activeDoc || docComments.length === 0) return;
    const data = {
      document: activeDoc.name,
      exportedAt: new Date().toISOString(),
      comments: docComments
    };
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    downloadBlob(jsonBlob, `${activeDoc.name}.comments.json`);
  };

  return (
    <aside className="w-[360px] h-full flex flex-col bg-[#121622] border-l border-[var(--border-subtle)] z-20 select-none animate-fade-in text-xs">
      {/* Panel Header */}
      <div className="h-12 px-3 border-b border-[var(--border-subtle)] flex items-center justify-between bg-black/20 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
            <MessageSquare size={14} />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-200 text-xs leading-none">Review Threads</h2>
            <span className="text-[10px] text-zinc-500 font-mono">
              {openCount} open · {resolvedCount} resolved
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {docComments.length > 0 && (
            <button
              onClick={handleExportComments}
              className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Export comments to .json sidecar"
            >
              <Download size={13} />
            </button>
          )}
          <button
            onClick={() => toggleCommentsPanel(false)}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors"
            title="Close Comments Panel"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Author Header */}
      <div className="p-2 border-b border-[var(--border-subtle)] bg-black/10 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5 text-[11px]">
          <button
            onClick={() => setFilter('open')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'open' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Open ({openCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'resolved' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-2 py-0.5 rounded transition-colors ${
              filter === 'all' ? 'bg-indigo-600 text-white font-medium shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({docComments.length})
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-500 font-mono">As:</span>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your Name"
            className="w-16 px-1.5 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] text-zinc-300 font-medium focus:outline-none focus:border-indigo-500"
            title="Your author display name in threads"
          />
        </div>
      </div>

      {/* Active Selection Callout / Draft Composer */}
      {(isDrafting || (selectedText && selectedText.length > 0)) && (
        <div className="p-3 border-b border-indigo-500/30 bg-indigo-500/10 shrink-0">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
              <MessageSquarePlus size={12} /> New Thread on Selection
            </span>
            <button
              onClick={handleCancelDraft}
              className="text-zinc-400 hover:text-zinc-200 transition-colors"
              title="Cancel"
            >
              <X size={12} />
            </button>
          </div>

          <blockquote className="p-2 rounded bg-black/40 border-l-2 border-indigo-500 text-[11px] text-zinc-300 italic line-clamp-3 mb-2 font-mono">
            "{selectedText || 'Active Document Section'}"
          </blockquote>

          <textarea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handlePostComment();
              }
            }}
            placeholder="Write your review comment, question, or note... (⌘Enter to post)"
            className="w-full h-16 p-2 rounded bg-black/40 border border-white/10 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 resize-none font-sans"
            autoFocus
          />

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              onClick={handleCancelDraft}
              className="px-2.5 py-1 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 text-[11px] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handlePostComment}
              disabled={!newCommentText.trim()}
              className="px-3 py-1 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 text-white font-medium text-[11px] transition-all cursor-pointer shadow-sm"
            >
              Post Comment
            </button>
          </div>
        </div>
      )}

      {/* Comment Threads List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {!isDrafting && !selectedText && (
          <button
            onClick={handleStartNewComment}
            className="w-full py-2 px-3 rounded-lg border border-dashed border-white/15 hover:border-indigo-500/50 bg-black/20 hover:bg-indigo-500/5 text-zinc-400 hover:text-indigo-300 flex items-center justify-center gap-1.5 transition-all text-xs font-medium cursor-pointer"
          >
            <Plus size={13} />
            <span>Add General Document Comment</span>
          </button>
        )}

        {filteredComments.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
              <MessageSquare size={18} />
            </div>
            <p className="text-zinc-400 font-medium text-xs">No {filter !== 'all' ? filter : ''} comments</p>
            <p className="text-[11px] text-zinc-600 mt-1 max-w-[240px] mx-auto">
              Highlight any text in the editor and click "Comment" to leave a review note for your team.
            </p>
          </div>
        ) : (
          filteredComments.map((comment) => {
            const isResolved = comment.status === 'resolved';
            const isActive = activeCommentId === comment.id;

            return (
              <div
                key={comment.id}
                onClick={() => setActiveCommentId(comment.id)}
                className={`rounded-lg border transition-all p-3 ${
                  isActive
                    ? 'border-indigo-500 bg-[#161b2b] shadow-md'
                    : isResolved
                    ? 'border-white/5 bg-black/20 opacity-70 hover:opacity-100'
                    : 'border-white/10 bg-[#161a26] hover:border-white/20'
                }`}
              >
                {/* Comment Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (activeDoc) resolveComment(activeDoc.id, comment.id, !isResolved);
                      }}
                      className="text-zinc-400 hover:text-emerald-400 transition-colors p-0.5 cursor-pointer"
                      title={isResolved ? 'Re-open thread' : 'Mark as resolved'}
                    >
                      {isResolved ? (
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      ) : (
                        <Circle size={14} className="text-zinc-500 hover:text-emerald-400" />
                      )}
                    </button>
                    <span className="font-semibold text-zinc-200 text-xs">{comment.author}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {new Date(comment.createdAt).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (activeDoc) deleteComment(activeDoc.id, comment.id);
                    }}
                    className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                    title="Delete thread"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>

                {/* Highlighted Quote */}
                {comment.highlightedText && (
                  <div className="p-1.5 rounded bg-black/40 border-l-2 border-indigo-400 text-[10px] text-zinc-400 italic line-clamp-2 mb-2 font-mono">
                    "{comment.highlightedText}"
                  </div>
                )}

                {/* Main Comment Text */}
                <p className={`text-zinc-200 text-xs leading-relaxed select-text ${isResolved ? 'line-through text-zinc-400' : ''}`}>
                  {comment.content}
                </p>

                {/* Thread Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/5 space-y-2">
                    {comment.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-2 rounded text-xs select-text ${
                          reply.isAI
                            ? 'bg-indigo-950/30 border border-indigo-500/20 text-indigo-100'
                            : 'bg-black/30 border border-white/5 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <CornerDownRight size={11} className="text-zinc-500 shrink-0" />
                            {reply.isAI ? (
                              <span className="font-medium text-[11px] text-indigo-300 flex items-center gap-1">
                                <Sparkles size={11} className="text-pink-400" />
                                {reply.author}
                              </span>
                            ) : (
                              <span className="font-medium text-[11px] text-zinc-300">{reply.author}</span>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              if (activeDoc) deleteReply(activeDoc.id, comment.id, reply.id);
                            }}
                            className="text-zinc-600 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                            title="Delete reply"
                          >
                            <X size={11} />
                          </button>
                        </div>
                        <p className="text-[11px] text-zinc-300 leading-relaxed pl-3 whitespace-pre-wrap">
                          {reply.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Composer & Omni AI Action */}
                {!isResolved && (
                  <div className="mt-3 pt-2 border-t border-white/5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={replyInputs[comment.id] || ''}
                        onChange={(e) =>
                          setReplyInputs((prev) => ({ ...prev, [comment.id]: e.target.value }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handlePostReply(comment.id);
                          }
                        }}
                        placeholder="Reply to thread..."
                        className="flex-1 px-2.5 py-1 rounded bg-black/40 border border-white/10 text-zinc-200 text-xs placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        onClick={() => handlePostReply(comment.id)}
                        disabled={!(replyInputs[comment.id] || '').trim()}
                        className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white transition-colors cursor-pointer"
                        title="Send reply (Enter)"
                      >
                        <Send size={12} />
                      </button>
                    </div>

                    {/* Ask Omni Button */}
                    <button
                      onClick={() => handleAskOmni(comment)}
                      disabled={aiLoadingCommentId === comment.id}
                      className="self-start flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 disabled:opacity-40 transition-colors py-0.5 cursor-pointer font-medium"
                      title="Ask Omni AI companion to review or answer this thread"
                    >
                      {aiLoadingCommentId === comment.id ? (
                        <>
                          <Loader2 size={11} className="animate-spin" />
                          <span>Omni is reviewing...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} className="text-pink-400" />
                          <span>Ask Omni ({PERSONA_LABELS[activePersona] || 'AI'})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
