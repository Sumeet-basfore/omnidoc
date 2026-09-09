import React, { useState } from 'react';
import { X, Keyboard, Search, Command } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  items: ShortcutItem[];
}

export const KeyboardShortcutsModal: React.FC = () => {
  const { isShortcutsModalOpen, setShortcutsModalOpen } = useAppStore();
  const [filter, setFilter] = useState('');

  if (!isShortcutsModalOpen) return null;

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const cmdKey = isMac ? '⌘' : 'Ctrl';

  const sections: ShortcutSection[] = [
    {
      title: 'Navigation & Launcher',
      items: [
        { keys: [cmdKey, 'K'], description: 'Open Command Palette' },
        { keys: [cmdKey, 'P'], description: 'Quick File Finder / Launcher' },
        { keys: [cmdKey, 'B'], description: 'Toggle Sidebar' },
        { keys: ['?'], description: 'Open Keyboard Shortcuts' },
        { keys: ['Esc'], description: 'Close any active modal or drawer' }
      ]
    },
    {
      title: 'File & Tab Management',
      items: [
        { keys: [cmdKey, 'S'], description: 'Save Active Document' },
        { keys: [cmdKey, 'O'], description: 'Open File from Disk' },
        { keys: [cmdKey, 'N'], description: 'Create New Markdown Document' },
        { keys: [cmdKey, 'W'], description: 'Close Current Tab' }
      ]
    },
    {
      title: 'Markdown & Editor Toolbar',
      items: [
        { keys: [cmdKey, 'B'], description: 'Format Selection as Bold' },
        { keys: [cmdKey, 'I'], description: 'Format Selection as Italic' },
        { keys: ['TOC'], description: 'Insert Automated Table of Contents' },
        { keys: ['KaTeX'], description: 'Insert Math Block ($$ ... $$)' }
      ]
    },
    {
      title: 'AI Companion & Research',
      items: [
        { keys: [cmdKey, 'Shift', 'A'], description: 'Toggle AI Companion Drawer' },
        { keys: [cmdKey, 'Shift', 'R'], description: 'Launch Deep Web Research' },
        { keys: ['Select Text'], description: 'Open Inline Selection Assistant' }
      ]
    },
    {
      title: 'Review & Team Discussion',
      items: [
        { keys: ['Alt / ⌥', 'C'], description: 'Toggle Comments & Review Panel' },
        { keys: [cmdKey, 'Enter'], description: 'Accept & Merge Proposed AI Insert' },
        { keys: ['Esc'], description: 'Reject Proposal / Close Active Panel' }
      ]
    }
  ];

  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) =>
          item.description.toLowerCase().includes(filter.toLowerCase()) ||
          item.keys.some((k) => k.toLowerCase().includes(filter.toLowerCase()))
      )
    }))
    .filter((section) => section.items.length > 0);

  return (
    <div
      onClick={() => setShortcutsModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-dark-elevated)] border border-[var(--border-subtle)] rounded-md max-w-2xl w-full flex flex-col max-h-[85vh] shadow-2xl animate-modal overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-glass)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Keyboard size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Keyboard Shortcuts Reference</h2>
              <p className="text-[11px] text-zinc-400">Speed up your workflow with OmniDoc Studio hotkeys</p>
            </div>
          </div>

          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Input */}
        <div className="px-6 pt-4 pb-2 border-b border-white/5 bg-[var(--bg-dark-elevated)]">
          <div className="relative flex items-center">
            <Search size={14} className="absolute left-3 text-zinc-400" />
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter shortcuts by name or key..."
              className="w-full pl-9 pr-3 py-1.5 bg-black/30 border border-white/10 rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
          {filteredSections.map((sec) => (
            <div key={sec.title}>
              <h3 className="text-[11px] font-semibold text-sky-300 mb-2.5">
                {sec.title}
              </h3>
              <div className="space-y-1.5">
                {sec.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded bg-[var(--bg-dark-surface)] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <span className="text-zinc-300">{item.description}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 rounded bg-black/40 border border-white/15 text-sky-200 font-mono text-[11px] font-medium shadow-inner"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredSections.length === 0 && (
            <div className="p-8 text-center text-zinc-500 text-xs">
              No shortcuts found matching &ldquo;{filter}&rdquo;
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-glass)] text-xs text-zinc-400">
          <span>Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-white font-mono text-[10px]">?</kbd> anytime to view this guide</span>
          <button
            onClick={() => setShortcutsModalOpen(false)}
            className="px-4 py-1.5 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-semibold transition-all text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
