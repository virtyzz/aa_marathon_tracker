import { describe, expect, it } from "vitest";
import { allowedOnDay, formatWeekRange, formatDayMonth, weekDates } from "../lib/marathon";

describe("week dates", () => {
  it("formats the configured interval as dd.mm - dd.mm", () => {
    expect(formatWeekRange(new Date(2026, 8, 3), new Date(2026, 8, 9, 16, 59))).toBe("03.09 - 09.09");
  });
  it("labels seven columns across a year boundary", () => {
    expect(weekDates(new Date(2026, 11, 31)).map(formatDayMonth)).toEqual(["31.12", "01.01", "02.01", "03.01", "04.01", "05.01", "06.01"]);
  });
  it("treats the default empty restriction list as all seven days", () => {
    expect(Array.from({ length: 7 }, (_, index) => allowedOnDay([], index))).toEqual(Array(7).fill(true));
  });
});
