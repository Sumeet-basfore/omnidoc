# OmniDoc Studio (v2.0) — Step-by-Step Implementation Guide
> **Goal**: Align the running application with the `UI_Designs/` visual & functional specifications.

---

## 📋 Overview of Tasks

- **Batch 1: Critical Functional Fixes & Missing Modals** (Tasks 1–4)
- **Batch 2: Layout & Navigation Alignment** (Tasks 5–8)
- **Batch 3: Viewer Polish & Micro-Interactions** (Tasks 9–11)

---

## BATCH 1: Critical Functional Fixes & Missing Modals

### Task 1: Fix DOCX Export Formatting
**Goal**: Preserve Tiptap formatting (headings, bold, italic, lists, tables) when exporting DOCX files instead of saving unformatted text.

1. **Update `src/services/exportService.ts`**:
   - Add `tiptapToDocxBlob(jsonContent: any): Promise<Blob>` using the `docx` library.
   - Import `Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType`.
   - Walk `jsonContent.content` array:
     - `heading` (level 1-3) → `Paragraph({ heading: HeadingLevel.HEADING_X, children: parseInline(node.content) })`
     - `bulletList` / `orderedList` → map `listItem` nodes to `Paragraph({ bullet: { level: 0 }, children: ... })`
     - `table` → map rows & cells to `docx` `Table`, `TableRow`, `TableCell`
     - Inline marks (`bold`, `italic`, `underline`, `code`) → `TextRun({ text, bold: true, italics: true, font: 'Courier New' })`

2. **Update `src/components/Viewers/DocxEditor.tsx`**:
   - Replace `handleExportDocx`:
     ```ts
     const handleExportDocx = async () => {
       if (!editor) return;
       const blob = await tiptapToDocxBlob(editor.getJSON());
       downloadBlob(blob, name.endsWith('.docx') ? name : `${name}.docx`);
     };
     ```

---

### Task 2: Connect Shiki Syntax Highlighting
**Goal**: Add real syntax highlighting to `CodeViewer.tsx` using `shiki` (`one-dark-pro` theme).

1. **Update `src/components/Viewers/CodeViewer.tsx`**:
   - Import `codeToHtml` from `shiki`:
     ```ts
     import { codeToHtml } from 'shiki';
     ```
   - Add state & effect:
     ```ts
     const [highlightedHtml, setHighlightedHtml] = useState<string>('');

     useEffect(() => {
       let cancelled = false;
       const runShiki = async () => {
         try {
           const html = await codeToHtml(content, {
             lang: detectedLang === 'plaintext' ? 'text' : detectedLang,
             theme: 'one-dark-pro'
           });
           if (!cancelled) setHighlightedHtml(html);
         } catch {
           if (!cancelled) setHighlightedHtml('');
         }
       };
       runShiki();
       return () => { cancelled = true; };
     }, [content, detectedLang]);
     ```
   - Render `highlightedHtml` in JSX using `dangerouslySetInnerHTML={{ __html: highlightedHtml }}` inside a container with class `shiki-wrapper`.

2. **Update `src/styles/index.css`**:
   - Add reset rules:
     ```css
     .shiki-wrapper .shiki {
       background: transparent !important;
       font-family: var(--font-mono);
       font-size: 0.75rem;
       line-height: 1.25rem;
     }
     ```

---

### Task 3: Build Document Export Modal
**Goal**: Create a modal allowing users to pick their target export format (MD → DOCX/PDF, CSV → JSON, DOCX → PDF).

1. **Add state to `src/store/useAppStore.ts`**:
   - Add `isExportModalOpen: boolean` and `setExportModalOpen: (open: boolean) => void`.

2. **Create `src/components/Layout/ExportModal.tsx`**:
   - Match `UI_Designs/omnidoc_studio_document_export_modal/code.html`.
   - Show format-specific export options:
     - **Markdown**: Export as `.docx` (via `markdownToDocxBlob`), Export as `.pdf` (via `window.electronAPI.printToPDF`).
     - **CSV / Data Grid**: Export as `.json` (via `csvToJSON`), Export as `.csv`.
     - **JSON**: Export as `.csv` (via `jsonToCSV`), Export as `.json`.
     - **DOCX**: Export as `.docx`, Print/PDF.

