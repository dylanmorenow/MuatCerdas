import { describe, it, expect } from "vitest";
import { needsCalibration, calibrationAgeDays } from "../payload/calibration";
import type { CalibrationRecord } from "../types";

const today = new Date("2026-06-14T00:00:00Z");
const daysAgo = (n: number): string =>
  new Date(today.getTime() - n * 86_400_000).toISOString().slice(0, 10);
const rec = (offset: number, ageDays: number): CalibrationRecord => ({
  unitId: "HD-1",
  lastCalibrationDate: daysAgo(ageDays),
  scaleStudyOffsetPct: offset,
});

// §12.6 — perlu kalibrasi bila |offset| > 5% ATAU usia > 90 hari (strict).
describe("needsCalibration §12.6 (strict)", () => {
  it("offset 6% → true", () => expect(needsCalibration(rec(6, 10), today)).toBe(true));
  it("offset -6% (pakai abs) → true", () => expect(needsCalibration(rec(-6, 10), today)).toBe(true));
  it("offset 3% & usia 100 hari → true (usia)", () => expect(needsCalibration(rec(3, 100), today)).toBe(true));
  it("offset 3% & usia 30 hari → false", () => expect(needsCalibration(rec(3, 30), today)).toBe(false));
  it("offset tepat 5% → false (strict >5)", () => expect(needsCalibration(rec(5, 30), today)).toBe(false));
  it("usia tepat 90 hari → false (strict >90)", () => expect(needsCalibration(rec(3, 90), today)).toBe(false));
});

describe("calibrationAgeDays", () => {
  it("menghitung selisih hari penuh", () => expect(calibrationAgeDays(rec(0, 45), today)).toBe(45));
});
