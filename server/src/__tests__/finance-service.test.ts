import { describe, it, expect } from "vitest";
import { defaultCostParams, type CostParams } from "@muatcerdas/shared";
import { computeFinanceKpis, financeScenarios } from "../services/finance";

describe("computeFinanceKpis (LOCK sanity §8)", () => {
  it("default params + overload 0 → sanity terkunci", () => {
    const k = computeFinanceKpis(defaultCostParams, 0);
    expect(Math.round(k.fleetCaptured)).toBe(1_615_384_615);
    expect(Math.round(k.capturedPerUnit)).toBe(53_846_154);
    expect(k.overloadCost).toBe(0);
    expect(k.payloadAvoidable).toBe(0);
    expect(k.paybackMonths).toBeCloseTo(3.7143, 3);
    expect(k.roiYear1).toBeCloseTo(2.0308, 3);
  });

  it("overloadCost = faktor × Σ overloadRate", () => {
    const p: CostParams = { ...defaultCostParams, overloadWearCostFactorIdr: 10_000_000 };
    const k = computeFinanceKpis(p, 1.2); // Σ rate 1,2
    expect(k.overloadCost).toBe(12_000_000);
    expect(k.payloadAvoidable).toBe(12_000_000);
    expect(Math.round(k.annualSavings)).toBe(1_615_384_615 + 12_000_000);
  });
});

describe("financeScenarios (skenario armada)", () => {
  it("fleetCaptured skala linear dengan fleetSize", () => {
    const s = financeScenarios(defaultCostParams, 0, [30, 60]);
    const f30 = s.find((x) => x.fleetSize === 30)!;
    const f60 = s.find((x) => x.fleetSize === 60)!;
    expect(Math.round(f30.fleetCaptured)).toBe(1_615_384_615);
    expect(f60.fleetCaptured).toBeCloseTo(f30.fleetCaptured * 2, 0);
    // payback membaik (lebih pendek) dgn armada lebih besar
    expect(f60.paybackMonths).toBeLessThan(f30.paybackMonths);
  });
});
