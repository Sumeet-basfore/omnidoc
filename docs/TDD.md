# Technical Design Document (TDD) — DocsViewer (OmniDoc Studio)

**System**: DocsViewer (OmniDoc Studio)
**Architecture Pattern**: Electron Multi-Process + Modular Document Adapter + Multi-Provider AI Strategy
**Stack**: Electron 33 + electron-vite + React 18 + TypeScript + Vanilla CSS Design System
**Version**: 2.0.0

---

## 1. System Architecture Overview

### 1.1 Electron Process Model

Electron splits the app into three distinct processes:

```
┌──────────────────────────────────────────────────────────┐
│                     MAIN PROCESS (Node.js)               │
│  - App lifecycle (app.on('ready'), window management)    │
│  - Native OS integration (Menu, dialog, Tray, shell)     │
│  - File system I/O (fs, path)                            │
│  - safeStorage (OS keychain encrypt/decrypt)             │
│  - electron-store (non-sensitive JSON config)            │
│  - electron-updater (auto-update from GitHub Releases)   │
│  - IPC handlers (ipcMain.handle)                         │
└────────────────────┬─────────────────────────────────────┘
                     │ contextBridge IPC (ipcRenderer)
┌────────────────────▼─────────────────────────────────────┐
│                  PRELOAD SCRIPT (sandboxed)               │
│  - Exposes safe, typed API to renderer via contextBridge │
│  - window.electronAPI.openFile()                         │
│  - window.electronAPI.saveFile()                         │
│  - window.electronAPI.getSecureKey() / setSecureKey()    │
│  - window.electronAPI.onUpdateAvailable(callback)        │
└────────────────────┬─────────────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────────────┐
│                RENDERER PROCESS (Chromium)                │
│  React 18 + TypeScript + Vite HMR                        │
│  - All UI components                                     │
│  - Document adapter engines (pdfjs, mammoth, Tiptap)     │
│  - Zustand global state store                            │
│  - AI service (fetch calls to external APIs)             │
└──────────────────────────────────────────────────────────┘
```

### 1.2 Application Layout Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│  Native App Menu (File / Edit / View / Help)                              │
├───────────────────────────────────────────────────────────────────────────┤
│  Top Bar: [File Title] [AI Provider Badge] [Cmd+P] [Cmd+K] [Export] [AI] │
├───────────────────────────────────────────────────────────────────────────┤
│  Tab Bar: [Tab1 ×] [Tab2 ×] [+ New Tab]                                  │
├────────────────────┬──────────────────────────────┬───────────────────────┤
│  Sidebar (260px)   │  Document Viewport            │  AI Companion (380px) │
│  Collapsible       │                               │  Collapsible          │
│  - File Explorer   │  <DocumentAdapterRouter />    │  - Chat (Friend/Res.) │
│  - Recent Files    │                               │  - Persona Pills      │
│  - Sample Docs     │  <InlineSelectionToolbar />   │  - Deep Research      │
│  - Drop Zone       │  (floats on text select)      │  - Web Search         │
└────────────────────┴──────────────────────────────┴───────────────────────┘
```

---

## 2. Project Structure

```
omnidoc-studio/
├── electron/
│   ├── main/
│   │   ├── index.ts          # Main process entry — window creation, app lifecycle
│   │   ├── ipc.ts            # All ipcMain.handle() definitions
│   │   ├── menu.ts           # Native OS app menu template
│   │   ├── updater.ts        # electron-updater auto-update logic
│   │   └── store.ts          # electron-store instance (non-sensitive config)
│   └── preload/
│       └── index.ts          # contextBridge — exposes electronAPI to renderer
├── src/
│   ├── components/
│   │   ├── Layout/
│   │   │   ├── TopBar.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TabBar.tsx
│   │   │   └── AICompanionDrawer.tsx
│   │   ├── Viewers/
│   │   │   ├── MarkdownEditor.tsx   # marked + KaTeX + highlight.js
│   │   │   ├── PdfViewer.tsx        # pdfjs-dist on <canvas>
│   │   │   ├── DocxEditor.tsx       # mammoth.js + Tiptap v2 + docx pkg
│   │   │   ├── DataGridEditor.tsx   # CSV/JSON interactive table
│   │   │   └── CodeViewer.tsx       # Shiki syntax-highlighted read-only viewer
│   │   ├── AI/
│   │   │   ├── ChatPanel.tsx
│   │   │   ├── DeepResearchPanel.tsx
│   │   │   └── InlineSelectionToolbar.tsx
│   │   └── Settings/
│   │       └── ProviderSettings.tsx
│   ├── services/
│   │   ├── aiService.ts        # Multi-provider AI fetch abstraction
│   │   ├── searchService.ts    # Tavily + Exa API wrappers
│   │   ├── keyService.ts       # safeStorage encrypt/decrypt via electronAPI
│   │   └── exportService.ts    # Format conversion logic
│   ├── store/
│   │   └── useAppStore.ts      # Zustand global state
│   ├── adapters/
│   │   └── documentAdapterRouter.ts  # Maps DocumentFormat → component
│   ├── types/
│   │   ├── document.ts
│   │   ├── ai.ts
│   │   └── electron.d.ts       # window.electronAPI type declarations
│   └── main.tsx                # React app entry
├── electron.vite.config.ts
├── electron-builder.yml
└── package.json
```

---

## 3. State Management — Zustand Store

```typescript
// src/types/document.ts

