# OmniDoc Studio (DocsViewer v2.0) — Project Phases & Progress Roadmap

> Detailed breakdown of completed accomplishments, current phase tasks, and upcoming milestones.

---

## 📊 Overall Progress Summary

- **Phase 1: Architecture & Foundation** — 100% Completed ✅
- **Phase 2: Multi-Format Document Adapters & IPC** — 90% Completed 🟢
- **Phase 3: AI Companion & Deep Research Engine** — 100% Completed ✅
- **Phase 4: Functional Bug Fixes & Precision Refinements** — Pending Execution 🟡
- **Phase 5: Visual UI/UX Modernization & Polish** — Pending Execution 🟡
- **Phase 6: v1.1 Advanced Feature Roadmap** — Deferred / Post-v1.0 🔮

---

## Phase 1: Core Architecture & Scaffold (100% COMPLETED) ✅

- [x] **Electron 33 + Vite Scaffold**: Established `electron-vite` project structure with multi-process setup (`main`, `preload`, `renderer`).
- [x] **TypeScript Configuration**: Separate composite typecheck targets (`tsconfig.node.json`, `tsconfig.web.json`).
- [x] **Zustand State Store**: Implemented `useAppStore` for document management, active tabs, AI configurations, and recent files with persistent state partialization.
- [x] **Secure IPC Layer**: Created sandboxed `contextBridge` in preload exposing typed `window.electronAPI` for binary/text file I/O and safe storage.
- [x] **Secure Key Storage**: Implemented `electron.safeStorage` (macOS Keychain / Windows DPAPI / Linux Secret Service) with headless fallback.
- [x] **Tailwind CSS Integration**: Added `@tailwindcss/vite` plugin and `@import "tailwindcss"` in `index.css`.

---

## Phase 2: Document Viewers & Editors (90% COMPLETED) 🟢

- [x] **Markdown Studio (`MarkdownEditor.tsx`)**:
  - [x] GFM rendering via `marked` with breaks
  - [x] Inline `$...$` and display `$$...$$` KaTeX formula rendering
  - [x] Code block syntax highlighting via `highlight.js`
  - [x] View switcher pills (`[Raw]`, `[Split]`, `[Preview]`)
  - [x] Formatting toolbar (Bold, Italic, Headings, Link, Code, Table, KaTeX)
- [x] **PDF Studio (`PdfViewer.tsx`)**:
  - [x] Canvas rendering via `pdfjs-dist` from base64 buffer
  - [x] Locally bundled `pdf.worker.min.mjs` (100% offline capable)
  - [x] Page navigation & zoom controls (50%–300%)
  - [x] Render task cancellation on zoom/page change
  - [x] AI "Extract to Markdown" with disclaimer notice
- [x] **DOCX Studio (`DocxEditor.tsx`)**:
  - [x] Mammoth.js HTML parsing from DOCX binary
  - [x] Tiptap v2 WYSIWYG editor with headings, bold, italic, alignment, lists, and tables
  - [x] Warning banner informing user of round-trip limitation
- [x] **Data Grid Studio (`DataGridEditor.tsx`)**:
  - [x] CSV parser with quote escaping & JSON array parser
  - [x] Interactive table with inline cell editing & type coercion
  - [x] Add/delete rows & columns with confirmation
  - [x] Column sorting (asc/desc arrows) & live search row filter
  - [x] Export to CSV or JSON
- [x] **Code Studio (`CodeViewer.tsx`)**:
  - [x] Monospaced line numbers view
  - [x] Search in file & word wrap toggle
  - [x] AI code explanation triggers ("Explain File", "Summarize Logic")
  - [x] Copy code to clipboard

---

## Phase 3: AI Companion & Deep Research Engine (100% COMPLETED) ✅

- [x] **Multi-Provider AI Abstraction (`aiService.ts`)**:
  - [x] Google Gemini (`gemini-1.5-flash`)
  - [x] Anthropic Claude (`claude-3-5-sonnet`)
  - [x] OpenAI (`gpt-4o-mini`)
  - [x] OpenRouter
  - [x] Ollama / LM Studio (Local endpoint)
  - [x] Document context injection (active doc name, format, content preview up to 15k chars)
