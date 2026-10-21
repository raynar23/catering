import { describe, it, expect } from "vitest";
import {
  formatDateIso,
  parseDateIso,
  getMonthRange,
  isValidTimeString,
  formatTimeShort,
  getOffsetDateIso,
  formatDateIndonesian,
} from "./date";


describe("date helpers", () => {
  it("formats date to YYYY-MM-DD correctly without timezone shifts", () => {
    const d = new Date(2026, 9, 19); // 19 October 2026
    expect(formatDateIso(d)).toBe("2026-10-19");
  });

  it("parses YYYY-MM-DD string to local midnight date", () => {
    const d = parseDateIso("2026-10-19");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(9);
    expect(d.getDate()).toBe(19);
  });

  it("calculates month start and end range accurately", () => {
    const oct = getMonthRange(2026, 10);
    expect(oct.start).toBe("2026-10-01");
    expect(oct.end).toBe("2026-10-31");

    const feb = getMonthRange(2024, 2); // leap year
    expect(feb.start).toBe("2024-02-01");
    expect(feb.end).toBe("2024-02-29");
  });

  it("validates time strings including 24:00 and dot notations", () => {
    expect(isValidTimeString("08:00")).toBe(true);
    expect(isValidTimeString("08.00")).toBe(true);
    expect(isValidTimeString("16:00:00")).toBe(true);
    expect(isValidTimeString("24:00")).toBe(true);
    expect(isValidTimeString("24.00")).toBe(true);
    expect(isValidTimeString("25:00")).toBe(false);
    expect(isValidTimeString("12:65")).toBe(false);
    expect(isValidTimeString("invalid")).toBe(false);
  });

  it("formats time string to dot notation", () => {
    expect(formatTimeShort("08:00:00")).toBe("08.00");
    expect(formatTimeShort("16:30")).toBe("16.30");
  });

  it("calculates offset date correctly", () => {
    expect(getOffsetDateIso("2026-10-21", 1)).toBe("2026-10-22");
    expect(getOffsetDateIso("2026-10-21", -1)).toBe("2026-10-20");
    expect(getOffsetDateIso("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("formats date to Indonesian string", () => {
    // 2026-10-22 is Thursday (Kamis)
    const formatted = formatDateIndonesian("2026-10-22");
    expect(formatted).toBe("Kamis, 22 Oktober 2026");
    expect(formatDateIndonesian("2026-10-22", false)).toBe("22 Oktober 2026");
  });

});
