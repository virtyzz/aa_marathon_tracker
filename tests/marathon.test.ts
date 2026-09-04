import { describe, expect, it } from "vitest";
import { canAddXp, totalXp, WEEK_LIMIT } from "../lib/marathon";
describe("правила марафона", () => { it("считает XP по снимкам заданий", () => expect(totalXp([{dayIndex:0,weekTask:{xpSnapshot:1}},{dayIndex:1,weekTask:{xpSnapshot:4}}])).toBe(5)); it("не разрешает превысить недельный лимит", () => { expect(canAddXp(WEEK_LIMIT,1)).toBe(false); expect(canAddXp(98,2)).toBe(true); }); });