export type DocumentFormat =
  | 'markdown'
  | 'pdf'
  | 'docx'
  | 'csv'
  | 'json'
  | 'code'
  | 'text';

export interface DocumentItem {
  id: string;
  name: string;
  format: DocumentFormat;
  /** Raw text content, or Base64-encoded binary for PDF/DOCX */
  content: string;
  /** Absolute path on disk (undefined for untitled/new docs) */
  filePath?: string;
  isDirty?: boolean;
  metadata?: {
    pageCount?: number;
    wordCount?: number;
    sizeBytes?: number;
    lastModified?: number;
    language?: string; // for code files
  };
}

export interface WorkspaceTab {
  id: string;
  documentId: string;
  activeView: 'editor' | 'preview' | 'split' | 'grid';
  scrollPosition?: number;
}
```

```typescript
// src/store/useAppStore.ts

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  // Document workspace
  documents: Record<string, DocumentItem>;
  tabs: WorkspaceTab[];
  activeTabId: string | null;

  // UI state
  isSidebarOpen: boolean;
  isAIDrawerOpen: boolean;
  theme: 'dark'; // v1.0 dark only

  // Actions
  openDocument: (doc: DocumentItem) => void;
  closeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateDocumentContent: (docId: string, content: string) => void;
  markDirty: (docId: string, dirty: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      documents: {},
      tabs: [],
      activeTabId: null,
      isSidebarOpen: true,
      isAIDrawerOpen: false,
      theme: 'dark',
      openDocument: (doc) =>
        set((state) => {
          const tab: WorkspaceTab = {
            id: crypto.randomUUID(),
            documentId: doc.id,
            activeView: doc.format === 'markdown' ? 'split' : 'preview',
          };
          return {
            documents: { ...state.documents, [doc.id]: doc },
            tabs: [...state.tabs, tab],
            activeTabId: tab.id,
          };
        }),
      closeTab: (tabId) =>
        set((state) => ({
          tabs: state.tabs.filter((t) => t.id !== tabId),
          activeTabId:
            state.activeTabId === tabId
              ? state.tabs.at(-2)?.id ?? null
              : state.activeTabId,
        })),
      setActiveTab: (tabId) => set({ activeTabId: tabId }),
      updateDocumentContent: (docId, content) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [docId]: { ...state.documents[docId], content, isDirty: true },
          },
        })),
      markDirty: (docId, dirty) =>
        set((state) => ({
          documents: {
            ...state.documents,
            [docId]: { ...state.documents[docId], isDirty: dirty },
          },
        })),
    }),
    { name: 'omnidoc-workspace', partialize: (s) => ({ tabs: s.tabs }) }
  )
);
```

---

## 4. IPC Bridge — Preload & Main Process

### 4.1 Preload (contextBridge)

```typescript
// electron/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File system
  openFileDialog: (filters?: Electron.FileFilter[]) =>
    ipcRenderer.invoke('dialog:openFile', filters),
  saveFileDialog: (defaultName: string) =>
    ipcRenderer.invoke('dialog:saveFile', defaultName),
  readFile: (filePath: string) =>
    ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string | ArrayBuffer) =>
    ipcRenderer.invoke('fs:writeFile', filePath, content),

  // Secure key storage (OS keychain via safeStorage)
  setSecureKey: (key: string, value: string) =>
    ipcRenderer.invoke('keychain:set', key, value),
  getSecureKey: (key: string) =>
    ipcRenderer.invoke('keychain:get', key),
  deleteSecureKey: (key: string) =>
    ipcRenderer.invoke('keychain:delete', key),

  // Non-sensitive config (electron-store)
  getConfig: (key: string) => ipcRenderer.invoke('store:get', key),
  setConfig: (key: string, value: unknown) =>
    ipcRenderer.invoke('store:set', key, value),

  // Auto-update events
  onUpdateAvailable: (cb: (info: unknown) => void) =>
    ipcRenderer.on('update:available', (_e, info) => cb(info)),
  onUpdateDownloaded: (cb: () => void) =>
    ipcRenderer.on('update:downloaded', () => cb()),
  installUpdate: () => ipcRenderer.send('update:install'),

  // Recent files (OS dock/jump list)
  addRecentDocument: (filePath: string) =>
    ipcRenderer.send('app:addRecentDocument', filePath),

  // Print to PDF
  printToPDF: () => ipcRenderer.invoke('print:toPDF'),
});
```

### 4.2 Main Process IPC Handlers

```typescript
// electron/main/ipc.ts
import { ipcMain, dialog, safeStorage, app } from 'electron';
import fs from 'node:fs/promises';
import Store from 'electron-store';

