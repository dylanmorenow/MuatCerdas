import { describe, it, expect } from "vitest";
import {
  criticalTireLoadTonnes,
  vmaxSafeWorkKmh,
  tkphTire,
  tkphSite,
  workAverageSpeedKmh,
  qaAtZeroPayloadT,
  qaSlopePerPayloadT,
} from "../speed/tkph";

// §C.1–§C.3 — TKPH. AC#1: overload ⇒ Vmax_safe turun.
describe("TKPH §C.1–§C.3", () => {
  const share = 0.1;
  const tareKg = 9_500;

  it("Qa = (TKL+TKE)/2 dan naik terhadap payload", () => {
    const low = criticalTireLoadTonnes({ tareKg, payloadKg: 30_000, loadShareHeaviestPosition: share });
    const high = criticalTireLoadTonnes({ tareKg, payloadKg: 40_000, loadShareHeaviestPosition: share });
    expect(low.qaT).toBeCloseTo((low.tkLoadedT + low.tkEmptyT) / 2, 9);
    expect(high.qaT).toBeGreaterThan(low.qaT);
  });

  it("Qa linear: intersep & slope cocok dgn helper inversi (dipakai decision.ts)", () => {
    const payloadKg = 33_000;
    const q = criticalTireLoadTonnes({ tareKg, payloadKg, loadShareHeaviestPosition: share });
    const reconstructed = qaAtZeroPayloadT(tareKg, share) + qaSlopePerPayloadT(share) * (payloadKg / 1000);
    expect(reconstructed).toBeCloseTo(q.qaT, 9);
  });

  it("AC#1: muatan dinaikkan (overload) ⇒ Vmax_safe_work TURUN", () => {
    const tphTire = tkphTire(120, 0.85, 1.0);
    const normal = criticalTireLoadTonnes({ tareKg, payloadKg: 33_000, loadShareHeaviestPosition: share });
    const overload = criticalTireLoadTonnes({ tareKg, payloadKg: 45_000, loadShareHeaviestPosition: share });
    const vNormal = vmaxSafeWorkKmh(tphTire, normal.qaT);
    const vOver = vmaxSafeWorkKmh(tphTire, overload.qaT);
    expect(vOver).toBeLessThan(vNormal);
  });

  it("Vm = jarak/jam ; TKPH_site = Qa × Vm", () => {
    const vm = workAverageSpeedKmh(280, 12);
    expect(vm).toBeCloseTo(23.333, 3);
    expect(tkphSite(2.5, vm)).toBeCloseTo(2.5 * vm, 9);
  });

  it("TKPH_ban = katalog × koreksi suhu × koreksi situs (§C.2)", () => {
    expect(tkphTire(120, 0.85, 1.0)).toBeCloseTo(102, 9);
  });

  it("Qa = 0 ⇒ Vmax_safe tak terhingga (guard pembagian)", () => {
    expect(vmaxSafeWorkKmh(100, 0)).toBe(Infinity);
  });
});
