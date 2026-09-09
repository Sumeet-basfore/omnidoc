---
name: Obsidian Cyber Glass
colors:
  surface: '#0f131f'
  surface-dim: '#0f131f'
  surface-bright: '#353946'
  surface-container-lowest: '#0a0e19'
  surface-container-low: '#171b27'
  surface-container: '#1b1f2c'
  surface-container-high: '#262a36'
  surface-container-highest: '#303442'
  on-surface: '#dfe2f3'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#dfe2f3'
  inverse-on-surface: '#2c303d'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4cd7f6'
  on-secondary: '#003640'
  secondary-container: '#03b5d3'
  on-secondary-container: '#00424e'
  tertiary: '#ffb0cd'
  on-tertiary: '#640039'
  tertiary-container: '#f751a1'
  on-tertiary-container: '#570032'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#ffd9e4'
  tertiary-fixed-dim: '#ffb0cd'
  on-tertiary-fixed: '#3e0022'
  on-tertiary-fixed-variant: '#8c0053'
  background: '#0f131f'
  on-background: '#dfe2f3'
  surface-variant: '#303442'
  bg-base: '#0a0c12'
  bg-surface: '#121622'
  bg-elevated: '#1a2030'
  bg-glass: rgba(18, 22, 34, 0.75)
  bg-glass-hover: rgba(26, 32, 48, 0.85)
  border-subtle: rgba(255, 255, 255, 0.08)
  border-medium: rgba(255, 255, 255, 0.15)
  border-active: '#6366f1'
  accent-success: '#10b981'
  accent-warning: '#f59e0b'
  accent-danger: '#ef4444'
  text-main: '#f3f4f6'
  text-muted: '#9ca3af'
  text-dim: '#6b7280'
  text-accent: '#818cf8'
typography:
  headline-xl:
    fontFamily: Outfit
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Outfit
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Outfit
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '500'
    lineHeight: 26px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
  badge-mono:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '600'
    lineHeight: 12px
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  space-2xs: 2px
  space-xs: 4px
  space-sm: 8px
  space-md: 12px
  space-lg: 16px
  space-xl: 20px
  space-2xl: 24px
  space-3xl: 32px
  space-4xl: 48px
  topbar-height: 48px
  tabbar-height: 36px
  sidebar-width: 260px
  sidebar-collapsed-width: 56px
  drawer-width-default: 380px
  drawer-width-min: 280px
  drawer-width-max: 720px
---

## Brand & Style

This design system embodies the ethos of focused, hyper-crafted software tools—fusing the fluid desktop elegance of Arc Browser, the structural velocity of Linear, the precision ergonomics of Cursor IDE, and the clean compositional clarity of Notion. Built for intensive technical and creative studio workflows, it balances deep, low-distraction dark void surfaces with tactile glassmorphism and electric cyber accents.

The aesthetic philosophy centers on "Obsidian Velvet & Neon Cyber Glass":
- **Obsidian Velvet Tiering:** Layered, deep-space dark backdrops that eliminate cognitive fatigue and frame documents with tactile velvet depth rather than harsh divider lines.
- **Neon Cyber Glass:** Translucent frosted glass overlays (`backdrop-filter: blur(16px)`), micro-radii, razor-thin translucent borders (`rgba(255, 255, 255, 0.08)`), and luminous spectral accents that signal context, intelligence, and system states.
- **Ergonomic Studio Precision:** Dense, highly functional layouts with micro-toolbars, contextual popovers, command palettes (`⌘K`), and floating pill bars that stay invisible until summoned.

The tone is authoritative, technically sublime, whisper-quiet, and futuristic.

## Colors

The palette establishes a high-contrast, low-fatigue workspace optimized for prolonged screen exposure. Pure black is eschewed in favor of deep oceanic obsidian tones that lend organic weight and depth to the UI planes.

### Surface System
- **Base Background (`#0a0c12`):** The foundational application canvas, workspace gutters, and outer frame.
- **Obsidian Surface (`#121622`):** Sidebars, document viewports, inactive tabs, and primary tool strips.
- **Velvet Elevated (`#1a2030`):** Floating modals, drawer flyouts, dropdown menus, context popovers, and elevated cards.
- **Glass Overlays:** Translucent alpha surfaces (`rgba(18, 22, 34, 0.75)` and `rgba(26, 32, 48, 0.85)`) backed by hardware-accelerated 16px blur to blend layers together seamlessly.