const store = new Store({ name: 'omnidoc-config' });
const keychainStore = new Store({ name: 'omnidoc-keychain' });

// File system
ipcMain.handle('dialog:openFile', async (_e, filters) => {
  const { filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters });
  return filePaths[0] ?? null;
});

ipcMain.handle('dialog:saveFile', async (_e, defaultPath) => {
  const { filePath } = await dialog.showSaveDialog({ defaultPath });
  return filePath ?? null;
});

ipcMain.handle('fs:readFile', async (_e, filePath: string) => {
  return fs.readFile(filePath);
});

ipcMain.handle('fs:writeFile', async (_e, filePath: string, content: string | Buffer) => {
  await fs.writeFile(filePath, content);
});

// Secure key storage
ipcMain.handle('keychain:set', (_e, key: string, value: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    console.warn('safeStorage unavailable — using basic text fallback');
  }
  const encrypted = safeStorage.encryptString(value);
  keychainStore.set(key, encrypted.toString('base64'));
});

ipcMain.handle('keychain:get', (_e, key: string) => {
  const stored = keychainStore.get(key) as string | undefined;
  if (!stored) return null;
  try {
    return safeStorage.decryptString(Buffer.from(stored, 'base64'));
  } catch {
    return null;
  }
});

ipcMain.handle('keychain:delete', (_e, key: string) => {
  keychainStore.delete(key);
});

// Non-sensitive config
ipcMain.handle('store:get', (_e, key: string) => store.get(key));
ipcMain.handle('store:set', (_e, key: string, value: unknown) => store.set(key, value));

// Recent documents
ipcMain.on('app:addRecentDocument', (_e, filePath: string) => {
  app.addRecentDocument(filePath);
});
```

---

## 5. Document Adapter Implementation Specs

### 5.1 Document Adapter Router

```typescript
// src/adapters/documentAdapterRouter.ts
import { DocumentFormat } from '../types/document';

export function getAdapterComponent(format: DocumentFormat) {
  switch (format) {
    case 'markdown': return MarkdownEditor;
    case 'pdf':      return PdfViewer;
    case 'docx':     return DocxEditor;
    case 'csv':
    case 'json':     return DataGridEditor;
    case 'code':
    case 'text':     return CodeViewer;
  }
}
```

### 5.2 Markdown Engine (`components/Viewers/MarkdownEditor.tsx`)

- **Parser**: `marked` with custom renderer for GitHub-flavoured tables.
- **Math**: `katex` — inline `\(...\)` and display `\[...\]` blocks post-processed after marked render.
- **Syntax highlighting**: `highlight.js` — auto-detects language from fenced code block hints.
- **Views**: Three modes — `editor` (raw textarea), `preview` (rendered HTML), `split` (50/50 bidirectional sync scroll).
- **Toolbar**: Bold, Italic, Heading (H1–H3), Link, Code Block, Table Inserter, Math Block.

### 5.3 PDF Engine (`components/Viewers/PdfViewer.tsx`)

- **Renderer**: `pdfjs-dist` rendering each page onto individual `<canvas>` elements.
- **Worker**: `pdf.worker.mjs` copied to `public/` as a static asset; configured via `pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.mjs'`.
- **Features**: Virtual page rendering (only renders pages in viewport ±1), zoom controls (50%–300%), text layer overlay for selection/search, page number indicator.
- **AI Action**: "Extract to Markdown" button sends extracted text (or page screenshots for image-based PDFs) to the configured AI provider.