- [x] **AI Friend Chat Panel (`ChatPanel.tsx`)**:
  - [x] 4 persona modes: Friend Co-Writer, Researcher, Proofreader, Brainstormer
  - [x] Auto-scroll to latest message
  - [x] Copy response & "Insert in Doc" buttons
  - [x] Key missing error alert banner
- [x] **Deep Research Engine (`searchService.ts` & `DeepResearchPanel.tsx`)**:
  - [x] Parallel Tavily + Exa search queries with URL deduplication
  - [x] Depth selector (`Quick`, `Standard`, `Deep`) & citations toggle
  - [x] Structured research report template synthesis
  - [x] "Open as New Tab" and "Insert Here" actions
- [x] **Inline Selection Toolbar (`InlineSelectionToolbar.tsx`)**:
  - [x] Floating context toolbar on text selection (Polish, Simplify, Expand, Rephrase, Research, Ask)

---

## Phase 4: Functional Bug Fixes & Refinements (PENDING) 🟡

- [ ] **DOCX Formatting Export**: Walk Tiptap JSON tree directly to build `docx` nodes (preserve bold, italic, headings, lists, tables).
- [ ] **Shiki Code Highlighting**: Replace plain code line loop in `CodeViewer.tsx` with Shiki `codeToHtml()`.
- [ ] **MD→DOCX Inline Formatting**: Enhance `markdownToDocxBlob()` to parse `**bold**`, `*italic*`, numbered lists, blockquotes, and GFM tables.
- [ ] **Split-View Scroll Sync**: Implement percentage-based bidirectional scroll synchronization in `MarkdownEditor.tsx`.
- [ ] **PDF Text Layer**: Add `pdfjs TextLayer` overlay in `PdfViewer.tsx` to enable native text selection and copying.
- [ ] **Export Format Picker Modal**: Create `ExportModal.tsx` for target format selection.
- [ ] **Markdown Table of Contents**: Add a "TOC" button in `MarkdownEditor.tsx` toolbar.

---

## Phase 5: Visual UI/UX Modernization & Polish (PENDING) 🟡

- [ ] **TopBar Declutter**: Remove app text, make Save/Export icon-only, move search bar to `Cmd+K` command palette.
- [ ] **Seamless Active Tab**: Join active tab background seamlessly to the editor panel (remove bottom border seam).
- [ ] **AI Drawer Slide Animation**: Add CSS `translateX` slide transition to `AICompanionDrawer.tsx`.
- [ ] **Sidebar Metadata**: Upgrade recent file items to 2-line cards with format border accent bar + relative timestamps.
- [ ] **Interactive Empty State**: Add centered empty state component when no tabs are open.
- [ ] **Markdown Rendering in AI Chat**: Render AI assistant responses via `marked` inside `ChatPanel.tsx`.
- [ ] **Tab Bar Popover Menu**: Add dropdown menu to `+` button in `TabBar.tsx` (`+ Markdown`, `+ Data Grid`, `+ JSON`).
- [ ] **Markdown Keyboard Listeners**: Wire `Cmd+B`, `Cmd+I`, `Cmd+K` inside `MarkdownEditor.tsx`.

---

## Phase 6: v1.1 Advanced Feature Roadmap (DEFERRED) 🔮

- [ ] **Local Project Context RAG**: Index project folders into vector embeddings via `@xenova/transformers` for local search.
- [ ] **PDF Highlights & Annotations**: Save highlights, notes, and visual markup overlay on PDF documents.
- [ ] **CodeMirror 6 Upgrade**: Enable full code editing capability in `CodeViewer.tsx`.
- [ ] **System Tray & Quick Capture**: Minimize to system tray with a floating scratchpad note shortcut.
- [ ] **Multi-Window Support**: Tear off tabs into separate OS windows.