### Accent & Semantic Hierarchy
- **Primary Indigo (`#6366f1`):** Key interactive cues, primary CTA actions, active focus rings, and highlighted navigational states.
- **Electric Cyan (`#06b6d4`):** Data signals, Markdown nodes, active stream states, and query highlights.
- **Sparkle Pink (`#ec4899`):** AI synthesis, autonomous companion modes, generative prompts, and contextual selection sparks.
- **Emerald Green (`#10b981`):** Tabular data cells, saved states, operational confirmations, and healthy system telemetry.
- **Amber Gold (`#f59e0b`):** Warning banners, unsaved document dirty indicators, and code AST tokens.
- **Crimson Red (`#ef4444`):** Destructive actions, PDF and binary parser states, and execution halts.

## Typography

The typography strategy leverages a clear division of roles among three typefaces:
1. **Outfit (Headlines & Titlebars):** Modern geometric structure with subtly rounded corners that softens the studio UI, infusing warmth into technical document headers and modals.
2. **Inter (UI & Longform Prose):** Engineered for legibility at small sizes, optimal vertical metrics, neutral tracking, and zero optical distortion across desktop screens.
3. **JetBrains Mono (Code, Syntax, Metadata, Keybindings):** Monospaced precision for tabular sheets, code blocks, raw markdown syntax, file paths, telemetry badges, and keyboard shortcuts (`⌘K`, `⌘S`).

### Typographic Guidelines
- Headings use tightened negative letter-spacing (`-0.01em` to `-0.025em`) to provide strong visual hierarchy without feeling dense.
- Monospaced labels and badges use uppercase transformation with tracking (`0.04em` to `0.05em`) to preserve clarity at tiny sizes (10–12px).
- Prose document line height maintains an open `1.625` multiplier (`26px` on `16px` font) for comfortable extended reading.

## Layout & Spacing

The layout is designed as a desktop-first, multi-pane workbench utilizing full-bleed contextual panels with strict spatial anchoring.

### Spatial Grid & Geometry
- **4px Base Unit:** All margins, paddings, gaps, and component bounds align to a 4px rhythmic scale (`4px`, `8px`, `12px`, `16px`, `24px`, `32px`).
- **Workbench Architecture:**
  - **Global Header / Window Titlebar:** Fixed `48px` height with backdrop blur. Houses window handles, global breadcrumb path, command search prompt, and primary workspace action triggers.
  - **Document Tab Bar:** Integrated `36px` secondary horizontal track directly above document viewports.
  - **Sidebar Explorer:** Default `260px` width, collapsible down to `56px` icon rail or completely hideable with `⌘B`.
  - **AI Companion Flyout:** Right-aligned drawer at `380px` default width, draggable between `280px` and `720px` via an interactive resize handle.
  - **Editor Core Viewport:** Fluid flex-fill canvas configured as either a single document column (max `840px` readable width centered) or a 50/50 dual-pane split view with synchronous scrolling.

### Responsive & Reflow Directives
- **Compact Viewports (< 1024px):** The right AI drawer shifts from a persistent side-by-side flex sibling to an absolute floating sheet overlaying the editor with a shaded backdrop.
- **Narrow Layouts (< 768px):** The left file tree collapses into an overlay drawer; document sub-toolbars convert into scrollable horizontal chips.

## Elevation & Depth

Visual hierarchy is constructed through tonal layering and translucent glass surfaces rather than heavy drop shadows.

### Elevation Architecture
1. **Layer 0 — Ground Void (`#0a0c12`):** Outer desktop perimeter, empty slate areas, and app frame gutters.
2. **Layer 1 — Obsidian Panels (`#121622`):** Primary editor viewport, file explorer sidebar, and main workspace tabs. Flat depth with a subtle boundary line (`1px solid rgba(255, 255, 255, 0.08)`).
3. **Layer 2 — Velvet Cards & Modules (`#1a2030`):** Document cards, chat message bubbles, toolbar panels, and table headers. Supported by micro-drop shadow: `0 2px 8px rgba(0, 0, 0, 0.35)`.
4. **Layer 3 — Floating Glass Glassmorphism (`rgba(18, 22, 34, 0.8)` + `16px blur`):** Command palette (`⌘K`), inline selection micro-toolbars, floating AI action chips, and context menus. Enclosed by luminous border `1px solid rgba(255, 255, 255, 0.15)` and ambient drop shadow `0 12px 32px -4px rgba(0, 0, 0, 0.6)`.
5. **Layer 4 — Neon Halo & Popover Overlays:** Active dialog modals and AI generation fields. Feature an ambient radial tint: `box-shadow: 0 0 0 1px #6366f1, 0 16px 40px -8px rgba(99, 102, 241, 0.25)`.

