import React, { useState, useEffect } from 'react';
import {
  Menu,
  Sparkles,
  Save,
  Download,
  Search,
  Cpu,
  MessageSquare,
  Kanban,
  FileText,
  Users,
  HelpCircle
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { downloadBlob } from '../../services/exportService';
import appLogo from '../../assets/app_logo.png';

export const TopBar: React.FC = () => {
  const {
    mainView,
    setMainView,
    isSidebarOpen,
    toggleSidebar,
    isAIDrawerOpen,
    toggleAIDrawer,
    isCommentsPanelOpen,
    toggleCommentsPanel,
    comments,
    leftPanel,
    setLeftPanel,
    setCommandPaletteOpen,
    setExportModalOpen,
    setUserGuideOpen,
    activeProvider,
    aiConfigs,
    documents,
    tabs,
    activeTabId,
    markDirty,
    renameDocument,
    setDocumentPath,
    addRecentFile,
    setLastSavedAt
  } = useAppStore();

  const activeDoc = tabs.find((t) => t.id === activeTabId)
    ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
    : null;

  const openCommentsCount =
    activeDoc && comments[activeDoc.id]
      ? comments[activeDoc.id].filter((c) => c.status === 'open').length
      : 0;

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
      setLastSavedAt(Date.now());
    } else if (window.electronAPI?.saveFileDialog) {
      const savedPath = await window.electronAPI.saveFileDialog(activeDoc.name);
      if (savedPath) {
        const isBinary = activeDoc.format === 'pdf' || activeDoc.format === 'docx';
        await window.electronAPI.writeFile(savedPath, activeDoc.content, isBinary);
        setDocumentPath(activeDoc.id, savedPath);
        addRecentFile(savedPath);
        window.electronAPI.addRecentDocument(savedPath);
        markDirty(activeDoc.id, false);
        setLastSavedAt(Date.now());
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
    <header className="h-12 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] px-3 flex items-center justify-between z-20 select-none">
      {/* Left section: Sidebar toggle, OD Logo & Document Title */}
      <div className="flex items-center gap-2.5">
        {(mainView === 'studio' || mainView === 'editor' || leftPanel === 'settings') && (
          <button
            onClick={() => toggleSidebar()}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Toggle Sidebar (⌘B)"
          >
            <Menu size={17} />
          </button>
        )}

        {/* Brand mark */}
        <img
          src={appLogo}
          alt="OmniDoc Studio"
          className="w-7 h-7 rounded shrink-0"
          draggable={false}
        />

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
                className="px-2 py-0.5 bg-black/50 border border-sky-500 rounded text-xs text-white outline-none w-48 font-medium"
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

            <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-mono font-semibold bg-white/10 text-sky-300">
              {activeDoc.format}
            </span>

            {activeDoc.isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />
            )}
          </div>
        )}
      </div>

      {/* Center: View Switcher & Command Launcher */}
      <div className="flex items-center gap-2.5">
        {/* Studio vs Team Hub Switcher */}
        <div className="flex items-center bg-[var(--bg-dark-base)] rounded p-0.5 border border-[var(--border-subtle)] text-xs">
          <button
            onClick={() => setMainView('studio')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
              mainView === 'studio' || mainView === 'editor'
                ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <FileText size={12} />
            <span>Studio</span>
          </button>
          <button
            onClick={() => setMainView('team')}
            className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-all cursor-pointer ${
              mainView === 'team' || mainView === 'kanban'
                ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Users size={12} />
            <span>Team Hub</span>
          </button>
        </div>

        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex items-center gap-2 px-3 py-1 rounded bg-[var(--bg-dark-base)] hover:bg-white/5 border border-[var(--border-subtle)] text-xs text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer shadow-inner w-48 justify-between"
        >
          <div className="flex items-center gap-1.5">
            <Search size={13} />
            <span>Search or command...</span>
          </div>
          <kbd className="px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-[10px] font-mono text-zinc-400">
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
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer border border-white/5"
              title="Save Document (⌘S)"
            >
              <Save size={15} className="text-sky-400" />
            </button>

            <button
              onClick={handleExport}
              className="p-1.5 rounded bg-white/5 hover:bg-white/10 text-zinc-200 transition-colors cursor-pointer border border-white/5"
              title="Export Document..."
            >
              <Download size={15} className="text-emerald-400" />
            </button>
          </>
        )}

        {/* Provider settings — the single settings entry */}
        <button
          onClick={() => {
            if (leftPanel === 'settings') {
              setLeftPanel('files');
            } else {
              toggleSidebar(true);
              setLeftPanel('settings');
            }
          }}
          className={`flex items-center gap-1 px-2 py-1 rounded border text-xs cursor-pointer transition-all ${
            leftPanel === 'settings'
              ? 'bg-[var(--accent-primary)] border-transparent text-[var(--text-on-accent)] font-semibold'
              : 'bg-sky-500/10 border-sky-500/30 text-sky-300 hover:text-white hover:border-sky-400'
          }`}
          title="Provider & key settings"
        >
          <Cpu size={12} className={leftPanel === 'settings' ? 'text-[var(--text-on-accent)]' : 'text-sky-400'} />
          <span className="font-medium text-[11px] hidden sm:inline">
            {currentAIConfig.name.split(' ')[0]}
          </span>
        </button>

        {/* User Guide & API Setup Center */}
        <button
          onClick={() => setUserGuideOpen(true)}
          className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--border-subtle)] bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white text-xs cursor-pointer transition-all"
          title="Open User Guide & API Setup Center"
        >
          <HelpCircle size={13} className="text-sky-400" />
          <span className="font-medium text-[11px] hidden md:inline">Guide</span>
        </button>

        {/* Toggle Comments & Review Threads */}
        <button
          onClick={() => toggleCommentsPanel()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium text-xs transition-all cursor-pointer ${
            isCommentsPanelOpen
              ? 'bg-sky-500/20 border border-sky-500/40 text-sky-200 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5'
          }`}
          title="Toggle Document Comments & Discussion (⌥C)"
        >
          <MessageSquare size={13} className={isCommentsPanelOpen ? 'text-sky-300' : 'text-sky-400'} />
          <span className="hidden sm:inline">Comments</span>
          {openCommentsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-[10px] font-mono font-bold text-[var(--text-on-accent)] leading-none">
              {openCommentsCount}
            </span>
          )}
        </button>

        {/* Toggle AI Companion Drawer */}
        <button
          onClick={() => toggleAIDrawer()}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium text-xs transition-all cursor-pointer ${
            isAIDrawerOpen
              ? 'bg-[var(--accent-primary)] text-[var(--text-on-accent)] font-semibold shadow-sm'
              : 'bg-white/10 hover:bg-white/15 text-white'
          }`}
          title="Toggle Omni & Deep Research"
        >
          <Sparkles size={13} className={isAIDrawerOpen ? 'text-[var(--text-on-accent)]' : 'text-sky-400'} />
          <span className="hidden sm:inline">Omni</span>
        </button>
      </div>
    </header>
  );
};
