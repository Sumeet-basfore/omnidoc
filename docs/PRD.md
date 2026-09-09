# Product Requirements Document (PRD) — DocsViewer (OmniDoc Studio)

**Product Name**: DocsViewer (OmniDoc Studio)
**Target Audience**: Developers, Researchers, Writers, Tech Leads, and Personal Power Users
**Version**: 2.0.0
**Status**: Revised — Spec Approved (Desktop Edition)
**Distribution**: Open-Source (planned)
**Platforms**: Windows 10+, macOS 12+, Linux (Ubuntu 20.04+, Fedora, Arch)

---

## 1. Product Vision & Overview

DocsViewer (OmniDoc Studio) is a unified, high-performance **cross-platform desktop application** designed for viewing, editing, converting, and AI-assisted creation across all major document formats: `.md`, `.pdf`, `.docx`, `.csv`, `.json`, and code/text files.

Built on **Electron + React + TypeScript**, it runs natively on Windows, macOS, and Linux — providing a consistent, feature-complete experience across all platforms without a browser or internet connection for core features.

Beyond standard viewing and editing, DocsViewer integrates an **AI Friend & Deep Research Agent** — a warm, collaborative AI companion that can search the live web, synthesize complex research topics, co-write documents alongside the user, perform peer reviews, and execute inline document transformations.

> **Philosophy**: Privacy-first, offline-capable for core features, and bring-your-own-API-key for all AI functionality. Document content never leaves the user's machine unless explicitly sent to a user-configured AI endpoint.

---

## 2. Core Value Propositions

1. **All-in-One Multi-Format Desktop Studio**: Eliminates context switching between Adobe Acrobat, MS Word, Typora/VS Code, and Excel.
2. **Deep Research Assistant**: Performs web searches via Tavily and Exa AI, gathers technical docs/specifications, and drafts complete research reports with hyperlinked citations.
3. **AI Friend Persona**: Works alongside the user as a warm, constructive co-writer and proofreader — not an impersonal prompt box.
4. **Universal AI Provider Freedom**: Full user control over AI providers — bring your own keys for OpenAI, Anthropic, Gemini, OpenRouter, or run 100% offline via Ollama / LM Studio.
5. **Privacy & Security First**: All document parsing is done locally (client-side, in-process). API keys are encrypted using the OS keychain — never stored as plain text.
6. **Native Desktop Integration**: Native file open/save dialogs, drag-and-drop file opening from the OS, recent files, and auto-updates via GitHub Releases.

---

## 3. Feature Matrix & Functional Requirements

### 3.1 Document Adapter Ecosystem

| Document Format | Engine Stack | Viewing | Editing | AI Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **Markdown (`.md`)** | marked + KaTeX + highlight.js | Live preview, TOC, KaTeX math, syntax highlighting, word count | Split-screen editor (raw + preview), WYSIWYG formatting toolbar, table builder | Auto-expand outline, rewrite section, generate TOC, format math |
| **PDF (`.pdf`)** | pdfjs-dist | Multi-page scroll, zoom (50%–300%), text layer search, page navigation | Highlight annotations (v1.1) | AI text extraction to Markdown (quality varies — see §3.1.1), AI document summariser |
| **DOCX (`.docx`)** | mammoth.js + Tiptap v2 + docx pkg | Renders native styles, headings, tables, embedded images | Full Tiptap WYSIWYG editor: Bold, Italic, Headings, Lists, Align, Tables, Links | Polish writing, rephrase tone, export to PDF / MD |
| **Data (`.csv`, `.json`)** | Custom Interactive Data Grid | Tabular view, row/col filter, sortable headers | Inline cell edit, add/remove row & column, CSV export | AI Data Analyst, auto-clean CSV, query JSON, summarise insights |
| **Code / Text (`.txt`, `.py`, `.js`, etc.)** | Shiki (syntax viewer) | Syntax-highlighted read-only viewer, line numbers, search, word wrap | No code editing (v1.0) — view-only with copy-to-clipboard | Code explanation, logic summary, "what does this do?" AI queries |