### 5.4 DOCX Engine (`components/Viewers/DocxEditor.tsx`)

Three-stage round-trip pipeline:

```
Stage 1 — READ:
  mammoth.convertToHtml({ arrayBuffer: docxBuffer })
  → produces clean HTML (headings, lists, bold/italic, tables)

Stage 2 — EDIT:
  <EditorContent editor={tiptapEditor} />
  Tiptap extensions: StarterKit, Table, TableRow, TableCell,
                     TableHeader, Link, Highlight, TextAlign

Stage 3 — WRITE (on "Save As .docx"):
  Walk Tiptap JSON document tree → generate docx.Document nodes
  via the `docx` npm package → Packer.toBuffer() → fs.writeFile()
```

**Known limitation** surfaced in UI: A dismissable info banner states: *"Complex Word features (tracked changes, custom styles, headers/footers) may be simplified during save. For high-fidelity round-trips, use the original Word application."*

### 5.5 Data Grid Engine (`components/Viewers/DataGridEditor.tsx`)

- **CSV parsing**: Row/column regex split with quoted-field handling; no external dependency.
- **JSON parsing**: `JSON.parse()` → if top-level is an array of objects, renders as grid; otherwise shows raw JSON tree view.
- **Table UI**: Virtual scrolling for large datasets (>1,000 rows); editable cells via `contentEditable`; add/remove row & column; sort by column header click.
- **Export**: CSV re-serialisation with proper quoting; JSON `JSON.stringify(data, null, 2)`.

### 5.6 Code Viewer (`components/Viewers/CodeViewer.tsx`)

- **Engine**: `Shiki` — uses VS Code's TextMate grammar engine for accurate syntax highlighting.
- **Mode**: **Read-only** in v1.0. Displays line numbers, horizontal scroll, word wrap toggle.
- **Languages**: Auto-detected from file extension. Supports 100+ languages out of the box.
- **Theme**: Uses a custom Shiki theme matched to the Obsidian Velvet design system.
- **AI Actions**: "Explain this file", "Summarise logic", "What does this function do?" — selected code range sent to AI with context.

> **Note**: Code *editing* is deferred to v1.1 (planned: CodeMirror 6 upgrade).

---

## 6. AI Service Layer

### 6.1 Provider Types (`types/ai.ts`)

```typescript
export type AIProviderId =
  | 'gemini'
  | 'openai'
  | 'anthropic'
  | 'openrouter'
  | 'custom'; // Ollama / LM Studio

export interface AIProviderConfig {
  id: AIProviderId;
  name: string;
  model: string;
  baseUrl?: string; // Custom endpoint override
  temperature: number;
}

// Keys are stored separately via keyService (safeStorage), not in this config object
export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface DeepResearchQuery {
  topic: string;
  depth: 'quick' | 'standard' | 'deep';
  includeCitations: boolean;
}

export interface DeepResearchResult {
  title: string;
  markdownContent: string;
  sources: Array<{ title: string; url: string; snippet: string }>;
}
```

### 6.2 Multi-Provider AI Fetcher (`services/aiService.ts`)

Unified adapter that normalises requests across provider formats:

```typescript
async function callAI(
  messages: AIMessage[],
  config: AIProviderConfig,
  apiKey: string
): Promise<string> {
  switch (config.id) {
    case 'gemini':
      return callGemini(messages, config, apiKey);
    case 'openai':
    case 'openrouter':
    case 'custom': // Ollama/LM Studio use OpenAI-compatible format
      return callOpenAICompat(messages, config, apiKey);
    case 'anthropic':
      return callAnthropic(messages, config, apiKey);
  }
}
```

| Provider | Endpoint | Format |
|---|---|---|
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | Gemini Content API |
| OpenAI / OpenRouter / Ollama / LM Studio | `{baseUrl}/v1/chat/completions` | OpenAI Chat Completions |
| Anthropic | `https://api.anthropic.com/v1/messages` | Anthropic Messages API |

### 6.3 Search Service (`services/searchService.ts`)

