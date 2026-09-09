import React, { useState } from 'react';
import {
  X,
  BookOpen,
  Key,
  ExternalLink,
  Cpu,
  FileText,
  Sparkles,
  Users,
  GitBranch,
  Radio,
  Keyboard,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Search
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
}

export const UserGuideModal: React.FC<UserGuideModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'api-keys'
}) => {
  const { setLeftPanel, toggleSidebar } = useAppStore();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOpenSettings = () => {
    onClose();
    toggleSidebar(true);
    setLeftPanel('settings');
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLink(url);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const categories = [
    { id: 'api-keys', label: 'API Keys & Setup', icon: Key },
    { id: 'studio', label: 'Studio & Formats', icon: FileText },
    { id: 'ai-omni', label: 'Omni AI & Personas', icon: Sparkles },
    { id: 'team-hub', label: 'Team Hub & Planning', icon: Users },
    { id: 'git-sync', label: 'Offline Git Sync', icon: GitBranch },
    { id: 'p2p-rooms', label: 'P2P Rooms & Voice', icon: Radio },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: Keyboard }
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-4xl h-[85vh] bg-[var(--bg-dark-surface)] rounded border border-[var(--border-subtle)] shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[var(--border-subtle)] flex items-center justify-between bg-black/20 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-sky-500/20 text-sky-400">
              <BookOpen size={16} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">OmniDoc Studio User Guide</h3>
              <p className="text-[11px] text-zinc-400">
                Complete walkthrough of document features, AI keys, team planning, and P2P pairing
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

        {/* Guide Body with Left Navigation */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation Sidebar */}
          <div className="w-52 border-r border-[var(--border-subtle)] bg-[var(--bg-dark-base)] p-3 space-y-1 shrink-0 overflow-y-auto">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveTab(cat.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
                  }`}
                >
                  <Icon size={14} className={isActive ? 'text-[var(--text-on-accent)]' : 'text-zinc-400'} />
                  <span>{cat.label}</span>
                </button>
              );
            })}

            <div className="pt-4 mt-4 border-t border-[var(--border-subtle)] px-2 space-y-2">
              <button
                onClick={handleOpenSettings}
                className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                <Cpu size={12} className="text-sky-400" />
                <span>Open API Settings</span>
              </button>
            </div>
          </div>

          {/* Right Content Area */}
          <div className="flex-1 overflow-y-auto p-6 bg-[var(--bg-dark-base)] text-zinc-200 space-y-6">
            {/* 1. API Keys & Setup */}
            {activeTab === 'api-keys' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Key size={18} className="text-indigo-400" />
                    <span>How to Get & Configure AI API Keys</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    OmniDoc connects directly to your own AI provider keys. Your keys are encrypted locally via the OS Keychain (safeStorage) and are <strong>never</strong> sent to any intermediary cloud server.
                  </p>
                </div>

                {/* Provider 1: Google Gemini */}
                <div className="p-4 rounded-lg bg-[#121622] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                      <h3 className="text-sm font-semibold text-white">Google Gemini</h3>
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-medium">
                        100% Free Tier Available
                      </span>
                    </div>
                    <button
                      onClick={() => copyUrl('https://aistudio.google.com/app/apikey')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                    >
                      {copiedLink === 'https://aistudio.google.com/app/apikey' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>Copy AI Studio URL</span>
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    <strong>Recommended for most users.</strong> Google AI Studio provides a free rate limit (up to 15 RPM / 1M tokens) with zero credit card required.
                  </p>

                  <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside bg-black/30 p-3 rounded border border-white/5 leading-relaxed">
                    <li>Go to <code className="text-indigo-300 select-all">https://aistudio.google.com/app/apikey</code> and sign in with Google.</li>
                    <li>Click <strong>"Create API Key"</strong> and copy the generated key string (starts with <code className="text-zinc-300">AIzaSy...</code>).</li>
                    <li>In OmniDoc, click the <strong>Cpu</strong> icon in the top bar to open Settings.</li>
                    <li>Under <strong>Google Gemini</strong>, paste your key and click <strong>Test Key</strong>.</li>
                    <li>Click <strong>Save All Keys</strong>. You can now use Gemini 1.5 Flash for document drafting and analysis!</li>
                  </ol>
                </div>

                {/* Provider 2: Ollama / Local AI */}
                <div className="p-4 rounded-lg bg-[#121622] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <h3 className="text-sm font-semibold text-white">Ollama / Local Models</h3>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-medium">
                        Offline · Zero Cost · Complete Privacy
                      </span>
                    </div>
                    <button
                      onClick={() => copyUrl('https://ollama.com')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                    >
                      {copiedLink === 'https://ollama.com' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>Copy Ollama URL</span>
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Run models directly on your GPU/CPU with <strong>no internet connection</strong> and no API costs.
                  </p>

                  <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside bg-black/30 p-3 rounded border border-white/5 leading-relaxed">
                    <li>Download Ollama from <code className="text-indigo-300 select-all">https://ollama.com</code>.</li>
                    <li>Open your terminal and run: <code className="text-zinc-200">ollama run llama3</code> or <code className="text-zinc-200">ollama run mistral</code>.</li>
                    <li>In OmniDoc Settings, switch to <strong>Ollama / Local</strong>. The default endpoint is <code className="text-zinc-300">http://localhost:11434/v1</code>. No key required!</li>
                  </ol>
                </div>

                {/* Provider 3: Anthropic Claude */}
                <div className="p-4 rounded-lg bg-[#121622] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-400" />
                      <h3 className="text-sm font-semibold text-white">Anthropic Claude</h3>
                      <span className="px-2 py-0.5 rounded bg-white/10 text-zinc-300 text-[10px] font-mono">
                        Pay-as-you-go
                      </span>
                    </div>
                    <button
                      onClick={() => copyUrl('https://console.anthropic.com/settings/keys')}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
                    >
                      {copiedLink === 'https://console.anthropic.com/settings/keys' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      <span>Copy Console URL</span>
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Unmatched clarity for academic writing, dense contracts, and technical editing (Claude 3.5 Sonnet).
                  </p>

                  <ol className="text-xs text-zinc-400 space-y-1.5 list-decimal list-inside bg-black/30 p-3 rounded border border-white/5 leading-relaxed">
                    <li>Visit <code className="text-indigo-300 select-all">https://console.anthropic.com/settings/keys</code>.</li>
                    <li>Generate an API key (<code className="text-zinc-300">sk-ant-...</code>) and paste it into OmniDoc Settings under <strong>Anthropic Claude</strong>.</li>
                  </ol>
                </div>

                {/* Provider 4: OpenRouter & Deep Research (Tavily/Exa) */}
                <div className="p-4 rounded-lg bg-[#121622] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-400" />
                      <h3 className="text-sm font-semibold text-white">Web Search & OpenRouter</h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-zinc-300">
                    <div className="p-2.5 rounded bg-black/30 border border-white/5 space-y-1">
                      <span className="font-semibold text-indigo-300">Tavily / Exa Search</span>
                      <p className="text-[11px] text-zinc-400">
                        Get free API keys at <code className="text-zinc-300">tavily.com</code> or <code className="text-zinc-300">exa.ai</code> to power grounded web research citations.
                      </p>
                    </div>
                    <div className="p-2.5 rounded bg-black/30 border border-white/5 space-y-1">
                      <span className="font-semibold text-indigo-300">OpenRouter</span>
                      <p className="text-[11px] text-zinc-400">
                        Get an API key at <code className="text-zinc-300">openrouter.ai</code> to access hundreds of open models like DeepSeek R1 and Llama 3.3.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Studio & Formats */}
            {activeTab === 'studio' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <FileText size={18} className="text-indigo-400" />
                    <span>Studio Mode & Multi-Format Documents</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Read, annotate, and edit technical documents across formats with instant preview and split-pane viewing.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-[#121622] border border-white/10 space-y-1.5">
                    <h4 className="font-semibold text-white">PDF Viewer</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Continuous page scroll, text selection, page jumps, zoom in/out, and AI summarization of extracted page text.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#121622] border border-white/10 space-y-1.5">
                    <h4 className="font-semibold text-white">Markdown & LaTeX</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Rich syntax highlighting, inline KaTeX mathematics, mermaid diagrams, and TipTap WYSIWYG editing.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#121622] border border-white/10 space-y-1.5">
                    <h4 className="font-semibold text-white">CSV & Tabular Data</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Interactive spreadsheet grid view with cell editing, search filtering, sorting, and 1-click JSON/CSV export.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#121622] border border-white/10 space-y-1.5">
                    <h4 className="font-semibold text-white">Split-Pane Comparison</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Press <kbd className="px-1.5 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px]">Cmd+D</kbd> to split the viewport and inspect two documents side-by-side.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/20 text-xs text-indigo-200 space-y-2">
                  <h4 className="font-semibold text-white">Inline Commenting & Annotations</h4>
                  <p className="leading-relaxed">
                    Highlight any phrase or section in a document. A floating toolbar appears with <strong>Comment</strong> and <strong>Ask Omni</strong>. Comments are saved alongside the document for team peer reviews.
                  </p>
                </div>
              </div>
            )}

            {/* 3. Omni AI & Personas */}
            {activeTab === 'ai-omni' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-pink-400" />
                    <span>Omni AI Companion & 4 Personas</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Toggle the AI drawer on the right to draft, critique, research, or proofread your writing with document awareness.
                  </p>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="p-3 rounded-lg bg-[#121622] border border-white/10 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Research Partner</span>
                      <span className="px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 text-[9px] font-mono">Default</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Co-thinks with you, helps structure complex reports, and builds exploratory hypotheses.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121622] border border-white/10 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Socratic Critic</span>
                      <span className="px-1.5 py-0.2 rounded bg-red-500/20 text-red-300 text-[9px] font-mono">Review</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Plays devil's advocate, challenges weak premises, and checks for unsubstantiated claims.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121622] border border-white/10 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Proofreader</span>
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">Style</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Enforces active voice, removes conversational padding, and flags forbidden buzzwords based on your team guidelines.
                    </p>
                  </div>

                  <div className="p-3 rounded-lg bg-[#121622] border border-white/10 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Explainer</span>
                      <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[9px] font-mono">Pedagogy</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Translates complex academic jargon or formulas into clean, intuitive analogies.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Team Hub & Planning */}
            {activeTab === 'team-hub' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Users size={18} className="text-indigo-400" />
                    <span>Team Hub & Workspace Planning</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Switch between <strong>Studio</strong> and <strong>Team Hub</strong> in the top bar to coordinate planning, triage peer reviews, and manage team members.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-lg bg-[#121622] border border-white/10 space-y-1.5">
                    <h4 className="font-semibold text-white">Kanban Task Board</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Drag-and-drop tasks across Backlog, In Progress, Review, and Done. Link tasks directly to workspace files or extract tasks automatically with Omni AI.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#121622] border border-white/10 space-y-1.5">
                    <h4 className="font-semibold text-white">Review Inbox</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Aggregates all open inline comment threads across all workspace documents into one triage queue. Jump directly to any document passage with 1 click.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#121622] border border-white/10 space-y-1.5">
                    <h4 className="font-semibold text-white">Workspace Guidelines</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Enforce target reading levels, citation styles (APA, IEEE, URLs), and forbidden vocabulary chips that AI proofreaders automatically honor.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#121622] border border-white/10 space-y-1.5">
                    <h4 className="font-semibold text-white">Team Roster</h4>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">
                      Maintain a list of active reviewers and contributors with assigned accent colors and roles for attribution.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 5. Offline Git Sync */}
            {activeTab === 'git-sync' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <GitBranch size={18} className="text-indigo-400" />
                    <span>Offline Git Sync (.omnidoc/team.json)</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Collaborate with teammates without paying for cloud databases. Store team tasks and guidelines right alongside your code in Git.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#121622] border border-white/10 space-y-3 text-xs">
                  <h3 className="text-sm font-semibold text-white">Recommended Git Workflow</h3>
                  <pre className="p-3 rounded bg-black/60 font-mono text-[11px] text-zinc-300 overflow-x-auto border border-white/5 leading-relaxed">
                    <code>
{`# 1. Pull latest team updates from repo
git pull origin main

# 2. In OmniDoc Team Hub: Click "Git Sync" -> "Load team.json"

# 3. Add tasks or update guidelines, then click "Save team.json"
git add .omnidoc/team.json
git commit -m "chore(team): update sprint planning and guidelines"
git push origin main`}
                    </code>
                  </pre>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Both <strong>Merge</strong> (combines teammates' cards non-destructively) and <strong>Replace</strong> strategies are supported.
                  </p>
                </div>
              </div>
            )}

            {/* 6. P2P Live Rooms & Voice Notes */}
            {activeTab === 'p2p-rooms' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Radio size={18} className="text-indigo-400" />
                    <span>Zero-Server P2P Rooms & Voice Notes</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Direct browser-to-browser WebRTC DataChannel connection. No central relay servers, no subscriptions, and zero privacy leaks.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-[#121622] border border-white/10 space-y-3 text-xs">
                  <h4 className="font-semibold text-white">How Pairing Works</h4>
                  <ol className="space-y-2 list-decimal list-inside text-zinc-300 leading-relaxed">
                    <li>
                      <strong>Host:</strong> Click <code className="text-indigo-300">P2P Room</code> in Team Hub &rarr; click <strong>Host a Room</strong>. Copy the generated Host Ticket.
                    </li>
                    <li>
                      <strong>Joiner:</strong> In OmniDoc, click <code className="text-indigo-300">P2P Room</code> &rarr; <strong>Join Existing Room</strong>. Paste the Host Ticket and click <strong>Generate Response Ticket</strong>.
                    </li>
                    <li>
                      <strong>Handshake:</strong> The Host pastes the Joiner's response ticket and clicks <strong>Connect</strong>.
                    </li>
                  </ol>

                  <div className="pt-2 border-t border-white/5 text-zinc-400 text-[11px] space-y-1">
                    <p>✓ <strong>Real-time Presence:</strong> See what document your teammate is reading.</p>
                    <p>✓ <strong>Direct Text Chat:</strong> End-to-end encrypted peer messaging.</p>
                    <p>✓ <strong>Voice Clips:</strong> Hold or click the microphone to record high-quality Opus audio notes transmitted directly to your peer.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 7. Keyboard Shortcuts */}
            {activeTab === 'shortcuts' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Keyboard size={18} className="text-indigo-400" />
                    <span>Keyboard Shortcuts Cheat-sheet</span>
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Navigate OmniDoc Studio with fast developer keybindings.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-[var(--bg-dark-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-zinc-300">Command Palette</span>
                    <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-zinc-300">Cmd / Ctrl + K</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-dark-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-zinc-300">Open File</span>
                    <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-zinc-300">Cmd / Ctrl + O</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-dark-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-zinc-300">Save Document</span>
                    <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-zinc-300">Cmd / Ctrl + S</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-dark-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-zinc-300">Split Viewport</span>
                    <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-zinc-300">Cmd / Ctrl + D</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-dark-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-zinc-300">Toggle Comments Panel</span>
                    <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-zinc-300">Option / Alt + C</kbd>
                  </div>

                  <div className="p-2.5 rounded bg-[var(--bg-dark-surface)] border border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-zinc-300">Toggle AI Drawer</span>
                    <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-zinc-300">Cmd / Ctrl + J</kbd>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-black/30 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <span>Need help? Check API settings or open the Command Palette (Cmd+K)</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-white/10 hover:bg-white/15 text-white font-medium transition-colors cursor-pointer"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
};
