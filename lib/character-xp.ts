import { displayXp, totalXp } from "./marathon";

type CompletionKey = { characterId: string; weekTaskId: string; dayIndex: number };
type Completion = CompletionKey & { completedAt: Date; weekTask: { xpSnapshot: number } };
export function completionKey(value: CompletionKey) {
  return JSON.stringify([value.characterId, value.weekTaskId, value.dayIndex]);
}

/** Reset only character counters; callers retain all completions for account XP and checkboxes. */
export function characterWeeklyXp(progresses: Completion[], resetAt: Date | null, exclusions: Set<string>) {
  return displayXp(totalXp(progresses.filter(p => !resetAt || (
    p.completedAt >= resetAt && !exclusions.has(completionKey(p))
  ))));
}
