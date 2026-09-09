import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { MarkdownEditor } from '../components/Viewers/MarkdownEditor';
import { PdfViewer } from '../components/Viewers/PdfViewer';
import { DocxEditor } from '../components/Viewers/DocxEditor';
import { DataGridEditor } from '../components/Viewers/DataGridEditor';
import { CodeViewer } from '../components/Viewers/CodeViewer';
import { FileText, UploadCloud } from 'lucide-react';

export const DocumentAdapterRouter: React.FC = () => {
  const { documents, tabs, activeTabId, createDocument } = useAppStore();

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const currentDoc = currentTab ? documents[currentTab.documentId] : null;

  if (!currentDoc) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#0a0c12] select-none text-center">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4 text-indigo-400 glow-accent">
          <FileText size={32} />
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">OmniDoc Studio Workspace</h2>
        <p className="text-xs text-[var(--text-muted)] max-w-md mb-6 leading-relaxed">
          Open an existing document from your system, drag and drop files directly onto this window,
          or create a new document below.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => createDocument('markdown')}
            className="px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white text-xs font-medium transition-all shadow-lg glow-accent"
          >
            + New Markdown Document
          </button>
          <button
            onClick={() => createDocument('csv')}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium transition-all"
          >
            + New Data Table (CSV)
          </button>
          <button
            onClick={() => createDocument('json')}
            className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/10 text-xs font-medium transition-all"
          >
            + New JSON Document
          </button>
        </div>
      </div>
    );
  }

  switch (currentDoc.format) {
    case 'markdown':
      return <MarkdownEditor documentId={currentDoc.id} content={currentDoc.content} />;
    case 'pdf':
      return <PdfViewer documentId={currentDoc.id} content={currentDoc.content} />;
    case 'docx':
      return <DocxEditor documentId={currentDoc.id} name={currentDoc.name} content={currentDoc.content} />;
    case 'csv':
    case 'json':
      return (
        <DataGridEditor
          documentId={currentDoc.id}
          name={currentDoc.name}
          format={currentDoc.format}
          content={currentDoc.content}
        />
      );
    case 'code':
    case 'text':
    default:
      return <CodeViewer documentId={currentDoc.id} name={currentDoc.name} content={currentDoc.content} />;
  }
};
