# AI Agent & Deep Research Spec — OmniDoc Studio

Target: evolve single-shot chat into a grounded agent loop + real research
pipeline. Four phases, each shippable alone. Order matters: A → B → C → D
(B needs A's abort/plumbing, C needs A's retry/timeout, D needs A's budget).

Conventions: all network calls go through `src/services/`; no direct file
writes from AI paths (inserts go through the `pendingInserts` review queue);
every loop is abortable and step-capped.

---

## Phase A — Chat foundations

**Problem:** no streaming, full history re-sent every turn (cost + context
blowup), Stop doesn't exist, Gemini/Anthropic have no timeout, no retry,
no usage visibility.

### A1 Streaming (`streamAI`)
New core in `aiService.ts`; `callAI` becomes a thin accumulate-wrapper so
existing callers (research, test-key) keep working:

```ts
interface StreamResult { text: string; usage?: { in: number; out: number } }
async function streamAI(args: {
  messages, config, apiKey, persona?, documentContext?,
  signal: AbortSignal, onToken: (t: string) => void
}): Promise<StreamResult>
```

- OpenAI-compat (`stream: true`): parse SSE `data:` lines →
  `choices[0].delta.content`. Covers OpenAI, OpenRouter, Ollama, LM Studio.
- Anthropic (`stream: true`): `content_block_delta` → `delta.text`.
- Gemini (`:streamGenerateContent?alt=sse&key=`): `data:` lines →
  `candidates[0].content.parts[*].text`.
- Malformed SSE lines are skipped, never fatal. `usage` picked up from
  terminal chunks (`usage` / `usageMetadata`) where present.

UI (`ChatPanel`): partial text renders live in a provisional bubble;
**Stop** aborts the signal, keeps partial text with a `· stopped` marker.
`isAILoading` stays the single loading flag; add `abortRef` (component).

### A2 Timeouts + retry (all providers)
- Shared `withTimeout(ms=90_000)` AbortController composition; apply to
  Gemini/Anthropic paths (currently unbounded).
- Retry once after 1s, again after 3s, on 429/5xx/network only — never on
  401/403/404 (those are actionable errors, surface immediately with the
  existing key/model hints).

### A3 Regenerate + history actions
- Store: `popLastAssistant()` (drops trailing assistant message).
- UI: **Regenerate** button on the last assistant message → pop + resend
  same history. **Clear** already exists.

### A4 History trimming (token budget)
- Estimator `estimateTokens(s) ≈ Math.ceil(s.length / 4)` in a shared
  `src/services/budget.ts`.
- Budget: 24k chars history + existing 15k doc preview (constants,
  `BUDGET` export). Keep newest messages fitting the budget; always keep
  the latest user turn. Dropped middle shown in UI only as a divider —
  `— earlier messages trimmed to save context —` (no fake content sent).
- v2 (optional later): summarize dropped middle via one cheap call,
  stored as a `system` note. Not required for A-complete.

### A5 Usage meter
- `streamAI` returns usage; store `sessionUsage {in, out}` (additive,
  reset on Clear). Status bar provider segment shows `~12.4k tok` on hover
  title; drawer shows exact counts in a muted footer line. Cost shown only
  for known models (static $/1M table for gemini/openai/anthropic flagships,
  `n/a` for custom/unknown).

### A6 Acceptance
- Long reply streams token-by-token; Stop freezes partial correctly.
- 40-turn chat stays under budget (divider appears, no API 400s).
- Pulling the network mid-reply → clean error + Retry, no hang (all paths).
- `callAI` callers untouched and passing typecheck.

---

## Phase B — Agent loop

**Problem:** model can't act (search, read more doc, propose edits) or
iterate. Goal: bounded ReAct loop with visible steps.

### B1 Tools (provider-neutral, Zod-style JSON schemas in `tools.ts`)
| Tool | Args | Executes via | Notes |
|---|---|---|---|
| `web_search` | `query`, `count?` | `searchService` Tavily+Exa | Returns error text if keys missing (model then says so) |
| `read_document` | `startLine?`, `endLine?` | active doc content | Default window around selection; caps ~8k chars |
| `propose_insert` | `text`, `label?` | `queueInsert` | Only write path. Returns queue id |
| `get_selection` | — | `selectedText` | Empty-string safe |

Never: raw file writes, shell, keychain reads. Tool results are capped
(3k chars each) and labeled so the model can cite them.

### B2 Loop (`runAgent` in new `agentService.ts`)
```ts
async function runAgent(task: string, ctx: AgentCtx, opts: {
  maxSteps = 6, signal, onStep: (s: StepEvent) => void, onToken
}): Promise<string> // final answer (streamed when possible)
```
- System prompt = persona prompt + tool manifest + rules (cite tool
  facts, max-steps awareness, final answer must stand alone).
- Each step: non-streaming model call with tools → zero `tool_calls` =
  done (that text becomes the final answer, streamed to UI when the
  provider supports stream+tools, else delivered whole) → else execute
  tools in parallel, append results, continue.
- Step cap hit → force final synthesis call ("answer with what you have").
- `StepEvent = { n, tool, argsSummary, resultSummary, ms }` → drawer
  timeline (collapsible, muted, one line per call).

### B3 Provider mapping
- OpenAI-compat: native `tools` / `tool_calls` (+ `tool` role results).
- Anthropic: native `tools`, `tool_use` / `tool_result` blocks.
- Gemini: `tools: [{ function_declarations }]`, `functionCall` parts,
  `functionResponse` round-trip.
- Fallback (custom/unknown + any native failure): JSON-mode — instruct
  ` ```tool:name {...json} ``` ` fenced calls; regex-extract; two format
  misses → abort loop with plain answer + "tools unsupported" notice.
- Capability detection: `supportsTools(config)` map (openai/anthropic/
  gemini true; openrouter per-model allowlist pass-through true;
  custom probed once via `models` endpoint? No — default false, user
  toggle "enable tools (beta)" in provider card). UI badge in drawer.

### B4 UI
- Drawer header gets a **Chat | Agent** segmented toggle (next to the
  existing Chat | Research tabs — Agent replaces Chat's send path, same
  message feed). Steps render as a compact timeline above the final
  message. Stop aborts mid-loop; partial steps stay visible.

### B5 Acceptance
- "Research X and draft an intro" → visible search → read → propose
  steps → final text + queued insert, ≤6 steps, cancellable mid-step.
- Ollama `llama3` with tools off → clean single-shot answer, no crash.
- A model inventing a tool name → executor returns "unknown tool", loop
  recovers or exits gracefully (no infinite loop — hard cap + no-repeat
  rule: same tool+args twice = force-answer).

---

## Phase C — Deep research 2.0

**Problem:** depth selector is cosmetic; one search round, one synthesis,
no verification, one spinner, no history.

### C1 Real depth semantics
- `quick`: current behavior (1 parallel search + synthesis). Untouched fast path.
- `standard`: **planner** (one small call: "list 3–5 sub-questions") →
  parallel search per sub-question (concurrency 3, shared abort) → merge
  sources → per-section synthesis → stitched report. Planner failure →
  heuristic fallback (background / current-state / challenges / outlook).
- `deep`: standard + **gap pass** ("what's missing/contested?" → 2–4
  follow-up queries) + final merge with dissent section kept.

### C2 Retrieval quality (`searchService.ts`)
- Keep URL dedupe; add per-domain cap (2) for diversity.
- Rerank: `0.6 * providerScore + 0.4 * keywordOverlap(topic, snippet)`;
  drop empty snippets. Return score-sorted; UI lists in that order.

### C3 Citation verification (no extra LLM call)
- Post-pass regex: every `[..](url)` in the report must match the
  retrieved URL set (normalized trailing-slash/casing). Unmatched →
  rewritten as plain text + counted in a "N unverified claims removed"
  line. No-search-keys mode: synthesis allowed, citations forbidden by
  prompt, banner states "model knowledge only".

### C4 Progress UI
Replace the single spinner with staged checklist + live counts:
`Plan → Search 2/5 → Synthesize → Verify`, cancellable. Reuse A2 abort;
cancel leaves partial sources visible.

### C5 Report history (session)
Panel keeps `reports: DeepResearchResult[]` (this session): title + time
+ reopen. Keep existing Open-as-doc (add `_v2` suffix if name taken) and
Insert-here (queues via `queueInsert`, text formats only — already so).

### C6 Acceptance
- `standard` on a technical topic yields ≥8 distinct-domain sources and
  sectioned report; `deep` adds a follow-up round visibly in progress UI.
- A report with a fabricated citation ships zero hyperlinked claims not
  in the source set (verified counter visible).
- Cancel mid-search → partial sources remain, no stuck spinner.

---

## Phase D — Grounding

**Problem:** model sees a blind 15k preview; user can't see or steer what
it sees.

### D1 Auto context chips
Above the chat input, live chips: `[doc: name]` (always) and
`[selection ~Lx–Ly]` when text is selected (line numbers approximated via
`content.indexOf(selectedText)`; `~` prefix marks approximation; hidden
when unresolvable). Click a chip to dismiss it for that turn (component
state `excludedChips`).

### D2 @file mentions
Typing `@` in input opens open-docs dropdown; picking attaches
`[doc: name]` chips (multi). Attached docs contribute truncated content
(6k chars each, 2 max) to `documentContext` as named sections. Esc closes
dropdown; backspace on empty input removes last chip.

### D3 Budget meter
Thin bar under input from A4's estimator over
(history-trimmed + doc preview + attachments) vs budget: green <70%,
amber <100%, red over (send still allowed, bar pulses once — never
blocks). Title tooltip shows exact chars.

### D4 Agent default scope
Agent's `read_document` defaults to the selection range when a selection
chip is present, else head of doc. No new UI.

### D5 Acceptance
- Chips reflect reality (rename doc → chip renames; no selection → no
  chip; dismissed chip stays out of that request).
- `@` flow completes keyboard-only (arrows/Enter/Esc).
- Meter matches estimator math within rounding; never blocks send.

---

## Build order & stop conditions
A → B → C → D. Stop a phase when its acceptance list passes on
Gemini + one OpenAI-compat target (local Ollama included). Do not start
B's fallback parser until native paths pass; do not start C's gap pass
until standard is stable.
