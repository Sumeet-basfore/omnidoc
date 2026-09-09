import React, { useState, useEffect, useRef } from 'react';
import { Search, FileText, Plus, Settings, Sparkles, Download, FolderOpen, Table } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    createDocument,
    toggleAIDrawer,
    setSettingsOpen,
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
      icon: <Plus size={14} className="text-pink-400" />,
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
            openDocument({
              id: `doc-${Date.now()}`,
              name,
              format: 'markdown',
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
      icon: <Sparkles size={14} className="text-pink-400" />,
      action: () => toggleAIDrawer()
    },
    {
      id: 'settings',
      title: 'Configure AI Providers & API Keys',
      category: 'Settings',
      icon: <Settings size={14} className="text-indigo-400" />,
      action: () => setSettingsOpen(true)
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/70 backdrop-blur-sm p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121622] border border-[var(--border-medium)] rounded-2xl max-w-xl w-full flex flex-col shadow-2xl animate-modal overflow-hidden"
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

        {/* Command results */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1">
          {filtered.map((cmd, idx) => (
            <div
              key={cmd.id}
              onClick={() => handleExecute(cmd)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={`p-2.5 rounded-xl flex items-center justify-between cursor-pointer transition-colors text-xs ${
                selectedIndex === idx
                  ? 'bg-indigo-600/30 text-white'
                  : 'text-zinc-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-white/5">{cmd.icon}</div>
                <span className="font-medium">{cmd.title}</span>
              </div>
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">
                {cmd.category}
              </span>
            </div>
          ))}

          {filtered.length === 0 && (
            <div className="p-6 text-center text-zinc-500 text-xs">No matching commands found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
