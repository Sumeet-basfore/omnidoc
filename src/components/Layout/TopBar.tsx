import React, { useState, useEffect } from 'react';
import {
  Menu,
  Sparkles,
  Save,
  Download,
  Settings,
  Search,
  Cpu
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { downloadBlob } from '../../services/exportService';

export const TopBar: React.FC = () => {
  const {
    isSidebarOpen,
    toggleSidebar,
    isAIDrawerOpen,
    toggleAIDrawer,
    setSettingsOpen,
    setCommandPaletteOpen,
    setExportModalOpen,
    activeProvider,
    aiConfigs,
    documents,
    tabs,
    activeTabId,
    markDirty,
    renameDocument
  } = useAppStore();

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  const currentAIConfig = aiConfigs[activeProvider];

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState('');

  useEffect(() => {
    if (activeDoc) {
      setTitleInput(activeDoc.name);
      setIsEditingTitle(false);
    }
  }, [activeDoc?.id, activeDoc?.name]);

  const handleRenameSubmit = () => {
    if (activeDoc && titleInput.trim() && titleInput.trim() !== activeDoc.name) {
      renameDocument(activeDoc.id, titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleSave = async () => {
    if (!activeDoc) return;

    if (activeDoc.filePath && window.electronAPI?.writeFile) {
      const isBinary = activeDoc.format === 'pdf' || activeDoc.format === 'docx';
      await window.electronAPI.writeFile(activeDoc.filePath, activeDoc.content, isBinary);
      markDirty(activeDoc.id, false);
    } else if (window.electronAPI?.saveFileDialog) {
      const savedPath = await window.electronAPI.saveFileDialog(activeDoc.name);
      if (savedPath) {
        const isBinary = activeDoc.format === 'pdf' || activeDoc.format === 'docx';
        await window.electronAPI.writeFile(savedPath, activeDoc.content, isBinary);
        markDirty(activeDoc.id, false);
      }
    } else {
      // Browser download fallback
      const blob = new Blob([activeDoc.content], { type: 'text/plain;charset=utf-8' });
      downloadBlob(blob, activeDoc.name);
      markDirty(activeDoc.id, false);
    }
  };

  const handleExport = () => {
    if (!activeDoc) return;
    setExportModalOpen(true);
  };

  return (
    <header className="h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-md px-3 flex items-center justify-between z-20 select-none">
      {/* Left section: Sidebar toggle, OD Logo & Document Title */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={() => toggleSidebar()}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Toggle Sidebar (⌘B)"
        >
          <Menu size={17} />
        </button>

        {/* Brand Logo without redundant text */}
        <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs shadow-md glow-accent shrink-0">
          OD
        </div>

        {activeDoc && (
          <div className="flex items-center gap-2 pl-2.5 border-l border-white/10">
            {isEditingTitle ? (
              <input
                autoFocus
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleRenameSubmit();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="px-2 py-0.5 bg-black/50 border border-indigo-500 rounded text-xs text-white outline-none w-48 font-medium"
              />
            ) : (
              <span
                onDoubleClick={() => setIsEditingTitle(true)}
                className="text-xs text-zinc-200 font-medium truncate max-w-[200px] cursor-text hover:text-white hover:underline transition-colors"
                title="Double-click to rename document"
              >
                {activeDoc.name}
              </span>
            )}

            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-white/10 text-indigo-300">
              {activeDoc.format}
            </span>

            {activeDoc.isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
            )}
          </div>
        )}
      </div>

      {/* Center: Command Launcher */}
      <div className="flex items-center">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded-lg bg-black/40 hover:bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shadow-inner w-52 justify-between"
        >
          <div className="flex items-center gap-1.5">
            <Search size={13} />
            <span>Search or command...</span>
          </div>
          <kbd className="px-1.5 py-0.2 rounded bg-white/10 text-[10px] font-mono text-zinc-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Section: Icon-only Save & Export, Provider Badge, Settings, AI Companion */}
      <div className="flex items-center gap-1.5">
        {activeDoc && (
          <>
            <button
              onClick={handleSave}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer border border-white/5"
              title="Save Document (⌘S)"
            >
              <Save size={15} className="text-indigo-400" />
            </button>

            <button
              onClick={handleExport}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer border border-white/5"
              title="Export Document..."
            >
              <Download size={15} className="text-emerald-400" />
            </button>
          </>
        )}

        {/* Compact AI Provider Badge */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 hover:text-white hover:border-indigo-400 transition-all text-xs cursor-pointer"
          title="Configure AI Model & Keys"
        >
          <Cpu size={12} className="text-indigo-400" />
          <span className="font-medium text-[11px] hidden sm:inline">
            {currentAIConfig.name.split(' ')[0]}
          </span>
        </button>

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings size={15} />
        </button>

        {/* Toggle AI Companion Drawer */}
        <button
          onClick={() => toggleAIDrawer()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs transition-all cursor-pointer shadow-md ${
            isAIDrawerOpen
              ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white glow-sparkle'
              : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
          title="Toggle AI Friend Co-Writer & Deep Research"
        >
          <Sparkles size={13} className="text-pink-400" />
          <span className="hidden sm:inline">AI Friend</span>
        </button>
      </div>
    </header>
  );
};
