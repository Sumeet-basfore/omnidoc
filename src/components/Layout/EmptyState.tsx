import React, { useRef } from 'react';
import { FolderOpen, Plus, FileText, Table, Braces } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { DocumentFormat, DocumentItem } from '../../types/document';

export const EmptyState: React.FC = () => {
  const { openDocument, createDocument, addRecentFile, setShortcutsModalOpen } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const detectFormat = (filename: string): DocumentFormat => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    if (['md', 'markdown'].includes(ext)) return 'markdown';
    if (ext === 'pdf') return 'pdf';
    if (['docx', 'doc'].includes(ext)) return 'docx';
    if (ext === 'csv') return 'csv';
    if (ext === 'json') return 'json';
    if (['txt', 'log'].includes(ext)) return 'text';
    return 'code';
  };

  const handleOpenFile = async () => {
    if (window.electronAPI?.openFileDialog) {
      const filePath = await window.electronAPI.openFileDialog();
      if (!filePath) return;

      const fileData = await window.electronAPI.readFile(filePath);
      const filename = filePath.split(/[/\\]/).pop() || 'Untitled';
      const format = detectFormat(filename);

      const docItem: DocumentItem = {
        id: `doc-${Date.now()}`,
        name: filename,
        format,
        content: fileData.data,
        filePath,
        isDirty: false
      };

      openDocument(docItem);
      addRecentFile(filePath);
      window.electronAPI.addRecentDocument(filePath);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleBrowserFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const format = detectFormat(file.name);
    const isBinary = format === 'pdf' || format === 'docx';

    if (isBinary) {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
      }
      openDocument({
        id: `doc-${Date.now()}`,
        name: file.name,
        format,
        content: btoa(binary),
        isDirty: false
      });
    } else {
      const text = await file.text();
      openDocument({
        id: `doc-${Date.now()}`,
        name: file.name,
        format,
        content: text,
        isDirty: false
      });
    }

    addRecentFile(file.name);
    e.target.value = '';
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[var(--bg-dark-base)] select-none text-center relative overflow-hidden h-full">
      {/* Hidden browser file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBrowserFileSelected}
        className="hidden"
      />

      {/* Centered OD mark */}
      <div className="relative mb-5 cursor-default">
        <div className="w-16 h-16 rounded-md bg-[var(--bg-dark-surface)] border border-[var(--border-subtle)] flex items-center justify-center">
          <span className="text-2xl font-bold text-sky-300 font-mono">
            OD
          </span>
        </div>
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.2 rounded-full text-[9px] font-mono font-semibold bg-[var(--accent-primary)] text-[var(--text-on-accent)]">
          v2.0
        </span>
      </div>

      {/* Heading & Subtitle */}
      <h2 className="text-xl font-semibold text-[var(--text-main)] mb-2 tracking-tight">No open documents</h2>
      <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
        Drop a file onto the application window or press{' '}
        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-200 font-mono text-[11px] border border-white/10 shadow-sm">
          ⌘O
        </kbd>{' '}
        to open
      </p>

      {/* Quick Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-md">
        <button
          onClick={handleOpenFile}
          className="py-2 px-4 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer"
        >
          <FolderOpen size={14} />
          <span>Open File...</span>
        </button>

        <button
          onClick={() => createDocument('markdown')}
          className="py-2 px-3.5 rounded bg-white/5 hover:bg-white/10 text-cyan-300 border border-cyan-500/20 hover:border-cyan-500/40 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <FileText size={13} className="text-cyan-400" />
          <span>+ Markdown</span>
        </button>

        <button
          onClick={() => createDocument('csv')}
          className="py-2 px-3.5 rounded bg-white/5 hover:bg-white/10 text-emerald-300 border border-emerald-500/20 hover:border-emerald-500/40 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Table size={13} className="text-emerald-400" />
          <span>+ Data Grid</span>
        </button>

        <button
          onClick={() => createDocument('json')}
          className="py-2 px-3.5 rounded bg-white/5 hover:bg-white/10 text-sky-300 border border-sky-500/20 hover:border-sky-500/40 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Braces size={13} className="text-sky-400" />
          <span>+ JSON</span>
        </button>
      </div>

      {/* Helpful Shortcuts Footer */}
      <div className="mt-10 pt-6 border-t border-white/5 flex items-center justify-center gap-4 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">⌘K</kbd>
          <span>Command Palette</span>
        </span>
        <span>•</span>
        <button
          onClick={() => setShortcutsModalOpen(true)}
          className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">?</kbd>
          <span>Keyboard Shortcuts</span>
        </button>
        <span>•</span>
        <span className="flex items-center gap-1.5 hover:text-zinc-300 transition-colors">
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[10px]">⌘B</kbd>
          <span>Sidebar</span>
        </span>
      </div>
    </div>
  );
};
