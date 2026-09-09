import React, { useState } from 'react';
import {
  X,
  Building2,
  Plus,
  KeyRound,
  Copy,
  Check,
  Share2,
  Trash2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  FolderOpen
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { encodeWorkspaceInvite, decodeWorkspaceInvite } from '../../services/teamSyncService';
import type { WorkspaceInvitePayload } from '../../types/team';

interface WorkspaceManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'share' | 'create' | 'join' | 'manage';
}

export const WorkspaceManagerModal: React.FC<WorkspaceManagerModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'manage'
}) => {
  const {
    teamWorkspaces,
    activeWorkspaceId,
    createTeamWorkspace,
    switchTeamWorkspace,
    deleteTeamWorkspace,
    importTeamWorkspace,
    workspaceRules,
    teamMembers,
    kanbanBoard
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'share' | 'create' | 'join' | 'manage'>(initialTab);

  // Create state
  const [newWsName, setNewWsName] = useState('');
  const [newWsDesc, setNewWsDesc] = useState('');

  // Join state
  const [inviteInput, setInviteInput] = useState('');
  const [previewPayload, setPreviewPayload] = useState<WorkspaceInvitePayload | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  if (!isOpen) return null;

  const currentWs = teamWorkspaces[activeWorkspaceId] || {
    id: activeWorkspaceId,
    name: workspaceRules.teamName || 'Active Workspace',
    code: 'OMNI-CORE',
    description: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    members: teamMembers,
    workspaceRules,
    kanbanBoard
  };

  const inviteToken = encodeWorkspaceInvite({
    ...currentWs,
    members: teamMembers,
    workspaceRules,
    kanbanBoard
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;
    createTeamWorkspace(newWsName.trim(), newWsDesc.trim());
    setNewWsName('');
    setNewWsDesc('');
    onClose();
  };

  const handleInspectInvite = () => {
    setJoinError(null);
    if (!inviteInput.trim()) return;
    const res = decodeWorkspaceInvite(inviteInput.trim());
    if (!res.valid || !res.payload) {
      setJoinError(res.error || 'Invalid invite code format');
      setPreviewPayload(null);
    } else {
      setPreviewPayload(res.payload);
    }
  };

  const handleConfirmJoin = () => {
    if (!previewPayload) return;
    importTeamWorkspace(previewPayload);
    setInviteInput('');
    setPreviewPayload(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-[var(--bg-dark-surface)] rounded border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-black/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-sky-500/20 text-sky-400">
              <Building2 size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Team Workspaces</h3>
              <p className="text-[11px] text-zinc-400">
                Manage, create, or join shared document planning workspaces
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-5 pt-3 border-b border-[var(--border-subtle)] bg-[var(--bg-dark-surface)] flex items-center gap-2 shrink-0 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('manage')}
            className={`pb-2.5 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'manage'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Workspaces ({Object.keys(teamWorkspaces).length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`pb-2.5 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'share'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Share Code
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'create'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            + Create
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('join')}
            className={`pb-2.5 px-2 border-b-2 font-medium transition-colors cursor-pointer ${
              activeTab === 'join'
                ? 'border-sky-400 text-white'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Join with Code
          </button>
        </div>

        {/* Tab Viewport */}
        <div className="p-5 overflow-y-auto space-y-4 bg-[var(--bg-dark-base)] flex-1">
          {/* Tab 1: Workspaces List */}
          {activeTab === 'manage' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  Available Workspaces
                </span>
                <button
                  onClick={() => setActiveTab('create')}
                  className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 cursor-pointer"
                >
                  <Plus size={13} />
                  <span>New Workspace</span>
                </button>
              </div>

              <div className="space-y-2">
                {Object.values(teamWorkspaces).map((ws) => {
                  const isActive = ws.id === activeWorkspaceId;
                  return (
                    <div
                      key={ws.id}
                      className={`p-3 rounded border transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-sky-500/10 border-sky-500/40 shadow-sm'
                          : 'bg-[var(--bg-dark-surface)] border-[var(--border-subtle)] hover:border-[var(--border-medium)]'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{ws.name}</span>
                          <span className="px-1.5 py-0.2 rounded bg-black/40 border border-white/10 text-[9px] font-mono text-sky-300">
                            {ws.code}
                          </span>
                          {isActive && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[9px] font-mono">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        {ws.description && (
                          <p className="text-[11px] text-zinc-400 truncate mt-0.5">{ws.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {!isActive ? (
                          <button
                            onClick={() => switchTeamWorkspace(ws.id)}
                            className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <span>Switch</span>
                            <ArrowRight size={12} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setActiveTab('share')}
                            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                            title="Share workspace invite code"
                          >
                            <Share2 size={14} />
                          </button>
                        )}

                        {Object.keys(teamWorkspaces).length > 1 && (
                          <button
                            onClick={() => deleteTeamWorkspace(ws.id)}
                            className="p-1.5 rounded text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete workspace"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tab 2: Share Invite Code */}
          {activeTab === 'share' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded bg-[var(--bg-dark-surface)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono">
                      Workspace Reference
                    </span>
                    <h4 className="text-sm font-semibold text-white">{currentWs.name}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 font-mono text-xs font-bold">
                      {currentWs.code}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(currentWs.code);
                        setCopiedCode(true);
                        setTimeout(() => setCopiedCode(false), 2000);
                      }}
                      className="p-1 rounded text-zinc-400 hover:text-white cursor-pointer"
                      title="Copy code"
                    >
                      {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
                  <div className="flex items-center justify-between text-xs text-zinc-400">
                    <span>Full Self-Contained Invite Passkey:</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteToken);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      className="flex items-center gap-1 text-sky-400 hover:text-sky-300 cursor-pointer text-xs"
                    >
                      {copiedToken ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>{copiedToken ? 'Copied' : 'Copy Passkey'}</span>
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={inviteToken}
                    rows={4}
                    className="w-full p-2.5 rounded bg-black/60 border border-[var(--border-subtle)] text-[10px] font-mono text-zinc-300 select-all focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded bg-sky-500/10 border border-sky-500/20 flex items-start gap-2.5 text-xs text-sky-200">
                <ShieldCheck size={16} className="text-sky-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Teammates can paste this passkey in <strong className="text-white">Join with Code</strong> to immediately receive your team guidelines, roster, and active planning cards.
                </p>
              </div>
            </div>
          )}

          {/* Tab 3: Create Workspace */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Workspace Name
                </label>
                <input
                  type="text"
                  value={newWsName}
                  onChange={(e) => setNewWsName(e.target.value)}
                  placeholder="e.g. Q4 Research Sprint"
                  autoFocus
                  className="w-full px-3 py-2 rounded bg-black/50 border border-[var(--border-subtle)] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Focus / Mission Description <span className="text-zinc-500 font-normal">(Optional)</span>
                </label>
                <input
                  type="text"
                  value={newWsDesc}
                  onChange={(e) => setNewWsDesc(e.target.value)}
                  placeholder="e.g. Document review and paper writing collaboration"
                  className="w-full px-3 py-2 rounded bg-black/50 border border-[var(--border-subtle)] text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="submit"
                disabled={!newWsName.trim()}
                className="w-full py-2 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] disabled:opacity-40 text-[var(--text-on-accent)] font-semibold text-xs transition-colors cursor-pointer shadow-sm"
              >
                Create & Switch Workspace
              </button>
            </form>
          )}

          {/* Tab 4: Join Workspace */}
          {activeTab === 'join' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 block">
                  Paste Workspace Passkey or Invite Token
                </label>
                <textarea
                  value={inviteInput}
                  onChange={(e) => {
                    setInviteInput(e.target.value);
                    setPreviewPayload(null);
                    setJoinError(null);
                  }}
                  placeholder="Paste the passkey provided by your teammate here..."
                  rows={4}
                  className="w-full p-2.5 rounded bg-black/50 border border-[var(--border-subtle)] text-xs text-zinc-300 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={handleInspectInvite}
                  disabled={!inviteInput.trim()}
                  className="w-full py-1.5 rounded bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white text-xs font-medium transition-colors cursor-pointer"
                >
                  Verify Invite Code
                </button>
              </div>

              {joinError && (
                <div className="p-3 rounded bg-red-950/30 border border-red-500/30 flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle size={15} className="text-red-400 shrink-0" />
                  <span>{joinError}</span>
                </div>
              )}

              {previewPayload && (
                <div className="p-3.5 rounded bg-[var(--bg-dark-surface)] border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-mono font-semibold">
                        Ready to Join
                      </span>
                      <h4 className="text-sm font-semibold text-white">{previewPayload.name}</h4>
                      {previewPayload.description && (
                        <p className="text-[11px] text-zinc-400">{previewPayload.description}</p>
                      )}
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-xs">
                      {previewPayload.code}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-400 pt-2 border-t border-[var(--border-subtle)]">
                    <div>Members: <strong className="text-white">{previewPayload.members.length}</strong></div>
                    <div>Tasks: <strong className="text-white">{Object.keys(previewPayload.kanbanBoard.cards).length}</strong></div>
                    <div>Tone: <strong className="text-white">{previewPayload.workspaceRules.editorialTone}</strong></div>
                    <div>Level: <strong className="text-white">{previewPayload.workspaceRules.targetReadingLevel}</strong></div>
                  </div>

                  <button
                    type="button"
                    onClick={handleConfirmJoin}
                    className="w-full py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors cursor-pointer shadow-sm"
                  >
                    Confirm & Join Workspace
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
