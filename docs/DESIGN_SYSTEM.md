# Design System — OmniDoc Studio

**Theme:** Midnight Instrument (default shell) + Paper canvas (prose surfaces).
Single signal accent. No gradients, no glow, no glassmorphism on chrome.

## Tokens (`src/styles/design-system.css`)

| Token | Midnight (shell) | Paper (`[data-canvas="paper"]` scope) |
|---|---|---|
| `--bg-dark-base` | `#0D1117` | `#FBF9F5` |
| `--bg-dark-surface` | `#161B22` | `#F4EFEA` |
| `--bg-dark-elevated` | `#21262D` | `#FFFFFF` |
| `--border-subtle` / `--border-medium` | `#30363D` / `#484F58` | `#E4DCD3` / `#C8BCB0` |
| `--accent-primary` / `-hover` | `#38BDF8` / `#7DD3FC` | `#B93815` / `#9C2A0C` |
| `--text-main` / `-muted` / `-dim` | `#F0F6FC` / `#8B949E` / `#6E7681` | `#1C1917` / `#665E55` / `#8A8178` |
| success / warning / danger | `#2EA043` / `#D29922` / `#F85149` | `#027A48` / `#B54708` / `#B42318` |
| radii sm / md / lg | `2px` / `4px` / `6px` (both modes) | same |

Rules:
- **One accent.** Secondary hues only for success/warning/danger and
  file-format coding (md cyan, pdf red, docx sky, data emerald, code amber).
- **Solid surfaces + 1px borders.** No `backdrop-blur`, no `bg-gradient-*`,
  no glow shadows on chrome. Modal cards use `--bg-dark-elevated`.
- **Radii:** 2px tags/code, 4px buttons/inputs, 6px modals/cards.
  `rounded-full` only for dots, badges, filter chips.
- **Labels** in sentence case, medium weight. No uppercase tracking.
- **Icons:** Lucide only, 12–16px. No emoji in chrome.
- **Accent buttons:** solid accent fill with `text-[var(--text-on-accent)]`
  (near-black on sky in midnight, cream on terracotta in paper — both AA).
- **Focus:** global `2px solid var(--border-active)` + `2px` offset.
- **Motion:** `animate-modal` entry only; honor `prefers-reduced-motion`.

## Typography (bundled in `src/assets/fonts/`, offline-safe)

- UI/chrome: **Instrument Sans** (variable 400–700 + italic)
- Code: **JetBrains Mono** (400/500/700)
- Document canvas headings (`.doc-prose h1–h4`): **Newsreader** serif
- Code blocks on paper stay dark (`#0D1117`) — dark islands on cream.

## Paper canvas

`data-canvas="paper"` on a container flips all `var()` tokens beneath it.
Used for: Markdown preview (toggleable via **Paper** button, default on),
DOCX sheet (always). Code/CSV/JSON stay dark. `pre` blocks render dark in
both modes for readability with the highlight themes.

## Layout

- TopBar 48px · TabBar 36px (tabs `min-w-120`/`max-w-220`, scroll + list
  dropdown past 1 tab) · Sidebar 260px · AI drawer 380px docked flex
  (unmounted when closed — never overlay hacks) · StatusBar 24px footer
  (doc state + save flash + provider badge).
- Command palette results grouped by category headers.
- Sidebar rows dense (`p-1`), section headers `11px semibold zinc-500`.
