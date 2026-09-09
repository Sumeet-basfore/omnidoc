import React, { useRef } from 'react';
import {
  FolderOpen,
  Plus,
  Clock,
  BookOpen,
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  UploadCloud,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { DocumentFormat, DocumentItem } from '../../types/document';

export const Sidebar: React.FC = () => {
  const {
    isSidebarOpen,
    openDocument,
    createDocument,
    recentFiles,
    addRecentFile
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isSidebarOpen) return null;

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
      let binary = '';
      const bytes = new Uint8Array(buffer);
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
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

  const openSampleDoc = (type: 'markdown' | 'csv' | 'json' | 'code') => {
    let doc: DocumentItem;
    if (type === 'markdown') {
      doc = {
        id: `sample-md-${Date.now()}`,
        name: 'Product_Roadmap_Spec.md',
        format: 'markdown',
        content: `# OmniDoc Studio — Product Architecture Spec 🚀\n\nWelcome to **OmniDoc Studio (DocsViewer v2.0)** — the unified cross-platform workspace for viewing, editing, and researching documents.\n\n## 1. System Capabilities\n- ⚡ **Multi-Format Adapters**: Native Markdown, PDF, DOCX, CSV, JSON, and Code.\n- 🤖 **AI Co-Writer**: Warm peer feedback, tone adjustment, and inline rewrites.\n- 🌐 **Deep Web Research**: Autonomous Tavily + Exa search synthesis with citations.\n\n## 2. Interactive KaTeX Formula\nThe probability density of the normal distribution is defined as:\n\n$$f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} e^{-\\frac{1}{2}\\left(\\frac{x-\\mu}{\\sigma}\\right)^2}$$\n\n## 3. Comparison Matrix\n| Feature | OmniDoc Studio | Traditional Editors |\n| :--- | :--- | :--- |\n| All-Format Support | Yes (Zero Context Switch) | No (Requires 5 Apps) |\n| AI Friend Persona | Integrated in-process | Generic Web Chatbox |\n| Local Privacy | 100% Client-Side Parsing | Cloud Uploads |\n\n> "Simplicity is prerequisite for reliability." — Edsger W. Dijkstra\n`,
        isDirty: false
      };
    } else if (type === 'csv') {
      doc = {
        id: `sample-csv-${Date.now()}`,
        name: 'Quarterly_Metrics.csv',
        format: 'csv',
        content: `Quarter,Revenue_USD,Active_Users,Churn_Rate,Growth_Pct\nQ1-2025,124000,45000,1.8,24.5\nQ2-2025,168000,62000,1.5,35.4\nQ3-2025,210000,81000,1.2,42.1\nQ4-2025,295000,112000,0.9,56.8`,
        isDirty: false
      };
    } else if (type === 'json') {
      doc = {
        id: `sample-json-${Date.now()}`,
        name: 'Cluster_Config.json',
        format: 'json',
        content: `{\n  "clusterName": "production-us-east-1",\n  "region": "us-east-1",\n  "nodes": [\n    {\n      "id": "node-01",\n      "role": "primary",\n      "cpuCores": 32,\n      "ramGb": 128,\n      "status": "healthy"\n    },\n    {\n      "id": "node-02",\n      "role": "replica",\n      "cpuCores": 16,\n      "ramGb": 64,\n      "status": "healthy"\n    }\n  ],\n  "autoScaling": true,\n  "maxScale": 10\n}`,
        isDirty: false
      };
    } else {
      doc = {
        id: `sample-code-${Date.now()}`,
        name: 'neural_indexer.py',
        format: 'code',
        content: `import numpy as np\nfrom typing import List, Dict, Any\n\nclass NeuralVectorIndexer:\n    """\n    High-performance vector similarity search engine\n    designed for local RAG retrieval in OmniDoc Studio.\n    """\n    def __init__(self, dimension: int = 768):\n        self.dimension = dimension\n        self.vectors: np.ndarray = np.empty((0, dimension), dtype=np.float32)\n        self.metadata: List[Dict[str, Any]] = []\n\n    def add_item(self, vector: np.ndarray, meta: Dict[str, Any]) -> None:\n        norm_vec = vector / np.linalg.norm(vector)\n        self.vectors = np.vstack([self.vectors, norm_vec])\n        self.metadata.append(meta)\n\n    def search_top_k(self, query_vec: np.ndarray, k: int = 5) -> List[Dict[str, Any]]:\n        q_norm = query_vec / np.linalg.norm(query_vec)\n        scores = np.dot(self.vectors, q_norm)\n        top_indices = np.argsort(scores)[::-1][:k]\n        return [self.metadata[i] for i in top_indices]\n`,
        isDirty: false
      };
    }
    openDocument(doc);
  };

  return (
    <aside className="w-[260px] h-full flex flex-col border-r border-[var(--border-subtle)] bg-[#0c0e16] select-none text-xs">
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
          className="w-full py-2 px-3 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white font-medium flex items-center justify-center gap-2 shadow transition-all glow-accent cursor-pointer"
        >
          <FolderOpen size={14} />
          <span>Open File...</span>
        </button>

        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <button
            onClick={() => createDocument('markdown')}
            className="py-1.5 px-2 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 flex items-center gap-1.5 transition-colors"
          >
            <Plus size={12} className="text-cyan-400" />
            <span>+ Markdown</span>
          </button>
          <button
            onClick={() => createDocument('csv')}
            className="py-1.5 px-2 rounded-md bg-white/5 hover:bg-white/10 text-zinc-300 border border-white/5 flex items-center gap-1.5 transition-colors"
          >
            <Plus size={12} className="text-emerald-400" />
            <span>+ Data Grid</span>
          </button>
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* Sample Library */}
        <div>
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
            <BookOpen size={12} className="text-indigo-400" />
            <span>Sample Library</span>
          </div>

          <div className="space-y-1">
            <button
              onClick={() => openSampleDoc('markdown')}
              className="w-full text-left p-1.5 rounded hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2 transition-colors group"
            >
              <FileText size={13} className="text-cyan-400" />
              <span className="truncate flex-1">Product_Roadmap.md</span>
              <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-300" />
            </button>

            <button
              onClick={() => openSampleDoc('csv')}
              className="w-full text-left p-1.5 rounded hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2 transition-colors group"
            >
              <FileSpreadsheet size={13} className="text-emerald-400" />
              <span className="truncate flex-1">Quarterly_Metrics.csv</span>
              <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-300" />
            </button>

            <button
              onClick={() => openSampleDoc('json')}
              className="w-full text-left p-1.5 rounded hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2 transition-colors group"
            >
              <FileSpreadsheet size={13} className="text-pink-400" />
              <span className="truncate flex-1">Cluster_Config.json</span>
              <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-300" />
            </button>

            <button
              onClick={() => openSampleDoc('code')}
              className="w-full text-left p-1.5 rounded hover:bg-white/5 text-zinc-300 hover:text-white flex items-center gap-2 transition-colors group"
            >
              <FileCode size={13} className="text-amber-400" />
              <span className="truncate flex-1">neural_indexer.py</span>
              <ChevronRight size={12} className="text-zinc-600 group-hover:text-zinc-300" />
            </button>
          </div>
        </div>

        {/* Recent Files */}
        {recentFiles.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
              <Clock size={12} className="text-zinc-400" />
              <span>Recent Files</span>
            </div>
            <div className="space-y-1">
              {recentFiles.slice(0, 8).map((path, idx) => {
                const name = path.split(/[/\\]/).pop() || path;
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
                            format: detectFormat(name),
                            content: fileData.data,
                            filePath: path,
                            isDirty: false
                          });
                        } catch (e) {
                          console.error(e);
                        }
                      }
                    }}
                    className="p-1.5 rounded hover:bg-white/5 text-zinc-400 hover:text-white cursor-pointer truncate flex items-center gap-2 transition-colors text-[11px]"
                    title={path}
                  >
                    <File size={12} className="text-zinc-500 shrink-0" />
                    <span className="truncate">{name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Drag and Drop Zone Hint */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[#090b10]/60 text-center">
        <div className="border border-dashed border-white/10 rounded-lg p-3 text-zinc-500 flex flex-col items-center gap-1">
          <UploadCloud size={16} />
          <span className="text-[10px]">Drag & drop files onto app window to open</span>
        </div>
      </div>
    </aside>
  );
};
