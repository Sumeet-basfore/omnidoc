# UI/UX Research Brief — OmniDoc Studio (DocsViewer v2.0)

## Role
You are a senior product designer and UX researcher specializing in desktop
productivity tools, document editors, and AI-assisted writing interfaces.

## Project context
OmniDoc Studio is an open-source, cross-platform desktop app (Electron 33 +
React 18 + TypeScript + Tailwind CSS v4) for developers, researchers, and
writers. It is a unified multi-format document workspace:

- **Viewers/editors:** Markdown (split editor + live preview, KaTeX, tables),
  PDF (pdf.js canvas + text layer, zoom, AI extract-to-Markdown), DOCX
  (Tiptap WYSIWYG round-trip), CSV/JSON (editable data grid), code files
  (Shiki-highlighted viewer)
- **AI companion ("AI Friend"):** right-side drawer with chat (4 personas:
  co-writer, researcher, proofreader, brainstormer), deep-research panel
  (Tavily + Exa web synthesis with citations), inline selection toolbar
  (polish / simplify / expand / rephrase / research)
- **Shell:** 48px top bar, tab bar, collapsable sidebar (260px), command
  palette (Cmd+K), export modal (Cmd+E), shortcuts reference
- **Design direction (undecided):** either a warm light editorial theme
  ("Paper & Ink": cream surfaces, serif display, single burnt-orange accent)
  or a restrained dark pro-tool theme ("Midnight Instrument": neutral grays,
  single signal accent, sharp radii, no glow/gradients)
- **Constraints:** must remain a single Tailwind v4 token file + React
  components; offline-first; keyboard-navigable; no paid dependencies;
  accessible (WCAG 2.2 AA target)

## Current-state audit (what to fix)
The existing UI exhibits generic "AI-generated" patterns. Treat these as
anti-patterns to argue against with evidence:
1. Three competing neon accents (indigo + cyan + magenta) used as gradients
   on single buttons; glow box-shadows on most interactive elements
2. Glassmorphism (backdrop-blur) applied to nearly every bar, card, and modal
3. Oversized border radii (rounded-2xl cards, fully-pill buttons) and
   uppercase tracking-widest micro-labels in every panel
4. Emoji used as functional iconography in buttons and lists
5. Default Inter + Outfit + Fira Code stack with no typographic point of view

## Research objectives
1. **Visual identity:** what makes document/productivity tools feel crafted
   vs. generic? Evaluate single-accent vs. multi-accent systems, warm vs.
   neutral dark themes, and serif-display + sans-body pairings for editor
   apps. Recommend one concrete token palette (bg/text/border/accent with
   hex values) for EACH of the two candidate directions above.
2. **Layout & information architecture:** best practices for multi-pane
   desktop editors (sidebar / tab strip / editor / AI drawer). When should
   the AI panel dock vs. float vs. overlay? How do leading tools handle tab
   overflow, dirty-state indicators, and sidebar density?
3. **Editor UX per format:** Markdown split-view conventions (scroll sync,
   toolbar minimalism), PDF reader toolbar patterns (zoom/page nav),
   WYSIWYG toolbar scoping (what belongs, what hides), data-grid editing
   patterns (cell focus, row ops, empty states), code viewer essentials.
4. **AI companion UX:** how should AI chat coexist with a document
   (context chips? selection grounding? insertion flows?)? Review message
   density, persona switching, inline-toolbar action sets (which 3–5
   actions earn their place?), and how to present streamed/long responses
   without overwhelming the editor.
5. **First-run & empty states:** what earns a new user's trust in the first
   60 seconds? Sample content, onboarding checklists, key-setup flows
   (BYOK) that don't feel like a settings maze.
6. **Motion & feedback:** which micro-interactions actually aid editing
   workflows (and which are decoration)? Drawer/modal transitions, save
   feedback, AI "thinking" states.
7. **Accessibility:** contrast budgets for dark editor themes, focus-visible
   strategy for dense toolbars, keyboard-map conventions to adopt/avoid.

## Competitive set (analyze at least 6)
Obsidian, Typora, Notion desktop, VS Code, Zettlr/MarkText, plus one PDF
reader (e.g. SumatraPDF/Okular) and one AI-integrated editor (Cursor/Copilot
Chat/Claude). For each: one thing to steal, one thing to avoid, with a
concrete screenshot-described rationale.

## Deliverable format
1. **Executive summary** (≤10 bullets, opinionated, ranked)
2. **Direction recommendation:** Paper & Ink vs. Midnight Instrument, with
   evidence and risks of each
3. **Token tables** for both directions (bg scale, text scale, border,
   ONE accent + semantic colors, radii, shadows, font stacks with
   open-licensed alternatives to Inter/Outfit/Fira Code)
4. **Component-level recommendations** (top bar, tabs, sidebar, drawer,
   chat, toolbar, modals, empty states) — each as: current problem →
   recommendation → example that does it well
5. **Do / Don't list** (≥10 items) to keep future AI-assisted UI work
   from regressing into generic aesthetics
6. **Prioritized rollout plan** (3 phases: tokens → shell → editors/AI),
   each phase shippable independently

Be specific and cite real products. No filler, no generic advice like
"ensure consistency" without saying consistent with what.
