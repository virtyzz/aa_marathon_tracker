import { describe, expect, it } from "vitest";
import { characterWeeklyXp, completionKey } from "../lib/character-xp";
import { totalXp } from "../lib/marathon";

const reset = new Date("2026-09-07T12:00:00Z");
const before = { characterId: "a", weekTaskId: "task", dayIndex: 3, completedAt: new Date("2026-09-07T11:59:59Z"), weekTask: { xpSnapshot: 80 } };
const after = { ...before, weekTaskId: "other", completedAt: reset, weekTask: { xpSnapshot: 10 } };
const excluded = new Set([completionKey(before)]);

describe("one-time character weekly XP reset", () => {
  it("preserves account XP and completions while resetting character XP at the exact boundary", () => {
    const rows = [before, after];
    expect(characterWeeklyXp(rows, reset, excluded)).toBe(10);
    expect(totalXp(rows)).toBe(90);
    expect(rows).toEqual([before, after]);
  });
  it("keeps old completions excluded after unchecking and rechecking", () => {
    expect(characterWeeklyXp([{ ...before, completedAt: new Date("2026-09-07T15:00:00Z") }], reset, excluded)).toBe(0);
  });
  it("does not exclude another day or another character", () => {
    expect(characterWeeklyXp([{ ...before, completedAt: reset, dayIndex: 4 }], reset, excluded)).toBe(80);
    expect(characterWeeklyXp([{ ...before, completedAt: reset, characterId: "b" }], reset, excluded)).toBe(80);
  });
  it("leaves other weeks unchanged and preserves the soft display cap", () => {
    expect(characterWeeklyXp([before, after], null, excluded)).toBe(90);
    expect(characterWeeklyXp([{ ...after, weekTask: { xpSnapshot: 150 } }], reset, excluded)).toBe(100);
  });
});
