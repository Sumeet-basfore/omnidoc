# OmniDoc Studio (v2.0) — Design System & UI/UX Specification

**Theme**: Midnight Instrument (shell) + Paper canvas (prose surfaces)
**Target Mood**: Precise, quiet, pro-tool; warm and legible where prose lives
**Target Platforms**: Linux, macOS, Windows (Electron 33 Desktop)

Full token table lives in `DESIGN_SYSTEM.md`. This doc describes structure.

---

## 1. Color & Type (summary)

- Surfaces: `#0D1117` base · `#161B22` recessed · `#21262D` raised.
  Borders `#30363D` / `#484F58`. Text `#F0F6FC` / `#8B949E` / `#6E7681`.
- **One accent:** sky `#38BDF8` (hover `#7DD3FC`). Accent fills pair with
  dark `var(--text-on-accent)` text. Secondary hues only for
  success/warning/danger and file-format coding
  (md cyan · pdf red · docx sky · data emerald · code amber).
- No gradients, no glow shadows, no glassmorphism on chrome.
  Radii: 2px tags · 4px buttons/inputs · 6px modals. Pills only for
  dots, badges, filter chips. Sentence-case labels. Lucide icons only.
- Fonts (bundled, offline): **Instrument Sans** (UI) · **JetBrains Mono**
  (code) · **Newsreader** serif (`.doc-prose` headings).
- Paper canvas: `[data-canvas="paper"]` flips tokens to cream `#FBF9F5`,
  ink `#1C1917`, terracotta `#B93815`. Used by Markdown preview
  (toggleable, default on) and the DOCX sheet. Code blocks stay dark in
  both modes. Guardrail: `npm run guard:ui` (runs on every build).

---

## 2. Panel & Component Specifications

### 2.1 Top Bar — 48px
Solid surface strip, bottom border. Left: sidebar toggle, solid-accent
`OD` mark, title (double-click rename) + format badge + dirty dot.
Center: command trigger (`⌘K`). Right: Save, Export, provider badge,
Settings, solid-accent AI toggle (dark icon when active).

### 2.2 Workspace Tab Bar — 36px
Base background. Tabs `120–220px`, top accent notch in format color,
dirty dot swaps to close on hover. `+` popover creates docs; chevron
dropdown jumps between open tabs (appears past 1 tab).

### 2.3 Sidebar — 260px, collapsible
Solid accent **Open File** button, `+ MD / + Grid / + DOCX` ghost buttons.
Sample library + recent files (3px format rail, badge, path — no fake
timestamps). Dense `p-1` rows, `11px` muted headers. Drag-drop hint footer.

### 2.4 Status Bar — 24px
Single-line footer, top border. Left: doc name · dirty/saved state ·
stat (words for prose/code, rows for CSV, items for JSON). Flashes
`Saved` 1.5s after each write. Right: `provider / model` button (opens
settings) · `Working…` spinner while the AI is generating.

### 2.5 Multi-Format Document Viewports

1. **Markdown**: toolbar (Bold → KaTeX, TOC, **Paper** toggle) + word
   count + Raw/Split/Preview switcher. Source stays dark mono; preview
   renders on paper with serif headings; split uses block-anchored scroll
   sync (fence-aware source blocks → preview elements, % fallback). Slash
   commands (`/h1`…`/toc`) available in the source pane.
2. **PDF**: dark desk, page nav (`Page n of m`), 50–300% zoom, selectable
   text layer, AI Extract-to-Markdown behind a disclaimer modal.
3. **DOCX**: Mammoth → Tiptap. Info banner (dismissible), ghost toolbar
   (active toggles filled sky), Export .docx. Content sits on a paper
   sheet; tracked changes / OLE objects don't survive round-trip.
4. **Data Grid**: Grid/Raw switcher, filter, add row/column, sort by
   header click, per-column delete, row delete, export. Edits resolve by
   row identity so sorting/filtering can't corrupt data.
5. **Code**: Shiki (`one-dark-pro`) + gutters, find-in-file, wrap toggle,
   copy, Explain/Summarize actions that post into the AI drawer.

### 2.6 AI Companion Drawer — 380px, docked
Unmounted when closed (never an overlay). Solid accent section tabs
(Chat / Research). Persona chips (Co-writer, Researcher, Proofreader,
Brainstorm) with Lucide icons. Flat message feed, markdown rendering,
Copy / Insert-in-Doc (text formats only). Research panel: topic +
depth + citations → Tavily/Exa synthesis → open-as-doc or insert.
Keys live in OS keychain; empty-key errors surface inline with a
settings shortcut.

### 2.7 Inline Selection Toolbar
Transient pill (the ostatni legitimate pill): Polish, Simplify, Expand,
Rephrase, Research, Ask. Queues the prompt into chat and auto-sends.

---

## 3. Motion & Feedback

- Modal entry `modalFadeIn` 250ms; no ambient loops. AI state = spinner
  + `Working…` in chat and status bar. `prefers-reduced-motion` disables
  entry animation.
- Save = tab dot clears + status-bar `Saved` flash (1.5s).

## 4. Accessibility

- Body text ≥ 7:1 both modes; muted ≥ 4.6:1; accent fills use
  `text-on-accent` (dark-on-sky ≈ 8:1, cream-on-terracotta ≈ 5.9:1).
- Global `:focus-visible`: 2px accent ring, 2px offset.
- Shortcuts: `⌘K` palette · `⌘S` save · `⌘N`/`⌘O` new/open ·
  `⌘B` sidebar · `⌘⇧R`/`⌘⇧A` AI drawer · `Esc` closes drawer ·
  `?` shortcut reference. Selection toolbar is mouse-driven;
  all its actions are repeatable from chat.
