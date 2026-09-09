import React, { useState, useEffect } from 'react';
import mammoth from 'mammoth';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Info,
  Download,
  Loader2
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { tiptapToDocxBlob, downloadBlob } from '../../services/exportService';

interface DocxEditorProps {
  documentId: string;
  name: string;
  content: string; // Base64 encoded or HTML string
}

export const DocxEditor: React.FC<DocxEditorProps> = ({ documentId, name, content }) => {
  const { updateDocumentContent } = useAppStore();
  const [initialHtml, setInitialHtml] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [bannerDismissed, setBannerDismissed] = useState<boolean>(false);

  // Convert docx binary (base64) to HTML via mammoth
  useEffect(() => {
    let isCancelled = false;

    const parseDocx = async () => {
      try {
        if (!content) {
          setInitialHtml('<p>Start typing your Word document content here...</p>');
          setIsLoading(false);
          return;
        }

        // If already HTML
        if (content.trim().startsWith('<') || !content.startsWith('UEsDB')) {
          setInitialHtml(content);
          setIsLoading(false);
          return;
        }

        const binary = atob(content);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }

        const result = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer });
        if (!isCancelled) {
          setInitialHtml(result.value || '<p></p>');
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to parse docx via mammoth:', err);
        if (!isCancelled) {
          setInitialHtml('<p>Unable to fully parse DOCX. You can edit the text directly.</p>');
          setIsLoading(false);
        }
      }
    };

    parseDocx();
    return () => {
      isCancelled = true;
    };
  }, [content]);

  // Configure Tiptap editor
  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        Link.configure({ openOnClick: false }),
        Highlight,
        TextAlign.configure({ types: ['heading', 'paragraph'] })
      ],
      content: initialHtml,
      onUpdate: ({ editor }) => {
        updateDocumentContent(documentId, editor.getHTML());
      }
    },
    [initialHtml]
  );

  const handleExportDocx = async () => {
    if (!editor) return;
    const blob = await tiptapToDocxBlob(editor.getJSON());
    downloadBlob(blob, name.endsWith('.docx') ? name : `${name}.docx`);
  };

  if (isLoading || !editor) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)] bg-[#0d1017]">
        <Loader2 size={28} className="animate-spin text-[var(--accent-primary)]" />
        <span className="text-xs">Converting DOCX with Mammoth engine...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#0d1017] overflow-hidden select-none">
      {/* Informative Limitation Banner */}
      {!bannerDismissed && (
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-950/40 border-b border-indigo-500/20 text-indigo-200 text-xs">
          <div className="flex items-center gap-2">
            <Info size={15} className="text-indigo-400 shrink-0" />
            <span>
              <strong>DOCX Studio Mode:</strong> Complex Word features (tracked changes, embedded OLE objects) may be
              simplified during round-trip.
            </span>
          </div>
          <button
            onClick={() => setBannerDismissed(true)}
            className="text-xs text-indigo-300 hover:text-white ml-3 underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Tiptap WYSIWYG Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-glass)] text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('bold') ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('italic') ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Italic"
          >
            <Italic size={14} />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('heading', { level: 1 })
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Heading 1"
          >
            <Heading1 size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('heading', { level: 2 })
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Heading 2"
          >
            <Heading2 size={14} />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('bulletList')
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Bullet List"
          >
            <List size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-colors ${
              editor.isActive('orderedList')
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-white/10 hover:text-white'
            }`}
            title="Numbered List"
          >
            <ListOrdered size={14} />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
            title="Align Left"
          >
            <AlignLeft size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
            title="Align Center"
          >
            <AlignCenter size={14} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
            title="Align Right"
          >
            <AlignRight size={14} />
          </button>

          <div className="w-[1px] h-4 bg-white/10 mx-1" />

          <button
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
            className="p-1.5 rounded hover:bg-white/10 text-zinc-400 hover:text-white"
            title="Insert Table"
          >
            <TableIcon size={14} />
          </button>
        </div>

        <button
          onClick={handleExportDocx}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 hover:text-white hover:bg-indigo-600/50 transition-all font-medium text-xs"
        >
          <Download size={13} />
          <span>Export .docx</span>
        </button>
      </div>

      {/* Editor Content Area Styled as Document Canvas */}
      <div className="flex-1 overflow-y-auto p-10 flex justify-center bg-[#08090e]">
        <div className="w-full max-w-4xl min-h-[900px] bg-[#121622] border border-[var(--border-subtle)] rounded-xl shadow-2xl p-12 doc-prose">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
};
