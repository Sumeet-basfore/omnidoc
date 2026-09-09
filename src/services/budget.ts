// Token budgeting helpers shared by chat trimming, grounding meter, agent loop.

export const HISTORY_BUDGET_CHARS = 24000;
export const DOC_PREVIEW_CHARS = 15000;

/** Rough token estimate (~4 chars/token). Good enough for budgeting. */
export function estimateTokens(s: string): number {
  return Math.ceil((s || '').length / 4);
}

export function estimateMessagesTokens(msgs: Array<{ content: string }>): number {
  let total = 0;
  for (const m of msgs) total += estimateTokens(m.content);
  return total;
}

/**
 * Keep the newest messages fitting the budget; the latest message is
 * always kept. Returns kept slice (in order) + dropped count.
 */
export function trimHistory<T extends { content: string }>(
  msgs: T[],
  budgetChars = HISTORY_BUDGET_CHARS
): { kept: T[]; trimmed: number } {
  if (msgs.length === 0) return { kept: [], trimmed: 0 };
  const kept: T[] = [];
  let used = 0;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const cost = msgs[i].content.length;
    if (kept.length > 0 && used + cost > budgetChars) break;
    kept.unshift(msgs[i]);
    used += cost;
    // Always keep at least the latest message even if huge
    if (i === msgs.length - 1) continue;
  }
  return { kept, trimmed: msgs.length - kept.length };
}