#### 3.1.1 PDF → Markdown Conversion (AI-Assisted)

PDF to Markdown conversion is **AI-assisted**, not deterministic. Quality depends on the PDF type:

- **Clean/text-based PDFs**: pdfjs-dist extracts text layer → AI reformats into structured Markdown. Good quality.
- **Scanned/image-based PDFs**: Requires AI vision model (e.g., Gemini 1.5 Flash's vision capability) for OCR. Quality varies by scan clarity.
- **Complex layouts** (multi-column, tables, figures): AI best-effort reformatting; user should review output.

The UI must display a clear disclaimer when initiating this conversion.

#### 3.1.2 DOCX Round-Trip Architecture

DOCX editing uses a three-stage pipeline:

```
OPEN:  mammoth.js     → Converts .docx → clean HTML
EDIT:  Tiptap v2      → React WYSIWYG editor (ProseMirror-based)
SAVE:  docx npm pkg   → Serialises editor content → new .docx file
```

**Known limitation (communicated to users):** Complex Word features — tracked changes, custom named styles, headers/footers, footnotes, embedded OLE objects — won't survive the round-trip. This is an open-source ecosystem limitation.

---

### 3.2 AI Friend & Deep Research Agent

#### 3.2.1 Deep Research Mode

- **Primary search**: Tavily API — keyword-style queries returning structured, AI-ready answer summaries with citations.
- **Semantic search**: Exa AI — neural/embedding-based search for conceptually related content, full-page extraction, and discovery.
- **Research flow**: User enters a topic → system runs Tavily quick search + Exa deep crawl → AI synthesises into a structured Markdown research report with hyperlinked references.
- Both APIs are user-provided BYOK (added in Settings alongside AI model keys). Free tiers on both (no credit card required) are sufficient for personal use.

#### 3.2.2 AI Friend Co-Writer Persona

- Conversational chat panel in the right sidebar drawer.
- **Persona toggles**: *Friendly Co-Writer*, *Deep Researcher*, *Strict Proofreader*, *Brainstormer*.
- Proactive peer feedback on document tone, clarity, and structure when requested.
- Chat history persisted per session in memory (not written to disk).

#### 3.2.3 Inline Selection Assistant

- Floating context toolbar appears when text is selected in any document viewport.
- **Quick actions**: ✨ *Fix & Polish*, 💡 *Simplify*, 📝 *Expand*, 🔄 *Rephrase (Professional)*, 🔍 *Research This Topic*, 💬 *Ask AI Friend*.

#### 3.2.4 Universal API Provider Settings

- **AI models**: Google Gemini (1.5 Flash / 2.0 Pro), Anthropic Claude (3.5 Sonnet / Opus), OpenAI (GPT-4o / GPT-4o-mini), OpenRouter, Custom Endpoint (Ollama `http://localhost:11434/v1`, LM Studio).
- **Research APIs**: Tavily API key, Exa AI API key (both optional — Deep Research is disabled if neither is configured).
- API key test utility for every provider.
- Keys encrypted via `electron.safeStorage` → OS keychain (macOS Keychain, Windows DPAPI, Linux libsecret/kwallet). **Never stored as plain text.**

---

### 3.3 Workspace & Layout

- **Multi-Tab Workspace**: Open multiple files simultaneously; drag tabs to reorder; close indicator; unsaved-change dot indicator.
- **Single Window (v1.0)**: All documents open in tabs within one application window. Multi-window support is a v1.1 feature.
- **Sidebar File Manager** (collapsible, 260px): Local file explorer, recent documents, built-in sample library, drag-and-drop file drop zone.
- **Top Command Header**: Active file title, AI provider badge, quick search/file launcher (`Cmd/Ctrl+P`), AI command bar (`Cmd/Ctrl+K`), Export modal, Theme toggle.
- **Native App Menu**: Standard OS-native File / Edit / View / Help menu bar (Electron `Menu.buildFromTemplate`).
- **Keyboard Shortcuts**: Registered at OS level via Electron `globalShortcut` for critical actions (new file, open file, save).

---

### 3.4 Export & Conversion

| From | To | Method | Notes |
| :--- | :--- | :--- | :--- |
| Markdown | PDF | `electron.webContents.printToPDF()` | High fidelity |
| Markdown | DOCX | `docx` npm package | Good fidelity |
| DOCX | PDF | mammoth → HTML → `printToPDF()` | Good fidelity; complex styles may simplify |
| CSV | JSON | Pure JS parser | Lossless |
| JSON | CSV | Pure JS serialiser | Lossless (flat objects only) |
| PDF | Markdown | AI-assisted (see §3.1.1) | Quality varies; user must review |

---

### 3.5 Native Desktop Integration

- **File Association**: Register as a handler for `.md`, `.pdf`, `.docx`, `.csv`, `.json`, `.txt` on install (OS protocol).
- **Drag & Drop**: Files dragged from OS Finder/Explorer/Files onto the app window open immediately in a new tab.
- **Recent Files**: OS-level recent documents list (macOS dock menu, Windows Jump List) via `app.addRecentDocument()`.
- **Auto-Update**: `electron-updater` checking GitHub Releases on app startup. User prompted to install update and restart.
- **System Tray (v1.1)**: Minimal tray icon for quick-open and running background AI tasks.

---

## 4. Non-Functional Requirements (NFRs)

### 4.1 Performance

- Application cold-start time under **3 seconds** (Electron baseline included).
- PDF rendering smooth at **60fps** scroll.
- Editor (Tiptap) input latency under **16ms**.
- File open (any format up to 50MB) under **2 seconds**.

### 4.2 Usability & Aesthetics

- Modern velvet dark glassmorphic design system ("Obsidian Velvet & Neon Cyber Glass").
- High-contrast, legible typography (Inter, Fira Code, Outfit).
- Fluid UI micro-interactions and animations.
- Fully keyboard-navigable (accessibility baseline).

### 4.3 Privacy & Security

- **API keys**: Encrypted at rest via `electron.safeStorage`. Never transmitted to any telemetry server.
- **Document content**: Parsed entirely in-process. Never uploaded unless the user explicitly triggers an AI action.
- **No analytics**: No telemetry, crash reporting, or usage tracking in v1.0.
- **Open-source**: Full source code published; users can audit all network calls.

### 4.4 Platform Compatibility

- **Windows**: Windows 10 (x64) and Windows 11.
- **macOS**: macOS 12 Monterey and later (Apple Silicon + Intel via universal binary).
- **Linux**: Ubuntu 20.04+, Fedora 38+, Arch Linux. AppImage + .deb + .rpm packaging.

---

## 5. Out of Scope (v1.0)

- PDF annotation / highlighting write-back
- Code file editing (read-only viewer only)
- Project/folder context RAG (planned for v1.1)
- Multi-window support
- System tray
- Collaborative editing / sync
- Mobile or web app distribution
- Word-count tracking / writing goals

---

## 6. v1.1 Roadmap (Planned, Not Committed)

1. **Project Context Mode (Local RAG)**: Load a folder → embed documents locally → ask AI questions about the project. Uses `@xenova/transformers` for in-process embeddings (no API key required for embedding step).
2. **PDF Annotations**: Highlight + annotate PDFs with write-back to file.
3. **Multi-Window**: Tear tabs off into independent windows.
4. **System Tray**: Background AI task runner.
5. **Code File Editing**: Upgrade code viewer to a full editor (CodeMirror 6).

---

## 7. Success Metrics

- **Zero-friction document opening**: Any `.md`, `.pdf`, `.docx`, `.csv`, `.json`, or code file opens in under 2 seconds.
- **Research acceleration**: Time to produce a structured technical research document reduced by 70% using Deep Research Mode vs. manual browser research.
- **Universal model compatibility**: 100% functional compatibility across Gemini, OpenAI, Claude, and local Ollama models.
- **Cross-platform parity**: Feature set and visual output are identical across Windows, macOS, and Linux.