## Shapes

The design system employs Level 2 (Rounded) geometry balanced with precise micro-radii to maintain an engineered, high-density desktop aesthetic.

### Radius Distribution
- **Micro Radii (`4px` - `6px`):** Code inline tokens, mini tags, format indicator badges (`MD`, `PDF`), and small scrollbar thumbs.
- **Standard Control Radii (`8px` - `10px`):** Text inputs, dropdown select triggers, action buttons, table cell selections, and sidebar item hover blocks.
- **Container Radii (`12px` - `16px`):** Content cards, preview sheets, drawer panels, and modal containers.
- **Pill Geometry (`9999px`):** Search bars, command trigger pills (`⌘K`), persona selection toggles, status pills, and floating contextual inline toolbars.

## Components

### Buttons & Interactive Controls
- **Primary Button:** Background in rich Indigo (`#6366f1`), hover `#4f46e5`, text `#ffffff`. Border: `1px solid rgba(255, 255, 255, 0.1)`. Inner top highlight line for tactile depth.
- **Secondary Glass Button:** Translucent background (`rgba(255, 255, 255, 0.05)`), hover `rgba(255, 255, 255, 0.1)`, text `#f3f4f6`, border `1px solid var(--border-subtle)`.
- **AI Sparkle Action Button:** Gradient background from `#6366f1` to `#ec4899`. Subtle pulsing outer glow (`0 0 16px rgba(236, 72, 153, 0.3)`) when active or synthesizing responses.
- **Ghost Action Icon:** Zero base background, `6px` radius, hover `rgba(255, 255, 255, 0.08)`, color `#9ca3af`, hover color `#f3f4f6`.

### Inputs, Search & Command Palette
- **Text Inputs:** `#0a0c12` background, `1px solid var(--border-subtle)`, `8px` radius, text `#f3f4f6`, placeholder `#6b7280`. Focused state invokes `border-color: #6366f1` and a soft `0 0 0 2px rgba(99, 102, 241, 0.2)` ring.
- **Command Palette (`⌘K` Modal):** Floating centered overlay (`640px` wide) using Velvet Card Glass (`rgba(18, 22, 34, 0.92)` + `20px blur`), crisp border `rgba(255, 255, 255, 0.15)`, containing a fast filter input and grouped navigation items with monospaced keyboard shortcuts.

### Workspace Tabs & File Explorer
- **Workspace Tab:** Height `36px`, padding `0 12px`, border-right `1px solid rgba(255, 255, 255, 0.05)`. Active tab has `#121622` background, crisp top indicator accent line (`2px solid #6366f1`), active format icon, and close glyph on hover. Unsaved files display an amber dot (`#f59e0b`) in place of the close icon.
- **File Explorer Row:** 2-line condensed card with format accent line (`3px` vertical strip in format color: Cyan for MD, Red for PDF, Indigo for DOCX, Emerald for CSV). Shows file label and relative timestamp ("4m ago").

### Badges & Chips
- **Format Badges:** Monospaced (`JetBrains Mono`), uppercase, `10px`, padding `2px 6px`, radius `4px`. Tinted with 15% opacity background of the format's accent color and solid matching text (e.g. Cyan for MD, Red for PDF).
- **Contextual Chips / Personas:** Pill-shaped (`9999px`), padding `4px 10px`, background `#1a2030`, border `1px solid var(--border-subtle)`. Hovering triggers `border-color: #6366f1` and text transition to `#ffffff`.

### Floating Inline Contextual Toolbar
- Floats above text selections within editor viewports.
- Pill shape with frosted glass background (`rgba(18, 22, 34, 0.88)` + `16px blur`) and `1px solid rgba(255, 255, 255, 0.15)` outline.
- Micro-actions (`✨ Polish`, `💡 Simplify`, `📄 Expand`, `🔄 Rephrase`, `💬 Ask`) rendered with `12px` font size and subtle divider separators (`1px solid rgba(255, 255, 255, 0.08)`).

### Lists, Tables & Checkboxes
- **Checkboxes:** Square with `4px` radius, `#0a0c12` background, border `1px solid var(--border-medium)`. Checked state displays `#6366f1` background with a crisp white checkmark icon.
- **Data Grid Cells:** Border `1px solid rgba(255, 255, 255, 0.06)`, alternating row zebra subtle tint (`rgba(255, 255, 255, 0.01)`). Selected cell range is outlined with `1px solid #10b981` (Emerald Data Accent) with a soft tinted cell fill.