```typescript
// Tavily — quick structured search (AI-optimised results)
async function tavilySearch(query: string, apiKey: string): Promise<SearchResult[]>

// Exa — semantic/neural deep search + full page content extraction
async function exaSearch(query: string, apiKey: string, depth: 'search' | 'contents'): Promise<SearchResult[]>

// Combined Deep Research flow
async function deepResearch(
  query: DeepResearchQuery,
  keys: { tavily: string; exa: string }
): Promise<DeepResearchResult> {
  const [tavilyResults, exaResults] = await Promise.all([
    tavilySearch(query.topic, keys.tavily),
    exaSearch(query.topic, keys.exa, query.depth === 'deep' ? 'contents' : 'search'),
  ]);
  const combined = deduplicateAndRank([...tavilyResults, ...exaResults]);
  const markdownReport = await callAI(
    [
      { role: 'system', content: DEEP_RESEARCH_SYSTEM_PROMPT },
      { role: 'user', content: buildResearchPrompt(query.topic, combined) },
    ],
    activeConfig,
    activeKey
  );
  return { title: query.topic, markdownContent: markdownReport, sources: combined };
}
```

---

## 7. Key Management Service (`services/keyService.ts`)

API keys are never stored in component state or passed directly in props. All key access goes through the `keyService` abstraction:

```typescript
const KEY_MAP = {
  gemini:      'provider_gemini_key',
  openai:      'provider_openai_key',
  anthropic:   'provider_anthropic_key',
  openrouter:  'provider_openrouter_key',
  custom:      'provider_custom_key',
  tavily:      'search_tavily_key',
  exa:         'search_exa_key',
} as const;

export const keyService = {
  set: (provider: keyof typeof KEY_MAP, value: string) =>
    window.electronAPI.setSecureKey(KEY_MAP[provider], value),

  get: (provider: keyof typeof KEY_MAP): Promise<string | null> =>
    window.electronAPI.getSecureKey(KEY_MAP[provider]),

  delete: (provider: keyof typeof KEY_MAP) =>
    window.electronAPI.deleteSecureKey(KEY_MAP[provider]),
};
```

---

## 8. Export Service (`services/exportService.ts`)

```typescript
export type ExportFormat = 'pdf' | 'docx' | 'md' | 'json' | 'csv';

// MD → PDF: print current webview to PDF via Electron
async function markdownToPDF(): Promise<Buffer>

// MD → DOCX: parse markdown → generate docx.Document
async function markdownToDocx(markdown: string): Promise<Buffer>

// DOCX → PDF: mammoth renders to HTML → printToPDF
async function docxToPDF(docxBuffer: ArrayBuffer): Promise<Buffer>

// CSV <-> JSON: pure JS transformations
function csvToJSON(csv: string): object[]
function jsonToCSV(json: object[]): string

// PDF → MD (AI-assisted, quality varies)
async function pdfToMarkdown(
  pdfBuffer: ArrayBuffer,
  config: AIProviderConfig,
  apiKey: string
): Promise<string>
```

---

## 9. Native OS Integration

### 9.1 App Menu (`electron/main/menu.ts`)

Built via `Menu.buildFromTemplate()` — standard File / Edit / View / Help menus with platform-appropriate accelerators (`CmdOrCtrl+O`, `CmdOrCtrl+S`, etc.). On macOS, the standard "About", "Hide", and "Quit" items are placed in the application menu.

### 9.2 Drag & Drop File Opening

In the renderer, the `BrowserWindow` registers a `dragover` + `drop` listener on `document.body`. Files dropped onto the window are read via `window.electronAPI.readFile()` and opened in new tabs.

### 9.3 Recent Documents

Every file successfully opened calls `window.electronAPI.addRecentDocument(filePath)` → main process calls `app.addRecentDocument()` → OS jump list (Windows) / dock recent items (macOS) updated automatically.

### 9.4 Auto-Update (`electron/main/updater.ts`)

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.setFeedURL({ provider: 'github', owner: '<org>', repo: 'omnidoc-studio' });
autoUpdater.checkForUpdatesAndNotify(); // Runs on app startup

