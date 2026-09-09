import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Plus, Settings, Sparkles, Download, FolderOpen, Table } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    createDocument,
    toggleAIDrawer,
    toggleSidebar,
    setLeftPanel,
    openDocument
  } = useAppStore();

  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCommandPaletteOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isCommandPaletteOpen]);

  // Global shortcut Cmd+K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'p')) {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const commands = [
    {
      id: 'new-md',
      title: 'New Markdown Document',
      category: 'Create',
      icon: <FileText size={14} className="text-cyan-400" />,
      action: () => createDocument('markdown')
    },
    {
      id: 'new-csv',
      title: 'New CSV Data Grid',
      category: 'Create',
      icon: <Table size={14} className="text-emerald-400" />,
      action: () => createDocument('csv')
    },
    {
      id: 'new-json',
      title: 'New JSON Document',
      category: 'Create',
      icon: <Plus size={14} className="text-sky-400" />,
      action: () => createDocument('json')
    },
    {
      id: 'open-file',
      title: 'Open File from Disk...',
      category: 'File',
      icon: <FolderOpen size={14} className="text-amber-400" />,
      action: async () => {
        if (window.electronAPI?.openFileDialog) {
          const path = await window.electronAPI.openFileDialog();
          if (path) {
            const data = await window.electronAPI.readFile(path);
            const name = path.split(/[/\\]/).pop() || 'Untitled';
            const ext = name.split('.').pop()?.toLowerCase() || '';
            const format = ['md', 'markdown'].includes(ext) ? 'markdown' as const
              : ext === 'pdf' ? 'pdf' as const
              : ['docx', 'doc'].includes(ext) ? 'docx' as const
              : ext === 'csv' ? 'csv' as const
              : ext === 'json' ? 'json' as const
              : ['txt', 'log'].includes(ext) ? 'text' as const : 'code' as const;
            openDocument({
              id: `doc-${Date.now()}`,
              name,
              format,
              content: data.data,
              filePath: path,
              isDirty: false
            });
          }
        }
      }
    },
    {
      id: 'ai-drawer',
      title: 'Toggle AI Friend & Research Assistant',
      category: 'AI',
      icon: <Sparkles size={14} className="text-sky-400" />,
      action: () => toggleAIDrawer()
    },
    {
      id: 'settings',
      title: 'Configure AI Providers & API Keys',
      category: 'Settings',
      icon: <Settings size={14} className="text-sky-400" />,
      action: () => {
        toggleSidebar(true);
        setLeftPanel('settings');
      }
    }
  ];

  const filtered = commands.filter((c) =>
    c.title.toLowerCase().includes(query.toLowerCase()) ||
    c.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleExecute = (cmd: typeof commands[0]) => {
    cmd.action();
    setCommandPaletteOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((idx) => (idx - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault();
      handleExecute(filtered[selectedIndex]);
    }
  };

  return (
    <div
      onClick={() => setCommandPaletteOpen(false)}
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--bg-dark-elevated)] border border-[var(--border-subtle)] rounded-md max-w-xl w-full flex flex-col shadow-2xl animate-modal overflow-hidden"
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3.5 border-b border-white/10 gap-3">
          <Search size={16} className="text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search action..."
            className="w-full bg-transparent text-sm text-white placeholder-zinc-500 outline-none"
          />
          <kbd className="px-2 py-0.5 rounded bg-white/10 text-[10px] font-mono text-zinc-400">
            ESC
          </kbd>
        </div>

        {/* Grouped command results */}
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.map((cmd, idx) => {
            const showHeader = idx === 0 || filtered[idx - 1].category !== cmd.category;
            return (
              <React.Fragment key={cmd.id}>
                {showHeader && (
                  <div className="px-2.5 pt-2 pb-1 text-[10px] font-semibold text-zinc-500">
                    {cmd.category}
                  </div>
                )}
                <div
                  onClick={() => handleExecute(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-2 rounded-md flex items-center gap-2.5 cursor-pointer transition-colors text-xs ${
                    selectedIndex === idx
                      ? 'bg-sky-500/15 text-white'
                      : 'text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  <div className="p-1.5 rounded bg-white/5 shrink-0">{cmd.icon}</div>
                  <span className="font-medium">{cmd.title}</span>
                </div>
              </React.Fragment>
            );
          })}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-xs">No matching commands found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
