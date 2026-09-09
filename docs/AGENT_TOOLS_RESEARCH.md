# Research Brief — Agent Tool Design for OmniDoc Studio

## Role
You are an expert in AI agent architecture and tool-use design, specializing
in document-centric assistants (writing, research, data) as opposed to
software-engineering agents.

## Project context
OmniDoc Studio is an offline-first Electron desktop workspace (Markdown, PDF,
DOCX, CSV/JSON grids, code viewer) with an AI companion ("Omni") and a
bounded ReAct agent loop (max 6 steps): native function calling on flagship
providers, fenced-JSON fallback on local Ollama models. Providers are
user-keyed (BYOK); local-first privacy is a core promise — document content
never leaves the machine except to user-configured endpoints.

Current tool inventory (all read-only or review-queued, none write directly):
1. `web_search(query, count?)` — Tavily + Exa fan-out, needs user keys.
2. `read_document(startLine?, endLine?)` — line-window reads past the 15k
   preview; defaults to a ±40-line window around the selection.
3. `propose_insert(text, label?)` — queues text into a user Accept/Reject
   review strip. The ONLY write path, deliberately indirect.
4. `get_selection()` — current editor selection, empty-safe.

Personas that will scope tool access: co-writer, researcher, proofreader,
brainstormer. Agent loop is cancellable, step-visible, repeat-guarded.

## Current-state problem
Four tools cover the demo path ("research X and draft an intro") but the
catalog was invented, not derived: no evidence for what document-work agents
actually need, no permission/approval model beyond the review queue, no
story for external integrations, and no data on where tool loops fail in
writing workflows specifically (as opposed to coding, where most agent
literature lives).

## Research objectives
1. **Tool catalog for document work:** survey what leading assistants expose
   — Cursor/Copilot (code-adjacent), ChatGPT canvas, Claude, Notion AI,
   Gemini in Docs, Word Copilot, Lex/Sudowrite, Perplexity/You.com (research
   agents), open-source doc agents. Distill the tool set a *writing and
   research* workspace actually needs, split into: (a) missing core tools
   (candidates: doc outline/structure read, style/stats analysis, citation
   extraction from PDFs, table/CSV computation, file attach, multi-doc
   compare, export/format conversion, definition lookup), (b) phase-2 tools,
   (c) things that look useful but empirically aren't.
2. **Granularity decisions:** when should capabilities be separate tools vs.
   parameters (e.g. one `read_document` with modes vs. split outline/read/
   search-within-doc)? How many tools before small models degrade at
   selection time — what does the evidence say about tool-count vs. accuracy
   on 8B-class models?
3. **Permission & trust UX:** approval models in the wild (per-call, per-tool,
   per-session, YOLO): who does what, and what do users tolerate for
   read-only vs. write vs. network vs. third-party tools? Design the minimal
   permission model fitting an offline-first desktop app where the only
   write path is already human-gated.
4. **MCP ecosystem mapping:** which MCP servers matter for writers,
   researchers, and data users (filesystem, fetch, memory, database, bibtex/
   Zotero, pandoc-adjacent tooling)? Assess maturity, transport realities in
   Electron (stdio vs. HTTP), and the trust story (prompt injection via tool
   results, secret handling) — with concrete mitigations, not vibes.
5. **Result design & failure handling:** how should tool outputs be shaped
   for the model (truncation, summarization, error strings that enable
   self-correction)? Catalog how agent loops fail in practice (wrong tool,
   bad args, result misread, loops) and the mechanism that fixes each.
6. **Per-persona scoping matrix:** which tools each of the 4 personas should
   hold, with reasoning — including which persona should hold *none*.

## Deliverable format
1. **Recommended tool catalog:** table of tool | signature | persona scope |
   phase (now/next/MCP) | why, capped at 12 tools with cuts justified.
2. **Permission model spec:** states, defaults, persistence, and the exact
   UI moments (what the user sees and clicks) for each tool class.
3. **MCP integration roadmap:** phased (client shell → server allowlist →
   permissions), transport decision for Electron, top-5 servers to support
   first with rationale.
4. **Failure-mode table:** failure → detection signal → recovery mechanism,
   mapped to our loop's existing guards (step cap, no-repeat rule, abort)
   plus gaps to close.
5. **What NOT to build:** at least 5 plausible-sounding tools/integrations
   to reject, with reasons.

Ground everything in shipped products and documented behavior. No generic
advice without a mechanism; no tool justified by "could be useful."