3. **Wire in `src/components/Layout/TopBar.tsx`**:
   - Change TopBar `handleExport` to call `setExportModalOpen(true)`.
   - Render `<ExportModal />` in `App.tsx`.

---

### Task 4: Build Keyboard Shortcuts Modal
**Goal**: Create a shortcuts reference modal matching `UI_Designs/omnidoc_studio_keyboard_shortcuts_modal/code.html`.

1. **Add state to `src/store/useAppStore.ts`**:
   - Add `isShortcutsModalOpen: boolean` and `setShortcutsModalOpen: (open: boolean) => void`.

2. **Create `src/components/Layout/KeyboardShortcutsModal.tsx`**:
   - Display shortcut cards grouped into categories:
     - **Navigation & Search**: `⌘K` (Command Palette), `⌘B` (Toggle Sidebar), `?` (Shortcuts)
     - **File Management**: `⌘S` (Save), `⌘N` (New Doc), `⌘O` (Open File), `⌘W` (Close Tab)
     - **Markdown Editing**: `⌘B` (Bold), `⌘I` (Italic), `⌘K` (Link)
     - **AI & Research**: `✨ AI Drawer`, `⌘Shift+R` (Deep Research)

3. **Add Global Key Listener in `src/App.tsx`**:
   - Listen for `?` key (when no input is focused) or `Cmd+/` to toggle `setShortcutsModalOpen(true)`.

---

## BATCH 2: Layout & Navigation Alignment

### Task 5: Declutter TopBar & Set Height to 48px
**Goal**: Match `UI_Designs/omnidoc_studio_workspace` TopBar header.

1. **Update `src/components/Layout/TopBar.tsx`**:
   - Height: Change from `h-14` (56px) to `h-12` (48px).
   - Remove app name text `"OmniDoc Studio"` — keep gradient logo badge (`OD`) alone.
   - Active document title: Add inline double-click editing (`renameDocument`).
   - Center: Show `Search or command... ⌘K` trigger pill.
   - Right section: Icon-only Save & Export buttons with hover tooltips, compact provider badge, settings icon, and glowing `✨ AI Friend` button.

---

### Task 6: Flush Workspace TabBar & Popover Dropdown
**Goal**: Match `UI_Designs/omnidoc_studio_workspace` tab strip.

1. **Update `src/components/Layout/TabBar.tsx`**:
   - Set height to `h-9` (36px).
   - Active tab styling: Set background to `#121622` (matches editor background), remove bottom border seam (`bottom: -1px`), add `2px` top border in format accent color (`#6366f1` for Markdown, `#ef4444` for PDF, etc.).
   - Dirty dot: Change unsaved indicator to an amber dot (`bg-amber-400`).
   - `+` New Tab button: Convert to popover menu with 3 options:
     - `+ Markdown Document`
     - `+ CSV Data Grid`
     - `+ JSON Document`

---

### Task 7: Upgrade Sidebar File Items
**Goal**: Match 2-line file card design from `UI_Designs/omnidoc_studio_workspace`.

1. **Update `src/components/Layout/Sidebar.tsx`**:
   - Update Recent Files items:
     - Container: `border-l-[3px]` with format color border bar (`cyan` for MD, `red` for PDF, `indigo` for DOCX, `emerald` for CSV, `pink` for JSON, `amber` for Code).
     - Line 1: Filename in bold (`text-zinc-200`).
     - Line 2: Format badge pill (`MD`, `PDF`) + relative time ("2m ago").
   - Top action buttons: Add 3 compact create buttons under "Open File...": `+ MD`, `+ Grid`, `+ DOCX`.

---

### Task 8: Interactive Empty State View
**Goal**: Show a centered empty state when all workspace tabs are closed.

1. **Create `src/components/Layout/EmptyState.tsx`**:
   - Rendered inside `DocumentAdapterRouter.tsx` when `tabs.length === 0` or `activeTabId === null`.
   - Layout:
     - Centered `OD` gradient badge icon.
     - Heading: "No Open Documents".
     - Subtitle: "Drop a file onto the application window or press `⌘O` to open".
     - Quick action buttons: `Open File...`, `+ Markdown`, `+ Data Grid`, `+ JSON`.

