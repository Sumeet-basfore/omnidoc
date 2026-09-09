import React from 'react';
import { X, Download, Printer, FileText, FileSpreadsheet, FileCode, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import {
  markdownToDocxBlob,
  csvToJSON,
  jsonToCSV,
  downloadBlob
} from '../../services/exportService';

export const ExportModal: React.FC = () => {
  const {
    isExportModalOpen,
    setExportModalOpen,
    tabs,
    activeTabId,
    documents
  } = useAppStore();

  const currentTab = tabs.find((t) => t.id === activeTabId);
  const activeDoc = currentTab ? documents[currentTab.documentId] : null;

  if (!isExportModalOpen || !activeDoc) return null;

  const baseName = activeDoc.name.replace(/\.[^/.]+$/, '');

  const handlePrintPDF = async () => {
    setExportModalOpen(false);
    if (window.electronAPI?.printToPDF) {
      const pdfBytes = await window.electronAPI.printToPDF();
      if (pdfBytes) {
        const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
        downloadBlob(blob, `${baseName}.pdf`);
      }
    } else {
      window.print();
    }
  };

  const handleExportMarkdownToDocx = async () => {
    setExportModalOpen(false);
    const blob = await markdownToDocxBlob(activeDoc.content);
    downloadBlob(blob, `${baseName}.docx`);
  };

  const handleExportCsvToJson = () => {
    setExportModalOpen(false);
    const jsonArray = csvToJSON(activeDoc.content);
    const jsonStr = JSON.stringify(jsonArray, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `${baseName}.json`);
  };

  const handleExportCsvToCsv = () => {
    setExportModalOpen(false);
    const blob = new Blob([activeDoc.content], { type: 'text/csv;charset=utf-8;' });
    downloadBlob(blob, `${baseName}.csv`);
  };

  const handleExportJsonToCsv = () => {
    setExportModalOpen(false);
    try {
      const parsed = JSON.parse(activeDoc.content);
      const csvStr = jsonToCSV(Array.isArray(parsed) ? parsed : [parsed]);
      const blob = new Blob([csvStr], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${baseName}.csv`);
    } catch {
      alert('Unable to parse JSON for CSV conversion.');
    }
  };

  const handleExportJsonToJson = () => {
    setExportModalOpen(false);
    const blob = new Blob([activeDoc.content], { type: 'application/json;charset=utf-8;' });
    downloadBlob(blob, `${baseName}.json`);
  };

  const handleDownloadOriginal = () => {
    setExportModalOpen(false);
    const blob = new Blob([activeDoc.content], { type: 'text/plain;charset=utf-8;' });
    downloadBlob(blob, activeDoc.name);
  };

  const renderOptions = () => {
    switch (activeDoc.format) {
      case 'markdown':
        return (
          <>
            <button
              onClick={handleExportMarkdownToDocx}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-indigo-950/40 border border-white/10 hover:border-indigo-500/40 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 group-hover:bg-indigo-500/30">
                <FileText size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Word Document (.docx)</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Converts Markdown headings, lists, tables, and bold/italic styles into a native Microsoft Word document.
                </p>
              </div>
            </button>

            <button
              onClick={handlePrintPDF}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500/30">
                <Printer size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Print / Save as PDF</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  High-fidelity PDF export with styled typography, syntax-highlighted code blocks, and KaTeX math.
                </p>
              </div>
            </button>
          </>
        );

      case 'csv':
        return (
          <>
            <button
              onClick={handleExportCsvToJson}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-emerald-950/40 border border-white/10 hover:border-emerald-500/40 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30">
                <FileSpreadsheet size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Convert to JSON (.json)</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Transforms CSV records into structured JSON objects with typed numbers and booleans.
                </p>
              </div>
            </button>

            <button
              onClick={handleExportCsvToCsv}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-white/10 border border-white/10 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-white/10 text-zinc-300">
                <Download size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Export CSV (.csv)</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Re-serialize edited grid cells with clean quoting and download as CSV.
                </p>
              </div>
            </button>
          </>
        );

      case 'json':
        return (
          <>
            <button
              onClick={handleExportJsonToCsv}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-emerald-950/40 border border-white/10 hover:border-emerald-500/40 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/30">
                <FileSpreadsheet size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Convert to CSV (.csv)</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Flattens JSON records into standard comma-delimited tabular rows.
                </p>
              </div>
            </button>

            <button
              onClick={handleExportJsonToJson}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-white/10 border border-white/10 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-white/10 text-zinc-300">
                <Download size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Export Formatted JSON (.json)</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Downloads formatted 2-space indented JSON document.
                </p>
              </div>
            </button>
          </>
        );

      case 'docx':
        return (
          <>
            <button
              onClick={handlePrintPDF}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500/30">
                <Printer size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Print / Save as PDF</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Renders WYSIWYG document to high-resolution print PDF.
                </p>
              </div>
            </button>
          </>
        );

      case 'code':
      case 'text':
      default:
        return (
          <>
            <button
              onClick={handlePrintPDF}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-red-950/40 border border-white/10 hover:border-red-500/40 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 group-hover:bg-red-500/30">
                <Printer size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Print / Save as PDF</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Print syntax-highlighted code or text directly to PDF.
                </p>
              </div>
            </button>

            <button
              onClick={handleDownloadOriginal}
              className="p-4 rounded-xl bg-[#161a29] hover:bg-white/10 border border-white/10 transition-all text-left group flex items-start gap-3"
            >
              <div className="p-2 rounded-lg bg-white/10 text-zinc-300">
                <FileCode size={18} />
              </div>
              <div className="flex-1">
                <h4 className="text-xs font-semibold text-white mb-0.5">Download File ({activeDoc.name})</h4>
                <p className="text-[11px] text-zinc-400 leading-snug">
                  Downloads raw source content to your local machine.
                </p>
              </div>
            </button>
          </>
        );
    }
  };

  return (
    <div
      onClick={() => setExportModalOpen(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#121622] border border-[var(--border-medium)] rounded-2xl max-w-lg w-full flex flex-col shadow-2xl animate-modal overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--bg-glass)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Download size={16} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Export & Convert Document</h2>
              <p className="text-[11px] text-zinc-400">
                Choose an export format for <span className="text-indigo-300">{activeDoc.name}</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setExportModalOpen(false)}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-3">
          {renderOptions()}
        </div>
      </div>
    </div>
  );
};
