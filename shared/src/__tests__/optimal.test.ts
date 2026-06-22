import { describe, it, expect } from "vitest";
import { optimalSpeed, overloadSlowFactor, speedViolationLevel } from "../speed/optimal";

describe("optimalSpeed — kecepatan optimal produksi + perlambatan overload", () => {
  it("muatan pas (≤120 t) → optimal = V_required (dibatasi batas bahaya)", () => {
    const o = optimalSpeed({ vRequiredTravelKmh: 32, payloadT: 120, pasCapacityT: 120, ceilingKmh: 45 });
    expect(o.optimalKmh).toBe(32);
    expect(o.overloaded).toBe(false);
  });
  it("V_required di atas batas bahaya → dipotong ke batas", () => {
    const o = optimalSpeed({ vRequiredTravelKmh: 60, payloadT: 100, pasCapacityT: 120, ceilingKmh: 45 });
    expect(o.optimalKmh).toBe(45);
  });
  it("overload (>120 t) → optimal turun di bawah base (kebaikan ban)", () => {
    const o = optimalSpeed({ vRequiredTravelKmh: 32, payloadT: 144, pasCapacityT: 120, ceilingKmh: 45 });
    expect(o.overloaded).toBe(true);
    expect(o.optimalKmh).toBeLessThan(o.baseOptimalKmh);
    expect(o.optimalKmh).toBeCloseTo(32 * (120 / 144), 1); // 26,7
  });
  it("perlambatan overload punya lantai 70%", () => {
    expect(overloadSlowFactor(1000, 120)).toBe(0.7);
    expect(overloadSlowFactor(120, 120)).toBe(1);
    expect(overloadSlowFactor(90, 120)).toBe(1);
  });
});

describe("speedViolationLevel — perimeter pelanggaran menyesuaikan optimal", () => {
  it("ok / over_optimal / danger berdasarkan optimal & batas bahaya", () => {
    expect(speedViolationLevel(25, 30, 45)).toBe("ok");
    expect(speedViolationLevel(35, 30, 45)).toBe("over_optimal");
    expect(speedViolationLevel(47, 30, 45)).toBe("danger");
  });
  it("saat overload optimal turun → ambang over_optimal ikut turun", () => {
    // optimal 27 (overload) → 30 km/jam sudah over_optimal
    expect(speedViolationLevel(30, 27, 45)).toBe("over_optimal");
  });
});
