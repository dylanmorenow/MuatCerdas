import { describe, it, expect } from "vitest";
import { defaultCostParams } from "../assumptions";
import { tireAvoidableCost } from "../tire/finance";

// §12.7 — LOCK sanity PRD §8 terhadap FUNGSI NYATA (bukan rumus inline).
describe("tireAvoidableCost §12.7 (LOCK sanity PRD §8)", () => {
  const r = tireAvoidableCost(defaultCostParams);

  it("tiresActualPerYear ≈ 15,3846 ; tiresBestPerYear = 10", () => {
    expect(r.tiresActualPerYear).toBeCloseTo(15.3846, 3);
    expect(r.tiresBestPerYear).toBeCloseTo(10, 6);
  });
  it("avoidableTires ≈ 5,3846 /unit", () => {
    expect(r.avoidableTires).toBeCloseTo(5.3846, 3);
  });
  it("avoidableCostPerUnit = Rp107.692.308", () => {
    expect(Math.round(r.avoidableCostPerUnit)).toBe(107_692_308);
  });
  it("capturedPerUnit = Rp53.846.154", () => {
    expect(Math.round(r.capturedPerUnit)).toBe(53_846_154);
  });
  it("fleetCaptured (armada 30) = Rp1.615.384.615", () => {
    expect(Math.round(r.fleetCaptured)).toBe(1_615_384_615);
  });
});
