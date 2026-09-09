import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, FileText, FileSpreadsheet, FileCode, File } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { DocumentFormat } from '../../types/document';

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, documents, setActiveTab, closeTab, createDocument } = useAppStore();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPopoverOpen(false);
      }
    };
    if (isPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPopoverOpen]);

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

  const getFormatBorderColor = (format: DocumentFormat) => {
    switch (format) {
      case 'markdown':
        return '#06b6d4';
      case 'pdf':
        return '#ef4444';
      case 'docx':
        return '#6366f1';
      case 'csv':
      case 'json':
        return '#10b981';
      case 'code':
      case 'text':
      default:
        return '#f59e0b';
    }
  };

  return (
    <div className="h-9 border-b border-[var(--border-subtle)] bg-[#090b10] flex items-center px-2 select-none overflow-x-auto gap-1 relative z-10">
      {tabs.map((tab) => {
        const doc = documents[tab.documentId];
        if (!doc) return null;
        const isActive = tab.id === activeTabId;

        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              borderTopColor: isActive ? getFormatBorderColor(doc.format) : 'transparent'
            }}
            className={`group h-8 px-3 rounded-t-lg flex items-center gap-2 cursor-pointer transition-all text-xs border-t-2 border-l border-r relative ${
              isActive
                ? 'bg-[#121622] border-l-[var(--border-subtle)] border-r-[var(--border-subtle)] border-b-0 text-white font-medium shadow-sm -bottom-[1px]'
                : 'bg-transparent border-transparent text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03]'
            }`}
          >
            {getFormatIcon(doc.format)}
            <span className="truncate max-w-[140px]">{doc.name}</span>

            {/* Dirty Indicator or Close Button */}
            <div className="flex items-center ml-1">
              {doc.isDirty ? (
                <span className="w-2 h-2 rounded-full bg-amber-400 block group-hover:hidden" title="Unsaved changes" />
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

      {/* New Tab Button & Popover */}
      <div className="relative" ref={popoverRef}>
        <button
          onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          className={`p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors ml-1 ${
            isPopoverOpen ? 'bg-white/10 text-white' : ''
          }`}
          title="Create New Document..."
        >
          <Plus size={14} />
        </button>

        {isPopoverOpen && (
          <div className="absolute left-0 top-full mt-1 w-48 bg-[#141824] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 text-xs animate-modal">
            <button
              onClick={() => {
                createDocument('markdown');
                setIsPopoverOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-zinc-200 transition-colors"
            >
              <FileText size={13} className="text-cyan-400" />
              <span>+ Markdown Document</span>
            </button>
            <button
              onClick={() => {
                createDocument('csv');
                setIsPopoverOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-zinc-200 transition-colors"
            >
              <FileSpreadsheet size={13} className="text-emerald-400" />
              <span>+ CSV Data Grid</span>
            </button>
            <button
              onClick={() => {
                createDocument('json');
                setIsPopoverOpen(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-white/10 flex items-center gap-2 text-zinc-200 transition-colors"
            >
              <FileSpreadsheet size={13} className="text-pink-400" />
              <span>+ JSON Document</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
