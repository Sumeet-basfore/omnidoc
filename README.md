# OmniDoc Studio (v2.0)

> **OmniDoc Studio** is a unified, cross-platform desktop document workspace built on **Electron 33**, **React 18**, and **TypeScript**. It combines viewing, editing, and format conversions across all major file types with a built-in AI research partner.

---

## ⚡ Core Capabilities

- **Unified Multi-Format Workspace**: Native, zero-context-switch editing and viewing for:
  - **Markdown (`.md`)**: Split live preview, synchronized scrolling, table generator, and KaTeX math formulas.
  - **PDF (`.pdf`)**: Selectable text overlay layer, zoom controls, rendering task cancellation, and AI-assisted extraction.
  - **DOCX (`.docx`)**: Mammoth.js parsing and Tiptap v2 WYSIWYG editor with rich DOCX export preserving formatting.
  - **Data Grid (`.csv`, `.json`)**: Spreadsheets with inline cell editing, sorting, column additions, and bidirectional format conversions.
  - **Code Studio (`.ts`, `.py`, `.rs`, etc.)**: Shiki-powered syntax coloring with `one-dark-pro`, line numbers, and in-file search.
- **Omni & Deep Research Companion**:
  - **Persona Modes**: Co-writer, Researcher, Proofreader, and Brainstormer.
  - **Deep Web Research**: Autonomous Tavily and Exa search synthesis with citations and domain filters.
  - **Multi-Provider Support**: Google Gemini, Anthropic Claude, OpenAI, and local Ollama / LM Studio instances.
- **Midnight Instrument & Paper Design**:
  - 48px decluttered header with inline double-click title renaming.
  - 36px flush tab bar with active format accent borders and dirty state indicators.
  - Sidebar 2-line cards with format-coded indicators and quick-create actions.
  - Contextual Document Export modal (`⌘E`) and Keyboard Shortcuts reference (`?` / `⌘/`).

---

## 🛠️ Tech Stack

- **Desktop Shell**: Electron 33 with IPC file streaming and window management.
- **Frontend Framework**: React 18 + TypeScript + electron-vite.
- **Styling**: Tailwind CSS v4 with custom Obsidian Velvet design tokens.
- **State Management**: Zustand 5 store with localStorage persistence.
- **Core Libraries**:
  - Tiptap v2 + StarterKit for WYSIWYG editing
  - Shiki 1.22 for code highlighting
  - `pdfjs-dist` 4.x with local bundled worker
  - `docx` npm package for document serialization
  - Mammoth for DOCX unpacking
  - KaTeX for LaTeX mathematical equations

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- `npm` 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/Sumeet-basfore/omnidoc.git
cd omnidoc

# Install dependencies
npm install
```

### Development

```bash
# Start the Electron application in dev mode with HMR
npm run dev
```

### Quality & Builds

```bash
# Run TypeScript static analysis
npm run typecheck

# Build release binaries for production
npm run build
```

---

## ⌨️ Key Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | Command Palette |
| `⌘O` / `Ctrl+O` | Open File from Disk |
| `⌘N` / `Ctrl+N` | Create New Markdown Document |
| `⌘S` / `Ctrl+S` | Save Active Document |
| `⌘B` / `Ctrl+B` | Toggle Left Sidebar |
| `⌘Shift+R` | Toggle AI Companion Drawer |
| `?` / `⌘/` | Keyboard Shortcuts Reference |

---

## 📄 License

MIT © OmniDoc Studio Team
