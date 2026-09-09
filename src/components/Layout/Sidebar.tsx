import React, { useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Clock,
  UploadCloud,
  X
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ProviderSettings } from '../Settings/ProviderSettings';
import { DocumentFormat, DocumentItem } from '../../types/document';

export const Sidebar: React.FC = () => {
  const {
    isSidebarOpen,
    leftPanel,
    openDocument,
    createDocument,
    recentFiles,
    addRecentFile,
    removeRecentFile,
    clearRecentFiles,
    sidebarWidth,
    setSidebarWidth
  } = useAppStore();

  const startResize = (dir: 1 | -1) => (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    document.body.style.userSelect = 'none';
    const onMove = (ev: MouseEvent) => setSidebarWidth(startW + (ev.clientX - startX) * dir);
    const onUp = () => {
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isSidebarOpen) return null;

  if (leftPanel === 'settings') {
    return (
      <aside
        style={{ width: sidebarWidth }}
        className="h-full flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-dark-surface)] select-none text-xs shrink-0 relative"
      >
        <div
          onMouseDown={startResize(1)}
          onDoubleClick={() => setSidebarWidth(260)}
          className="absolute top-0 bottom-0 -right-1 w-2 cursor-col-resize z-40 hover:bg-sky-500/30 transition-colors"
          title="Drag to resize (double-click to reset)"
        />
        <ProviderSettings />
      </aside>
    );
  }

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

  const getFileMeta = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';

    if (['md', 'markdown'].includes(ext)) {
      return {
        format: 'markdown' as DocumentFormat,
        badge: 'MD',
        borderClass: 'border-l-cyan-400',
        badgeClass: 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
      };
    }
    if (ext === 'pdf') {
      return {
        format: 'pdf' as DocumentFormat,
        badge: 'PDF',
        borderClass: 'border-l-red-500',
        badgeClass: 'bg-red-500/15 text-red-400 border border-red-500/30'
      };
    }
    if (['docx', 'doc'].includes(ext)) {
      return {
        format: 'docx' as DocumentFormat,
        badge: 'DOC',
        borderClass: 'border-l-sky-500',
        badgeClass: 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
      };
    }
    if (ext === 'csv') {
      return {
        format: 'csv' as DocumentFormat,
        badge: 'CSV',
        borderClass: 'border-l-emerald-500',
        badgeClass: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
      };
    }
    if (ext === 'json') {
      return {
        format: 'json' as DocumentFormat,
        badge: 'JSON',
        borderClass: 'border-l-sky-500',
        badgeClass: 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
      };
    }
    return {
      format: 'code' as DocumentFormat,
      badge: (ext || 'CODE').toUpperCase().slice(0, 4),
      borderClass: 'border-l-amber-500',
      badgeClass: 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
    };
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
      const base64 = btoa(binary);

      openDocument({
        id: `doc-${Date.now()}`,
        name: file.name,
        format,
        content: base64,
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
    <aside
        style={{ width: sidebarWidth }}
        className="h-full flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-dark-surface)] select-none text-xs shrink-0 relative"
      >
        <div
          onMouseDown={startResize(1)}
          onDoubleClick={() => setSidebarWidth(260)}
          className="absolute top-0 bottom-0 -right-1 w-2 cursor-col-resize z-40 hover:bg-sky-500/30 transition-colors"
          title="Drag to resize (double-click to reset)"
        />
      {/* Hidden browser file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBrowserFileSelected}
        className="hidden"
      />

      {/* Main Actions */}
      <div className="p-3 border-b border-[var(--border-subtle)] space-y-2">
        <button
          onClick={handleOpenFile}
          className="w-full py-2 px-3 rounded bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <FolderOpen size={14} />
          <span>Open File...</span>
        </button>

        <div className="grid grid-cols-3 gap-1.5 pt-1">
          <button
            onClick={() => createDocument('markdown')}
            className="py-1.5 px-1.5 rounded-md bg-white/5 hover:bg-white/10 text-cyan-300 border border-white/5 flex items-center justify-center gap-1 transition-colors text-[11px] font-medium"
            title="New Markdown Document"
          >
            <Plus size={11} className="text-cyan-400 shrink-0" />
            <span>+ MD</span>
          </button>
          <button
            onClick={() => createDocument('csv')}
            className="py-1.5 px-1.5 rounded-md bg-white/5 hover:bg-white/10 text-emerald-300 border border-white/5 flex items-center justify-center gap-1 transition-colors text-[11px] font-medium"
            title="New Data Grid"
          >
            <Plus size={11} className="text-emerald-400 shrink-0" />
            <span>+ Grid</span>
          </button>
          <button
            onClick={() => createDocument('docx')}
            className="py-1.5 px-1.5 rounded-md bg-white/5 hover:bg-white/10 text-sky-300 border border-white/5 flex items-center justify-center gap-1 transition-colors text-[11px] font-medium"
            title="New Word Document"
          >
            <Plus size={11} className="text-sky-400 shrink-0" />
            <span>+ DOCX</span>
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {/* Recent Files */}
        {recentFiles.length > 0 && (
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-500 mb-1">
              <div className="flex items-center gap-1.5">
                <Clock size={12} className="text-zinc-400" />
                <span>Recent Files</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-zinc-500">{recentFiles.length} files</span>
                <button
                  type="button"
                  onClick={() => clearRecentFiles()}
                  className="text-[10px] font-mono text-zinc-500 hover:text-rose-400 hover:underline transition-colors cursor-pointer"
                  title="Clear all recent files"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {recentFiles.slice(0, 8).map((path, idx) => {
                const name = path.split(/[/\\]/).pop() || path;
                const meta = getFileMeta(name);
                return (
                  <div
                    key={idx}
                    onClick={async () => {
                      if (window.electronAPI?.readFile) {
                        try {
                          const fileData = await window.electronAPI.readFile(path);
                          openDocument({
                            id: `doc-${Date.now()}`,
                            name,
                            format: meta.format,
                            content: fileData.data,
                            filePath: path,
                            isDirty: false
                          });
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                    className={`relative pl-2.5 pr-2 py-1 rounded-r-md bg-white/[0.02] hover:bg-white/[0.06] border-l-[3px] ${meta.borderClass} cursor-pointer flex flex-col gap-0.5 transition-all text-[11px] group`}
                    title={path}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-zinc-200 font-bold font-mono text-[11px] truncate flex-1">{name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentFile(path);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer shrink-0"
                        title="Remove from recent files"
                        aria-label={`Remove ${name} from recent files`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-[10px] pt-0.5">
                      <span className={`px-1 py-0.2 rounded text-[9px] font-mono font-medium shrink-0 ${meta.badgeClass}`}>
                        {meta.badge}
                      </span>
                      <span className="font-mono text-[9px] text-zinc-500 truncate max-w-[150px]" title={path}>{path}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Drag and Drop Zone Hint */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-dark-base)]/60 text-center">
        <div className="border border-dashed border-white/10 rounded p-3 text-zinc-500 flex flex-col items-center gap-1">
          <UploadCloud size={16} />
          <span className="text-[10px]">Drag & drop files onto app window to open</span>
        </div>
      </div>
    </aside>
  );
};
