import { describe, it, expect } from "vitest";
import {
  productionSpeed,
  travelToWorkAvg,
  workAvgToTravel,
  type ProductionSpeedInput,
} from "../speed/productionSpeed";

const base: ProductionSpeedInput = {
  dailyTargetTon: 6_000,
  payloadPerUnitTon: 33,
  unitCount: 30,
  effectiveWorkHoursPerDay: 20,
  fixedTimeHours: 0.5,
  oneWayKm: 35,
};

// §C.4–§C.5 — kebutuhan kecepatan & rekonsiliasi satuan.
describe("productionSpeed §C.4–§C.5", () => {
  it("AC#2: target produksi dinaikkan ⇒ V_required naik (work & travel)", () => {
    const lo = productionSpeed(base);
    const hi = productionSpeed({ ...base, dailyTargetTon: 9_000 });
    expect(hi.vRequiredWorkKmh).toBeGreaterThan(lo.vRequiredWorkKmh);
    expect(hi.vRequiredTravelKmh).toBeGreaterThan(lo.vRequiredTravelKmh);
  });

  it("AC#5: vRequiredWork == vRequiredTravel × travelFraction (tak ada apel-jeruk)", () => {
    const r = productionSpeed(base);
    expect(r.vRequiredWorkKmh).toBeCloseTo(r.vRequiredTravelKmh * r.travelFraction, 9);
    // basis travel ≥ basis work karena travelFraction ≤ 1
    expect(r.vRequiredTravelKmh).toBeGreaterThanOrEqual(r.vRequiredWorkKmh);
  });

  it("AC#5: konversi basis bolak-balik konsisten", () => {
    const r = productionSpeed(base);
    expect(travelToWorkAvg(r.vRequiredTravelKmh, r.travelFraction)).toBeCloseTo(r.vRequiredWorkKmh, 9);
    expect(workAvgToTravel(r.vRequiredWorkKmh, r.travelFraction)).toBeCloseTo(r.vRequiredTravelKmh, 9);
  });

  it("nilai eksplisit: vRequiredWork = 2·oneWay / cycleTime", () => {
    const r = productionSpeed(base);
    expect(r.tripsPerUnitPerDay).toBeCloseTo(6.0606, 3);
    expect(r.cycleTimeAvailableHours).toBeCloseTo(3.3, 3);
    expect(r.vRequiredWorkKmh).toBeCloseTo(21.212, 2);
    expect(r.vRequiredTravelKmh).toBeCloseTo(25.0, 2);
  });

  it("siklus mustahil bila waktu tetap ≥ waktu siklus", () => {
    const r = productionSpeed({ ...base, fixedTimeHours: 100 });
    expect(r.feasibleCycle).toBe(false);
    expect(r.vRequiredTravelKmh).toBe(Infinity);
  });
});
