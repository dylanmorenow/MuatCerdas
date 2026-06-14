import { describe, it, expect } from "vitest";
import { overloadWearCost } from "../payload/wear";
import { defaultCostParams } from "../assumptions";
import type { CostParams, PayloadEvent } from "../types";

const T = 91_000;
const ev = (unitId: string, kg: number, i: number): PayloadEvent => ({
  id: `${unitId}-${i}`,
  unitId,
  operatorId: "OP",
  timestamp: "2026-06-01T00:00:00Z",
  measuredPayloadKg: kg,
  targetPayloadKg: T,
  status: "ok",
});

// HD-1: 2 dari 4 over → rate 0,5 ; HD-2: 0 over → 0.
const events = [
  ev("HD-1", 105_000, 1),
  ev("HD-1", 106_000, 2),
  ev("HD-1", 90_000, 3),
  ev("HD-1", 80_000, 4),
  ev("HD-2", 90_000, 1),
  ev("HD-2", 91_000, 2),
];

describe("overloadWearCost §12.4", () => {
  it("default factor 0 → semua biaya 0 (rate tetap dihitung)", () => {
    const r = overloadWearCost(events, defaultCostParams);
    expect(r.total).toBe(0);
    const hd1 = r.byUnit.find((u) => u.unitId === "HD-1");
    expect(hd1?.overloadRate).toBeCloseTo(0.5, 6);
    expect(hd1?.overEvents).toBe(2);
    expect(hd1?.costIdr).toBe(0);
  });

  it("factor > 0 → biaya = rate × factor", () => {
    const p: CostParams = { ...defaultCostParams, overloadWearCostFactorIdr: 10_000_000 };
    const r = overloadWearCost(events, p);
    const hd1 = r.byUnit.find((u) => u.unitId === "HD-1");
    const hd2 = r.byUnit.find((u) => u.unitId === "HD-2");
    expect(hd1?.costIdr).toBe(5_000_000); // 0,5 × 10jt
    expect(hd2?.costIdr).toBe(0);
    expect(r.total).toBe(5_000_000);
  });
});
