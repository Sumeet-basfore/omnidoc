import React from 'react';
import {
  Menu,
  Sparkles,
  Save,
  Download,
  Settings,
  Search,
  Cpu,
  Layers
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
    markDirty
  } = useAppStore();

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  const currentAIConfig = aiConfigs[activeProvider];

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
    <header className="h-14 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] backdrop-blur-md px-4 flex items-center justify-between z-20 select-none">
      {/* Left section: Sidebar toggle & Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => toggleSidebar()}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Toggle Sidebar"
        >
          <Menu size={18} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center text-white font-bold text-xs shadow-md glow-accent">
            OD
          </div>
          <span className="font-semibold text-white text-sm tracking-tight hidden sm:inline">
            OmniDoc Studio
          </span>
        </div>

        {activeDoc && (
          <div className="flex items-center gap-2 pl-3 border-l border-white/10">
            <span className="text-xs text-zinc-200 font-medium truncate max-w-xs">
              {activeDoc.name}
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-white/10 text-indigo-300">
              {activeDoc.format}
            </span>
            {activeDoc.isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />
            )}
          </div>
        )}
      </div>

      {/* Center: Quick Command Launcher */}
      <div className="flex items-center">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/40 hover:bg-white/5 border border-white/10 text-xs text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shadow-inner w-56 justify-between"
        >
          <div className="flex items-center gap-1.5">
            <Search size={13} />
            <span>Search or command...</span>
          </div>
          <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-zinc-400">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Right Section: Actions, AI Badge, Settings */}
      <div className="flex items-center gap-2">
        {activeDoc && (
          <>
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 text-xs transition-colors cursor-pointer border border-white/5"
              title="Save Document (Cmd+S)"
            >
              <Save size={14} className="text-indigo-400" />
              <span className="hidden md:inline">Save</span>
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-200 text-xs transition-colors cursor-pointer border border-white/5"
              title="Export Document"
            >
              <Download size={14} className="text-emerald-400" />
              <span className="hidden md:inline">Export</span>
            </button>
          </>
        )}

        {/* AI Provider Badge */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 hover:text-white hover:border-indigo-400 transition-all text-xs cursor-pointer"
          title="Configure AI Model & Keys"
        >
          <Cpu size={13} className="text-indigo-400" />
          <span className="font-medium hidden sm:inline">{currentAIConfig.name}</span>
        </button>

        {/* Settings button */}
        <button
          onClick={() => setSettingsOpen(true)}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          title="Settings"
        >
          <Settings size={16} />
        </button>

        {/* Toggle AI Companion Drawer */}
        <button
          onClick={() => toggleAIDrawer()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium text-xs transition-all cursor-pointer shadow-md ${
            isAIDrawerOpen
              ? 'bg-gradient-to-r from-indigo-600 to-pink-600 text-white glow-sparkle'
              : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
        >
          <Sparkles size={14} className="text-pink-400" />
          <span>AI Friend</span>
        </button>
      </div>
    </header>
  );
};
