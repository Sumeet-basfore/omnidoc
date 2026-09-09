import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, Sparkles, AlertTriangle, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { callAI } from '../../services/aiService';
import { keyService } from '../../services/keyService';

// Configure pdfjs worker — relative to current page so it works in dev and packaged builds
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', window.location.href).href;

interface PdfViewerProps {
  documentId: string;
  content: string; // Base64 or binary string
}

export const PdfViewer: React.FC<PdfViewerProps> = ({ documentId, content }) => {
  const { openDocument, activeProvider, aiConfigs, setAILoading } = useAppStore();
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.2);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // AI Extraction state
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [showDisclaimer, setShowDisclaimer] = useState<boolean>(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);
  const textLayerTaskRef = useRef<any>(null);

  // Load PDF document from base64 content
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        let pdfData: Uint8Array;
        if (content.startsWith('JVBERi0')) {
          // Standard base64 PDF
          const binary = atob(content);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          pdfData = bytes;
        } else {
          // Raw string or Uint8Array
          const encoder = new TextEncoder();
          pdfData = encoder.encode(content);
        }

        const loadingTask = pdfjsLib.getDocument({ data: pdfData });
        const doc = await loadingTask.promise;

        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to parse PDF document:', err);
          setError(err.message || 'Unable to render PDF document. The file may be corrupt or encrypted.');
          setLoading(false);
        }
      }
    };

    if (content) {
      loadPdf();
    }

    return () => {
      isCancelled = true;
    };
  }, [content]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    const renderPage = async () => {
      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const viewport = page.getViewport({ scale: zoom });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        const renderTask = page.render(renderContext as any);
        renderTaskRef.current = renderTask;
        await renderTask.promise;

        if (textLayerRef.current && !isCancelled) {
          textLayerRef.current.innerHTML = '';
          textLayerRef.current.style.width = `${viewport.width}px`;
          textLayerRef.current.style.height = `${viewport.height}px`;

          const textContent = await page.getTextContent();
          if (isCancelled) return;

          const pdfjs = pdfjsLib as Record<string, any>;
          if (typeof pdfjs['TextLayer'] === 'function') {
            const textLayer = new pdfjs['TextLayer']({
              textContentSource: textContent,
              container: textLayerRef.current,
              viewport: viewport
            });
            textLayerTaskRef.current = textLayer;
            await textLayer.render();
          } else if (typeof pdfjs['renderTextLayer'] === 'function') {
            const textTask = pdfjs['renderTextLayer']({
              textContentSource: textContent,
              container: textLayerRef.current,
              viewport: viewport
            });
            textLayerTaskRef.current = textTask;
            if (textTask.promise) await textTask.promise;
          }
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
      if (textLayerTaskRef.current?.cancel) {
        textLayerTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoom]);

  // AI-Assisted Extract to Markdown
  const handleAIExtract = async () => {
    if (!pdfDoc) return;
    setShowDisclaimer(false);
    setIsExtracting(true);
    setAILoading(true);

    try {
      // Extract raw text from up to 10 pages for synthesis
      let fullText = '';
      const pagesToExtract = Math.min(pdfDoc.numPages, 10);

      for (let i = 1; i <= pagesToExtract; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += `\n\n--- Page ${i} ---\n` + pageText;
      }

      const activeConfig = aiConfigs[activeProvider];
      const apiKey = (await keyService.get(activeProvider as any)) || '';

      let formattedMarkdown = fullText;
      if (apiKey) {
        const prompt = `Please convert the following extracted PDF text into clean, well-formatted Markdown with proper headings, bullet lists, and tables where appropriate:\n\n${fullText.slice(0, 12000)}`;
        formattedMarkdown = await callAI(
          [
            {
              id: 'extract-task',
              role: 'user',
              content: prompt,
              timestamp: Date.now()
            }
          ],
          activeConfig,
          apiKey,
          'friend'
        );
      }

      // Open in a new Markdown document tab
      const newDocId = `doc-${Date.now()}`;
      openDocument({
        id: newDocId,
        name: `Extracted_Document.md`,
        format: 'markdown',
        content: `# Extracted Document\n\n> *AI Extracted from PDF on ${new Date().toLocaleDateString()}*\n\n${formattedMarkdown}`,
        isDirty: true
      });
    } catch (err: any) {
      alert(`AI Extraction Error: ${err.message || err}`);
    } finally {
      setIsExtracting(false);
      setAILoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-[var(--bg-dark-base)] overflow-hidden select-none">
      {/* PDF Sub-Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] text-xs">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
            title="Previous Page"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-[var(--text-main)] font-mono">
            Page {currentPage} of {numPages || 1}
          </span>
          <button
            disabled={currentPage >= numPages}
            onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
            className="p-1.5 rounded hover:bg-white/10 disabled:opacity-30 text-white transition-colors"
            title="Next Page"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.2).toFixed(1))))}
            className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={16} />
          </button>
          <span className="font-mono text-[var(--text-muted)] text-[11px] w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom((z) => Math.min(3.0, Number((z + 0.2).toFixed(1))))}
            className="p-1.5 rounded hover:bg-white/10 text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* AI Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDisclaimer(true)}
            disabled={isExtracting || !pdfDoc}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-sky-500/10 border border-sky-500/40 text-sky-300 hover:text-white hover:border-sky-400 transition-all text-xs font-medium"
          >
            {isExtracting ? (
              <>
                <Loader2 size={14} className="animate-spin text-sky-400" />
                <span>Extracting with AI...</span>
              </>
            ) : (
              <>
                <Sparkles size={14} className="text-sky-400" />
                <span>Extract to Markdown</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* PDF Canvas Viewport */}
      <div className="flex-1 overflow-auto p-6 flex justify-center items-start bg-[var(--bg-dark-base)]">
        {loading && (
          <div className="flex flex-col items-center justify-center h-64 gap-3 text-[var(--text-muted)]">
            <Loader2 size={28} className="animate-spin text-[var(--accent-primary)]" />
            <span>Loading PDF Document...</span>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center p-8 text-center max-w-md bg-red-950/20 border border-red-500/30 rounded-md my-auto">
            <AlertTriangle size={36} className="text-red-400 mb-2" />
            <h4 className="text-base font-semibold text-white mb-1">Unable to Open PDF</h4>
            <p className="text-xs text-red-200/80 mb-4">{error}</p>
          </div>
        )}

        <div
          className="relative rounded overflow-hidden"
          style={{ boxShadow: '0 12px 32px rgba(0, 0, 0, 0.6)' }}
        >
          <canvas ref={canvasRef} className="block" />
          <div ref={textLayerRef} className="pdf-text-layer" />
        </div>
      </div>

      {/* AI Extraction Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-[var(--bg-dark-elevated)] border border-[var(--border-medium)] rounded-md max-w-md w-full p-6 shadow-2xl animate-modal">
            <div className="flex items-center gap-2.5 text-amber-400 mb-3">
              <AlertTriangle size={20} />
              <h3 className="text-base font-semibold text-white">AI-Assisted PDF Conversion</h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
              PDF to Markdown conversion is <strong>AI-assisted and non-deterministic</strong>.
              Text-based PDFs will be extracted and restructured into Markdown headings and tables.
              Scanned or complex multi-column layouts may require manual review.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => setShowDisclaimer(false)}
                className="px-4 py-1.5 rounded text-xs text-zinc-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAIExtract}
                className="px-4 py-1.5 rounded text-xs bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-[var(--text-on-accent)] font-semibold transition-all flex items-center gap-1.5"
              >
                <Sparkles size={13} />
                <span>Proceed to Extract</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
