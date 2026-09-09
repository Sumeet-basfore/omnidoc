import React, { useState } from 'react';
import { X, Sparkles, Globe, MessageSquare, Cpu } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ChatPanel } from '../AI/ChatPanel';
import { DeepResearchPanel } from '../AI/DeepResearchPanel';

export const AICompanionDrawer: React.FC = () => {
  const { isAIDrawerOpen, toggleAIDrawer, activeProvider, aiConfigs, setSettingsOpen } = useAppStore();
  const [activeTab, setActiveTab] = useState<'chat' | 'research'>('chat');

  if (!isAIDrawerOpen) return null;

  const currentConfig = aiConfigs[activeProvider];

  return (
    <aside className="w-[380px] h-full flex flex-col border-l border-[var(--border-subtle)] bg-[#0d101a] z-30 transition-all select-none shadow-2xl">
      {/* Drawer Header */}
      <div className="h-14 px-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-glass)]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-md glow-sparkle">
            <Sparkles size={13} />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white leading-tight">AI Studio Companion</h3>
            <button
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-1 text-[10px] text-zinc-400 hover:text-indigo-300 transition-colors"
            >
              <Cpu size={10} />
              <span>{currentConfig.name}</span>
            </button>
          </div>
        </div>

        <button
          onClick={() => toggleAIDrawer(false)}
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close AI Companion"
        >
          <X size={16} />
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-[var(--border-subtle)] bg-[#111422] p-1 gap-1">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'chat'
              ? 'bg-[var(--accent-primary)] text-white shadow'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
        >
          <MessageSquare size={13} />
          <span>AI Friend Co-Writer</span>
        </button>

        <button
          onClick={() => setActiveTab('research')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'research'
              ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white shadow'
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
