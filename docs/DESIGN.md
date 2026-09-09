# OmniDoc Studio (v2.0) — Design System & UI/UX Specification

**Theme Name**: Obsidian Velvet & Neon Cyber Glass
**Target Mood**: Premium, Focus-enhancing, Fluid, latest Studio
**Target Platforms**: Linux, macOS, Windows (Electron 33 Desktop)

---

## 1. Color Tokens & Palette

```css
:root {
  /* Surface Colors */
  --bg-dark-base: #0a0c12;       /* Deep void background */
  --bg-dark-surface: #121622;    /* Obsidian slate panels */
  --bg-dark-elevated: #1a2030;   /* Velvet dark card background */
  --bg-glass: rgba(18, 22, 34, 0.75);
  --bg-glass-hover: rgba(26, 32, 48, 0.85);

  /* Border & Divider Tokens */
  --border-subtle: rgba(255, 255, 255, 0.08);
  --border-medium: rgba(255, 255, 255, 0.15);
  --border-active: #6366f1;

  /* Accent & Highlight Colors */
  --accent-primary: #6366f1;       /* Indigo / Violet */
  --accent-primary-hover: #4f46e5;
  --accent-secondary: #06b6d4;     /* Electric Cyan */
  --accent-sparkle: #ec4899;       /* AI Pink Magenta */
  --accent-success: #10b981;       /* Emerald Data */
  --accent-warning: #f59e0b;       /* Amber Code */
  --accent-danger: #ef4444;        /* Crimson PDF Red */

  /* Text & Content Tokens */
  --text-main: #f3f4f6;          /* High contrast off-white */
  --text-muted: #9ca3af;         /* Slate gray secondary text */
  --text-dim: #6b7280;           /* Faded tertiary text */
  --text-accent: #818cf8;        /* Soft violet accent text */

  /* Shadows & Glassmorphism Blur */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
  --glass-backdrop-blur: blur(16px);
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-pill: 9999px;
}
```

---

## 2. Typography System

- **Primary UI & Document Body**: `'Inter', system-ui, -apple-system, sans-serif`
- **Code & Markdown Source**: `'Fira Code', 'JetBrains Mono', Consolas, monospace`
- **Document Titles & Headings**: `'Outfit', 'Inter', sans-serif`

### Type Scale
- `--text-xs`: `0.75rem` (12px) — Badges, secondary metadata, tooltips
- `--text-sm`: `0.875rem` (14px) — Code editor, chat content, form inputs
- `--text-base`: `1rem` (16px) — Primary document body prose
- `--text-lg`: `1.125rem` (18px) — Subheadings, modal titles
- `--text-xl`: `1.25rem` (20px) — Document H3, panel headers
- `--text-2xl`: `1.5rem` (24px) — Document H2
- `--text-3xl`: `1.875rem` (30px) — Main Document H1

---

## 3. Panel & Component Specifications

### 3.1 Top Bar & Navigation Header
- **Height**: `48px` (compact, decluttered layout)
- **Background**: `var(--bg-glass)` with `backdrop-filter: blur(16px)`
- **Border Bottom**: `1px solid var(--border-subtle)`
- **Layout**:
  - **Left**: Window controls, hamburger sidebar toggle, logo badge ("OD"), document title breadcrumb with inline format badge ("MD", "PDF", "DOCX", "CSV", "JSON", "CODE").
  - **Center**: Quick command trigger pill (`⌘K` hint button).
  - **Right**: Save button (disk icon), Export button (tray icon), AI Provider Badge (`Cpu` icon + Provider Name), Settings gear icon, and glowing gradient toggle button (`✨ AI Friend`).

### 3.2 Workspace Tab Bar
- **Height**: `36px`
- **Background**: `#090b10`
- **Tabs**: Flush browser-style tab bar.
  - Active Tab: Matches editor background (`#121622` / `#0d1017`), white text, format color-coded icon, amber unsaved dirty dot, and close button.
  - Inactive Tabs: Semi-transparent background with hover highlight.
  - Right: `+` New Tab button with popover dropdown (`+ Markdown`, `+ Data Grid`, `+ JSON`).

### 3.3 Sidebar File Explorer
- **Width**: `260px` (Collapsible)
- **Top Area**: "Open File..." primary button with indigo glow, plus 3 compact creation buttons (`+ MD`, `+ Grid`, `+ DOCX`).
- **Sample Library**: Format-categorized built-in documents with format icons (Cyan MD, Red PDF, Indigo DOCX, Emerald CSV, Pink JSON, Amber Code).
- **Recent Files List**: 2-line file item cards featuring a `3px` format accent border bar on left, relative timestamp ("2m ago"), format badge pill, and hover highlight.
- **Bottom**: Drag & drop zone hint + application status bar (`v2.0.0 · Connected · AI Active`).

