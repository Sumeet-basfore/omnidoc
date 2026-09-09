import React from 'react';
import { X, Plus, FileText, FileSpreadsheet, FileCode, File, Circle } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { DocumentFormat } from '../../types/document';

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, documents, setActiveTab, closeTab, createDocument } = useAppStore();

  const getFormatIcon = (format: DocumentFormat) => {
    switch (format) {
      case 'markdown':
        return <FileText size={13} className="text-cyan-400" />;
      case 'pdf':
        return <File size={13} className="text-red-400" />;
      case 'docx':
        return <FileText size={13} className="text-indigo-400" />;
      case 'csv':
      case 'json':
        return <FileSpreadsheet size={13} className="text-emerald-400" />;
      case 'code':
      case 'text':
      default:
        return <FileCode size={13} className="text-amber-400" />;
    }
  };

  return (
    <div className="h-10 border-b border-[var(--border-subtle)] bg-[#090b10] flex items-center px-2 select-none overflow-x-auto gap-1">
      {tabs.map((tab) => {
        const doc = documents[tab.documentId];
        if (!doc) return null;
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group h-8 px-3 rounded-t-lg flex items-center gap-2 cursor-pointer transition-all text-xs border-t border-l border-r ${
              isActive
                ? 'bg-[#121622] border-[var(--border-medium)] text-white font-medium shadow-sm'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
            }`}
          >
            {getFormatIcon(doc.format)}
            <span className="truncate max-w-[140px]">{doc.name}</span>

            {/* Dirty Indicator or Close Button */}
            <div className="flex items-center ml-1">
              {doc.isDirty ? (
                <span className="w-2 h-2 rounded-full bg-indigo-400 block group-hover:hidden" />
              ) : null}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className={`p-0.5 rounded hover:bg-white/20 text-zinc-500 hover:text-white transition-colors ${
                  doc.isDirty ? 'hidden group-hover:block' : 'opacity-0 group-hover:opacity-100'
                }`}
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        );
      })}

      <button
        onClick={() => createDocument('markdown')}
        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/5 transition-colors ml-1"
        title="New Markdown Tab"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};
