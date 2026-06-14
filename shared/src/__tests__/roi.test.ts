import { describe, it, expect } from "vitest";
import { defaultCostParams } from "../assumptions";
import { roi, financialSummary } from "../finance/roi";
import type { CostParams } from "../types";

// §12.8–§12.9 — LOCK sanity PRD §8.
describe("financialSummary §12.8–§12.9 (LOCK)", () => {
  const s = financialSummary(defaultCostParams);

  it("lever payload default = 0 (placeholder, tak membesar-besarkan)", () => {
    expect(s.underloadExtraCost).toBe(0);
    expect(s.overloadCost).toBe(0);
  });
  it("annualSavings = fleetCaptured = Rp1.615.384.615", () => {
    expect(Math.round(s.annualSavings)).toBe(1_615_384_615);
  });
  it("paybackMonths ≈ 3,7143 bln", () => {
    expect(s.paybackMonths).toBeCloseTo(3.7143, 3);
  });
  it("roiYear1 ≈ 2,0308 (≈203%)", () => {
    expect(s.roiYear1).toBeCloseTo(2.0308, 3);
  });
});

describe("roi() & injeksi overloadCost", () => {
  it("payback = capex / (savings/12)", () => {
    // savings 1,2 M → 100 jt/bln → 500 jt / 100 jt = 5 bln
    expect(roi(1_200_000_000, defaultCostParams).paybackMonths).toBeCloseTo(5, 6);
  });
  it("savings 0 → payback Infinity (tak balik modal)", () => {
    expect(roi(0, defaultCostParams).paybackMonths).toBe(Infinity);
  });
  it("overloadCost di-inject menambah annualSavings", () => {
    const s = financialSummary(defaultCostParams, { overloadCost: 384_615_385 });
    expect(Math.round(s.annualSavings)).toBe(2_000_000_000);
  });
  it("underloadExtraCost ikut dihitung bila param payload diisi", () => {
    const p: CostParams = {
      ...defaultCostParams,
      tripsPerYear: 10_000,
      underloadPct: 0.03,
      fuelCostPerTripIdr: 500_000,
    };
    // 10.000 * 0,03 * 500.000 = 150.000.000
    expect(financialSummary(p).underloadExtraCost).toBe(150_000_000);
  });
});
