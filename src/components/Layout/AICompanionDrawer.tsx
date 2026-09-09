import React, { useState } from 'react';
import { X, Sparkles, Globe, MessageSquare, Cpu } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ChatPanel } from '../AI/ChatPanel';
import { DeepResearchPanel } from '../AI/DeepResearchPanel';

export const AICompanionDrawer: React.FC = () => {
  const { isAIDrawerOpen, setAIDrawerOpen, activeProvider, aiConfigs, setSettingsOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'research'>('chat');

  const currentConfig = aiConfigs[activeProvider];

  if (!isAIDrawerOpen) return null;

  return (
    <aside
      className="w-[380px] h-full flex flex-col border-l border-[var(--border-subtle)] bg-[var(--bg-dark-surface)] z-30 select-none shadow-2xl"
    >
      {/* Drawer Header */}
      <div className="h-14 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-glass)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-[var(--accent-primary)] flex items-center justify-center text-[var(--text-on-accent)]">
            <Sparkles size={13} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white leading-tight">AI Studio Companion</h3>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-sky-300 transition-colors"
            >
              <Cpu size={10} />
              <span>{currentConfig.name}</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => setAIDrawerOpen(false)}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close AI Companion"
        >
          <X size={16} />
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[var(--bg-dark-surface)] p-1 gap-1">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'chat'
              ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <MessageSquare size={13} />
          <span>AI Friend Co-Writer</span>
        </button>

        <button
          onClick={() => setActiveTab('research')}
          className={`flex-1 py-1.5 px-3 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'research'
              ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)]'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <Globe size={13} />
          <span>Deep Research</span>
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? <ChatPanel /> : <DeepResearchPanel />}
      </div>
    </aside>
  );
};
