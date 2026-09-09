import React, { useEffect } from 'react';
import { useAppStore } from './store/useAppStore';
import { TopBar } from './components/Layout/TopBar';
import { Sidebar } from './components/Layout/Sidebar';
import { TabBar } from './components/Layout/TabBar';
import { AICompanionDrawer } from './components/Layout/AICompanionDrawer';
import { DocumentAdapterRouter } from './adapters/documentAdapterRouter';
import { InlineSelectionToolbar } from './components/AI/InlineSelectionToolbar';
import { ProviderSettings } from './components/Settings/ProviderSettings';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { ExportModal } from './components/Layout/ExportModal';
import { DocumentFormat, DocumentItem } from './types/document';

export const App: React.FC = () => {
  const {
    openDocument,
    createDocument,
    tabs,
    activeTabId,
    documents,
    markDirty
  } = useAppStore();

  // Handle native drag and drop files from OS
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';

        let format: DocumentFormat = 'code';
        if (['md', 'markdown'].includes(ext)) format = 'markdown';
        else if (ext === 'pdf') format = 'pdf';
        else if (['docx', 'doc'].includes(ext)) format = 'docx';
        else if (ext === 'csv') format = 'csv';
        else if (ext === 'json') format = 'json';
        else if (['txt', 'log'].includes(ext)) format = 'text';

        const isBinary = format === 'pdf' || format === 'docx';

        if (isBinary) {
          const buffer = await file.arrayBuffer();
          let binary = '';
          const bytes = new Uint8Array(buffer);
          for (let b = 0; b < bytes.byteLength; b++) {
            binary += String.fromCharCode(bytes[b]);
          }
          openDocument({
            id: `doc-${Date.now()}-${i}`,
            name: file.name,
            format,
            content: btoa(binary),
            isDirty: false
          });
        } else {
          const text = await file.text();
          openDocument({
            id: `doc-${Date.now()}-${i}`,
            name: file.name,
            format,
            content: text,
            isDirty: false
          });
        }
      }
    };

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [openDocument]);

  // Handle keyboard shortcuts (Cmd+S, Cmd+N, Cmd+O)
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        if (e.key === 's') {
          e.preventDefault();
          const activeDoc = tabs.find((t) => t.id === activeTabId)
            ? documents[tabs.find((t) => t.id === activeTabId)!.documentId]
            : null;
          if (activeDoc) {
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
            }
          }
        } else if (e.key === 'n') {
          e.preventDefault();
          createDocument('markdown');
        } else if (e.key === 'o') {
          e.preventDefault();
          if (window.electronAPI?.openFileDialog) {
            const filePath = await window.electronAPI.openFileDialog();
            if (filePath) {
              const fileData = await window.electronAPI.readFile(filePath);
              const filename = filePath.split(/[/\\]/).pop() || 'Untitled';
              openDocument({
                id: `doc-${Date.now()}`,
                name: filename,
                format: 'markdown',
                content: fileData.data,
                filePath,
                isDirty: false
              });
            }
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, documents, createDocument, openDocument, markDirty]);

  // Open default welcome document if no document is currently open
  useEffect(() => {
    if (tabs.length === 0) {
      createDocument('markdown', 'Welcome.md');
    }
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[var(--bg-dark-base)] text-[var(--text-main)]">
      {/* Top Header */}
      <TopBar />

      {/* Workspace Tabs */}
      <TabBar />

      {/* Main Studio Viewport */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          <DocumentAdapterRouter />
          <InlineSelectionToolbar />
        </main>
        <AICompanionDrawer />
      </div>

      {/* Global Modals */}
      <ProviderSettings />
      <CommandPalette />
      <ExportModal />
    </div>
  );
};