autoUpdater.on('update-available', (info) => {
  mainWindow.webContents.send('update:available', info);
});
autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('update:downloaded');
});
```

Renderer shows a non-intrusive toast: *"Update available — restart to install"* with a "Restart Now" button.

---

## 10. Data Persistence & Security Model

| Data Type | Storage | Security |
|---|---|---|
| API keys (AI providers) | `electron safeStorage` → encrypted blob in `omnidoc-keychain` electron-store | OS Keychain / DPAPI / libsecret |
| Search API keys (Tavily, Exa) | Same as above | Same as above |
| App config (theme, window size, recent files) | `electron-store` `omnidoc-config.json` | Plain JSON — no sensitive data |
| Open tabs (session restore) | Zustand `persist` middleware → `localStorage` | Non-sensitive tab metadata only |
| Document content | In-memory only (not written to disk unless user saves) | Stays in Electron process memory |

> **Linux safeStorage caveat**: If no secret service (libsecret / kwallet) is available on the user's Linux system, `safeStorage.isEncryptionAvailable()` returns false and falls back to `basic_text` (unencrypted). The app detects this and shows a persistent warning banner: *"Secure key storage is unavailable on this system. API keys are stored as plain text. Install GNOME Keyring or KWallet to enable encryption."*

---

## 11. Error Handling & Fallback Strategy

| Error Type | Handling |
|---|---|
| AI API failure (invalid key, rate limit, network error) | Toast notification with error detail; AI features disabled gracefully; rest of app fully functional |
| Search API failure (Tavily/Exa) | Toast notification; Deep Research panel shows error state with manual retry button |
| Malformed DOCX | mammoth error is caught; raw XML text recovery mode offered as fallback; diagnostic toast shown |
| Corrupted CSV | Parse error boundary; raw text view shown with error line highlighted |
| PDF render error | Per-page error state with retry; rest of document remains accessible |
| safeStorage unavailable (Linux) | Persistent warning banner; keys stored as plain text with explicit user acknowledgement |
| File too large (>100MB) | Warning dialog before opening; user can proceed or cancel |
| Auto-update failure | Silent failure — logged to console; next startup will retry |

---

## 12. Full Dependency List

### Runtime Dependencies

```json
{
  "electron": "^33.0.0",
  "react": "^18.3.0",
  "react-dom": "^18.3.0",

  "zustand": "^5.0.0",
  "electron-store": "^10.0.0",
  "electron-updater": "^6.3.0",

  "pdfjs-dist": "^4.7.0",
  "mammoth": "^1.8.0",
  "@tiptap/react": "^2.9.0",
  "@tiptap/starter-kit": "^2.9.0",
  "@tiptap/extension-table": "^2.9.0",
  "@tiptap/extension-table-row": "^2.9.0",
  "@tiptap/extension-table-cell": "^2.9.0",
  "@tiptap/extension-table-header": "^2.9.0",
  "@tiptap/extension-link": "^2.9.0",
  "@tiptap/extension-text-align": "^2.9.0",
  "@tiptap/extension-highlight": "^2.9.0",
  "docx": "^9.1.0",

  "marked": "^14.0.0",
  "katex": "^0.16.0",
  "highlight.js": "^11.10.0",
  "shiki": "^1.22.0",

  "@google/generative-ai": "^0.21.0",
  "openai": "^4.67.0",
  "@anthropic-ai/sdk": "^0.32.0",
  "@tavily/core": "^0.5.0",
  "exa-js": "^1.4.0",

  "lucide-react": "^0.460.0",
  "react-resizable-panels": "^2.1.0",
  "clsx": "^2.1.0"
}
```

### Dev Dependencies

```json
{
  "electron-vite": "^3.0.0",
  "electron-builder": "^25.1.0",
  "typescript": "^5.6.0",
  "vite": "^6.0.0",
  "@vitejs/plugin-react": "^4.3.0",
  "@types/react": "^18.3.0",
  "@types/react-dom": "^18.3.0",
  "@types/node": "^22.0.0",
  "@types/katex": "^0.16.0"
}
```

---

## 13. Build & Distribution

### electron-builder.yml

```yaml
appId: com.omnidoc.studio
productName: OmniDoc Studio
directories:
  output: dist-electron

mac:
  target: [dmg, zip]
  arch: [x64, arm64]
  category: public.app-category.productivity

win:
  target: [nsis, portable]
  arch: [x64]

linux:
  target: [AppImage, deb, rpm]
  arch: [x64]
  category: Office

publish:
  provider: github
  owner: <org>
  repo: omnidoc-studio
```

### Scaffold Command

```bash
npm create @quick-start/electron@latest omnidoc-studio -- --template react-ts
```
