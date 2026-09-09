# Design System Specification - DocsViewer (OmniDoc Studio)

**Theme Name**: Obsidian Velvet & Neon Cyber Glass  
**Target Mood**: Premium, Focus-enhancing, Fluid, State-of-the-Art Studio  

---

## 1. Color Tokens & Palette

```css
:root {
  /* Surface Colors */
  --bg-dark-base: #0a0c12;
  --bg-dark-surface: #121622;
  --bg-dark-elevated: #1a2030;
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
  --accent-success: #10b981;       /* Emerald */
  --accent-warning: #f59e0b;       /* Amber */
  --accent-danger: #ef4444;        /* Crimson */

  /* Text & Content Tokens */
  --text-main: #f3f4f6;
  --text-muted: #9ca3af;
  --text-dim: #6b7280;
  --text-accent: #818cf8;

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
- **Code & Markdown Source**: `'Fira Code', 'JetBrains Mono', monospace`
- **Document Titles & Headings**: `'Outfit', 'Inter', sans-serif`

```css
/* Type Scale */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */
```

---

## 3. UI Component Styles & Aesthetics

### 3.1 Top Bar & Navigation Header
- Height: `56px`
- Background: `var(--bg-glass)` with `backdrop-filter: var(--glass-backdrop-blur)`
- Border Bottom: `1px solid var(--border-subtle)`
- Displays active file title, model selector badge, quick action buttons, and AI companion drawer toggle.

### 3.2 Sidebar File Explorer & Tab Bar
- Sidebar Width: `260px` (Collapsible)
- Tab Bar Height: `40px` with animated active tab glow bar.
- File icons color-coded by format:
  - 📝 Markdown: Cyan (`#06b6d4`)
  - 📕 PDF: Crimson (`#ef4444`)
  - 📘 DOCX: Indigo (`#6366f1`)
  - 📊 CSV/JSON: Emerald (`#10b981`)
  - 💻 Code: Amber (`#f59e0b`)

### 3.3 AI Companion Drawer
- Drawer Width: `380px`
- Floating Glassmorphic card design with glowing AI badge header.
- Mode Selector Pills (*Friend Co-Writer*, *Deep Researcher*, *Proofreader*).
- Message Bubbles:
  - User Bubble: Slate dark background with subtle right border accent.
  - AI Friend Bubble: Violet-to-cyan gradient subtle border with glowing avatar.

### 3.4 Floating Contextual Selection Toolbar
- Appears when text is selected inside any editable document viewport.
- Compact glass pill container with micro-buttons:
  - ✨ *Fix & Polish*
  - 💡 *Simplify*
  - 🔍 *Deep Research Topic*
  - 💬 *Ask AI Friend*

---

## 4. Animation & Micro-Interactions

- **Hover Transitions**: `transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)`
- **Modal Entry**: `animation: modalFadeIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)`
- **AI Glow Pulse**: Subtle ambient pulsing glow around active AI buttons when generating responses.