### 3.4 Multi-Format Document Viewports

1. **Markdown Studio (`MarkdownEditor.tsx`)**:
   - Sub-header toolbar: Bold, Italic, H1, H2, H3, Link, Code, Table, KaTeX, TOC, Word Count, Read Time, and View Switcher pills (`[Raw]`, `[Split]`, `[Preview]`).
   - Editor View: Split 50/50 with sync scroll between raw monospaced editor and rendered `doc-prose` preview.
2. **PDF Studio (`PdfViewer.tsx`)**:
   - Canvas viewport on neutral `#1a1a1a` background with paper drop-shadow.
   - Text selection layer overlay (`pdf-text-layer`) for selecting/copying text.
   - Page navigation, zoom (50%-300%), and AI "Extract to Markdown" with disclaimer notice modal.
3. **DOCX Studio (`DocxEditor.tsx`)**:
   - Mammoth HTML converter + Tiptap WYSIWYG editor.
   - Toolbar: Bold, Italic, Headings, Bullet/Ordered Lists, Alignment, Table insert, and "Export .docx" button.
   - Warning banner regarding complex Word features (tracked changes/OLE objects).
4. **Data Grid Studio (`DataGridEditor.tsx`)**:
   - Interactive spreadsheet with cell editing, row/column addition & deletion, sorting, filter search bar, and CSV/JSON export.
   - Toggle between Grid View and Raw Text View.
5. **Code Studio (`CodeViewer.tsx`)**:
   - Syntax-highlighted read-only viewer powered by Shiki (`one-dark-pro` theme).
   - Line numbers column, search in file, word wrap toggle, AI code explanation triggers ("Explain File", "Summarize Logic").

### 3.5 AI Companion Drawer (`AICompanionDrawer.tsx`)
- **Width**: `380px` (Resizable from 280px to 720px)
- **Transition**: Smooth slide-in/out transition (`translate-x-0` vs `translate-x-full`).
- **Header**: Gradient sparkles badge, Provider selector button, Close 'X' button.
- **Tab Navigation**: Mode switch between "AI Friend Co-Writer" and "Deep Research".
- **Chat Panel**:
  - Persona pills: `Friend Co-Writer`, `Researcher`, `Proofreader`, `Brainstormer`.
  - Chat bubbles: User messages (right-aligned dark indigo pill), AI messages (left-aligned obsidian card rendering full Markdown, Copy button, and "Insert in Doc" button).
  - Quick suggestion chips and multi-line message input box.
- **Deep Research Panel**:
  - Topic search input, depth selector (`Quick`, `Standard`, `Deep`), citations toggle, and Tavily + Exa AI search synthesis.
  - Verified Web Sources list and structured research report output.

### 3.6 Floating Contextual Selection Toolbar (`InlineSelectionToolbar.tsx`)
- Appears floating above text selection in editor viewports.
- Glassmorphic round pill container with micro-buttons:
  - `✨ Polish` — Refines prose for clarity and flow.
  - `💡 Simplify` — Clarifies complex text.
  - `📄 Expand` — Adds depth and context.
  - `🔄 Rephrase` — Converts to professional executive tone.
  - `🔍 Research` — Synthesizes research on selected text.
  - `💬 Ask Friend` — Opens AI drawer with selected excerpt.

---

## 4. Animation & Micro-Interactions

- **Hover Transitions**: `transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)`
- **Modal Entry**: `animation: modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards`
- **AI Glow Pulse**: `animate-ai-pulse` ambient pulsing glow around active AI action buttons during response generation.
- **Drawer Slide**: `transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)`

---

## 5. Accessibility & Performance Guidelines

- **Color Contrast**: All primary body text `#f3f4f6` on dark background `#0a0c12` achieves WCAG AAA contrast (>7:1).
- **Keyboard Navigation**: Global shortcut `⌘K` for Command Palette, `⌘S` for Save, `⌘N` for New Document, `⌘O` for Open File, `⌘B`/`⌘I` inside Markdown editor.
- **Focus Indicators**: Interactive fields display a 1px Indigo ring (`focus:ring-indigo-500`) when focused via keyboard.
