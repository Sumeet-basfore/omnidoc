import React, { useState } from 'react';
import {
  Kanban,
  MessageSquare,
  Shield,
  Users,
  FileText,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  CornerDownRight,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { KanbanBoardView } from '../Kanban/KanbanBoardView';
import { WorkspaceRulesSettings } from '../Settings/WorkspaceRulesSettings';
import type { TeamHubSubTab } from '../../types/team';

export const TeamHubView: React.FC = () => {
  const {
    teamHubSubTab,
    setTeamHubSubTab,
    setMainView,
    workspaceRules,
    comments,
    documents,
    tabs,
    setActiveTab,
    resolveComment,
    deleteComment,
    teamMembers,
    addTeamMember,
    removeTeamMember
  } = useAppStore();

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberColor, setNewMemberColor] = useState('#6366f1');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Compute total open comments across all documents
  const allComments = Object.entries(comments).flatMap(([docId, docComments]) =>
    docComments.map((c) => ({ ...c, docId }))
  );
  const openComments = allComments.filter((c) => c.status === 'open');

  const handleJumpToDoc = (docId: string) => {
    const targetTab = tabs.find((t) => t.documentId === docId);
    if (targetTab) {
      setActiveTab(targetTab.id);
    }
    setMainView('studio');
  };

  const handleCreateMember = () => {
    if (!newMemberName.trim()) return;
    addTeamMember({
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Contributor',
      color: newMemberColor
    });
    setNewMemberName('');
    setNewMemberRole('');
    setIsAddingMember(false);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0a0c12] text-zinc-200 overflow-hidden select-none">
      {/* Team Hub Top Navigation Bar */}
      <div className="h-12 px-4 border-b border-[var(--border-subtle)] bg-[#121622] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users size={15} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs text-white leading-none">
                  {workspaceRules.teamName || 'Team Workspace'}
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-[9px] font-mono text-indigo-300 border border-indigo-500/30 uppercase">
                  Team Hub
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono">
                {teamMembers.length} members · {openComments.length} active reviews
              </span>
            </div>
          </div>

          {/* Sub-Tab Navigation */}
          <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/10 text-xs ml-4">
            <button
              onClick={() => setTeamHubSubTab('planning')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                teamHubSubTab === 'planning'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Kanban size={13} />
              <span>Planning</span>
            </button>

            <button
              onClick={() => setTeamHubSubTab('reviews')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                teamHubSubTab === 'reviews'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <MessageSquare size={13} />
              <span>Review Inbox</span>
              {openComments.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500 text-[10px] font-mono font-bold text-white">
                  {openComments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setTeamHubSubTab('guidelines')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                teamHubSubTab === 'guidelines'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Shield size={13} />
              <span>Guidelines</span>
            </button>

            <button
              onClick={() => setTeamHubSubTab('roster')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors cursor-pointer ${
                teamHubSubTab === 'roster'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Users size={13} />
              <span>Roster</span>
            </button>
          </div>
        </div>

        {/* Back to Studio Button */}
        <button
          onClick={() => setMainView('studio')}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-white/10 hover:bg-white/15 text-white text-xs font-medium transition-colors cursor-pointer"
          title="Return to document editing"
        >
          <FileText size={13} />
          <span>Back to Studio</span>
        </button>
      </div>

      {/* Main Sub-Tab Viewport */}
      <div className="flex-1 overflow-hidden relative">
        {teamHubSubTab === 'planning' && <KanbanBoardView />}

        {teamHubSubTab === 'reviews' && (
          <div className="h-full overflow-y-auto p-6 max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Workspace Review Inbox</h2>
                <p className="text-xs text-zinc-400">
                  Aggregated review threads, questions, and annotations across all documents
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-mono">
                {openComments.length} Unresolved
              </span>
            </div>

            {allComments.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                  <MessageSquare size={20} />
                </div>
                <h3 className="text-sm font-medium text-zinc-300">No review comments yet</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                  Highlight text in any document and click "Comment" to leave notes for your team.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {allComments.map((comment) => {
                  const doc = documents[comment.docId];
                  const isResolved = comment.status === 'resolved';

                  return (
                    <div
                      key={comment.id}
                      className={`p-4 rounded-lg border transition-all ${
                        isResolved
                          ? 'border-white/5 bg-black/20 opacity-60'
                          : 'border-white/10 bg-[#121622] hover:border-indigo-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => resolveComment(comment.docId, comment.id, !isResolved)}
                            className="text-zinc-500 hover:text-emerald-400 transition-colors cursor-pointer"
                            title={isResolved ? 'Reopen review' : 'Mark resolved'}
                          >
                            {isResolved ? (
                              <CheckCircle2 size={16} className="text-emerald-400" />
                            ) : (
                              <Circle size={16} />
                            )}
                          </button>

                          <span className="font-semibold text-xs text-zinc-200">
                            {comment.author}
                          </span>

                          <span className="text-[10px] text-zinc-500 font-mono">
                            {new Date(comment.createdAt).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>

                          {doc && (
                            <button
                              onClick={() => handleJumpToDoc(doc.id)}
                              className="flex items-center gap-1 px-2 py-0.5 rounded bg-sky-950/40 border border-sky-500/20 text-[10px] text-sky-300 hover:text-white transition-colors cursor-pointer"
                              title="Open document in studio"
                            >
                              <FileText size={10} className="text-sky-400" />
                              <span>{doc.name}</span>
                              <ExternalLink size={9} />
                            </button>
                          )}
                        </div>

                        <button
                          onClick={() => deleteComment(comment.docId, comment.id)}
                          className="text-zinc-600 hover:text-red-400 transition-colors p-1 cursor-pointer"
                          title="Delete thread"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Quoted highlight */}
                      {comment.highlightedText && (
                        <blockquote className="p-2 rounded bg-black/40 border-l-2 border-indigo-400 text-xs text-zinc-400 italic mb-2 font-mono">
                          "{comment.highlightedText}"
                        </blockquote>
                      )}

                      {/* Comment Body */}
                      <p className={`text-xs text-zinc-200 leading-relaxed ${isResolved ? 'line-through text-zinc-400' : ''}`}>
                        {comment.content}
                      </p>

                      {/* Replies Counter */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            <CornerDownRight size={11} className="text-indigo-400" />
                            {comment.replies.length} repl{comment.replies.length === 1 ? 'y' : 'ies'}
                          </span>
                          {doc && (
                            <button
                              onClick={() => handleJumpToDoc(doc.id)}
                              className="text-indigo-400 hover:text-indigo-300 font-medium text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <span>View in Editor</span>
                              <ChevronRight size={12} />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {teamHubSubTab === 'guidelines' && (
          <div className="h-full overflow-y-auto p-6 max-w-2xl mx-auto">
            <div className="bg-[#121622] rounded-lg border border-white/10 overflow-hidden shadow-xl">
              <WorkspaceRulesSettings />
            </div>
          </div>
        )}

        {teamHubSubTab === 'roster' && (
          <div className="h-full overflow-y-auto p-6 max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Team Roster & Members</h2>
                <p className="text-xs text-zinc-400">
                  Contributors and reviewers with attributed roles across comments and tasks
                </p>
              </div>

              <button
                onClick={() => setIsAddingMember((prev) => !prev)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer shadow-sm"
              >
                <Plus size={13} />
                <span>Add Teammate</span>
              </button>
            </div>

            {/* Add Member Composer */}
            {isAddingMember && (
              <div className="p-4 rounded-lg bg-[#121622] border border-indigo-500/40 space-y-3 animate-fade-in shadow-lg">
                <h3 className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                  Add New Team Member
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      placeholder="e.g. Sarah Connor"
                      className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Role / Job Title</label>
                    <input
                      type="text"
                      value={newMemberRole}
                      onChange={(e) => setNewMemberRole(e.target.value)}
                      placeholder="e.g. Senior Reviewer"
                      className="w-full px-2.5 py-1.5 rounded bg-black/40 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-400">Accent Color:</span>
                    <input
                      type="color"
                      value={newMemberColor}
                      onChange={(e) => setNewMemberColor(e.target.value)}
                      className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsAddingMember(false)}
                      className="px-3 py-1 rounded hover:bg-white/10 text-zinc-400 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleCreateMember}
                      disabled={!newMemberName.trim()}
                      className="px-3.5 py-1 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 text-white font-medium text-xs cursor-pointer shadow-sm"
                    >
                      Save Member
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Members List */}
            {teamMembers.length === 0 ? (
              <div className="py-16 text-center border border-dashed border-white/10 rounded-lg bg-black/20">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center text-zinc-500">
                  <Users size={20} />
                </div>
                <h3 className="text-sm font-medium text-zinc-300">No team members yet</h3>
                <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto mb-4">
                  Add team members to assign tasks, attribute reviews, and coordinate guidelines across documents.
                </p>
                <button
                  onClick={() => setIsAddingMember(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  <Plus size={13} />
                  <span>Add First Teammate</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="p-3 rounded-lg bg-[#121622] border border-white/10 flex items-center justify-between gap-3 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        style={{ backgroundColor: member.color }}
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-xs shadow"
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">{member.name}</span>
                          {member.isCurrentUser && (
                            <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 border border-indigo-500/30 text-[9px] font-mono text-indigo-300">
                              YOU
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-zinc-400">{member.role}</span>
                      </div>
                    </div>

                    {!member.isCurrentUser && (
                      <button
                        onClick={() => removeTeamMember(member.id)}
                        className="p-1 rounded text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