---

## BATCH 3: Viewer Polish & Micro-Interactions

### Task 9: PDF Text Selection Layer Overlay
**Goal**: Make text in PDF files selectable and copyable.

1. **Update `src/components/Viewers/PdfViewer.tsx`**:
   - Change canvas surround background to neutral dark `#1a1a1a` with paper drop-shadow (`box-shadow: 0 12px 32px rgba(0,0,0,0.6)`).
   - Add `textLayerRef` container div overlaid on the canvas:
     ```tsx
     <div className="relative shadow-2xl rounded overflow-hidden">
       <canvas ref={canvasRef} />
       <div ref={textLayerRef} className="pdf-text-layer" />
     </div>
     ```
   - In page render effect, call `renderTextLayer` from `pdfjs-dist`:
     ```ts
     if (textLayerRef.current) {
       textLayerRef.current.innerHTML = '';
       const textContent = await page.getTextContent();
       const { renderTextLayer } = await import('pdfjs-dist');
       renderTextLayer({
         textContentSource: textContent,
         container: textLayerRef.current,
         viewport
       });
     }
     ```

2. **Update `src/styles/index.css`**:
   - Add `.pdf-text-layer` CSS rules for selection matching `index.css`.

---

### Task 10: Markdown Synchronized Scroll & TOC Button
**Goal**: Sync scroll positions between editor & preview panes and add a TOC generator.

1. **Update `src/components/Viewers/MarkdownEditor.tsx`**:
   - Add `syncScroll` handler:
     ```ts
     const isSyncing = useRef(false);
     const handleScroll = (source: 'editor' | 'preview') => {
       if (isSyncing.current || activeView !== 'split') return;
       isSyncing.current = true;
       if (source === 'editor' && textareaRef.current && previewRef.current) {
         const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
         const pct = scrollTop / (scrollHeight - clientHeight);
         previewRef.current.scrollTop = pct * (previewRef.current.scrollHeight - previewRef.current.clientHeight);
       } else if (source === 'preview' && previewRef.current && textareaRef.current) {
         const { scrollTop, scrollHeight, clientHeight } = previewRef.current;
         const pct = scrollTop / (scrollHeight - clientHeight);
         textareaRef.current.scrollTop = pct * (textareaRef.current.scrollHeight - textareaRef.current.clientHeight);
       }
       requestAnimationFrame(() => { isSyncing.current = false; });
     };
     ```
   - Add `handleInsertTOC`:
     - Extract headings matching `/^#{1,3} .+/gm`.
     - Build Markdown table of contents list.
     - Prepend `## Table of Contents\n\n...` to document content.
   - Add `TOC` button to toolbar.

---

### Task 11: AI Drawer Slide Animation & Markdown Chat Rendering
**Goal**: Smooth drawer transitions and rich markdown formatting in chat bubbles.

1. **Update `src/components/Layout/AICompanionDrawer.tsx`**:
   - Keep drawer mounted in DOM and use CSS `transform` for slide animation:
     ```tsx
     <aside className={`w-[380px] h-full flex flex-col border-l border-[var(--border-subtle)] bg-[#0d101a] z-30 transition-transform duration-300 ease-out ${
       isAIDrawerOpen ? 'translate-x-0' : 'translate-x-full'
     }`} style={{ position: isAIDrawerOpen ? undefined : 'absolute', right: 0 }}>
     ```

2. **Update `src/components/AI/ChatPanel.tsx`**:
   - Parse assistant message content using `marked`:
     ```tsx
     {msg.role === 'assistant' ? (
       <div className="doc-prose text-xs" dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }} />
     ) : (
       <div className="whitespace-pre-wrap">{msg.content}</div>
     )}
     ```

---

## 🔍 Verification Protocol

After implementing each task:
1. Run `npm run typecheck` — must exit with **0 errors**.
2. Run `npm run build` — verify all bundles compile.
3. Test feature in app (`npm run dev`).
