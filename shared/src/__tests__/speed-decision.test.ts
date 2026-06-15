import { describe, it, expect } from "vitest";
import { decideSpeed, tkphLifeAdjustmentPct } from "../speed/decision";

// §C.6 — keputusan AMAN/KONFLIK + opsi terukur. Perbandingan satu-basis (work).
describe("decideSpeed §C.6", () => {
  it("AC#3: vRequired ≤ Vmax_safe ⇒ AMAN + rekomendasi kecepatan", () => {
    const d = decideSpeed({ vRequiredWorkKmh: 21, vmaxSafeWorkKmh: 39 });
    expect(d.status).toBe("safe");
    expect(d.recommendedWorkKmh).toBe(21);
    expect(d.marginKmh).toBeCloseTo(18, 9);
    expect(d.options).toHaveLength(0);
  });

  it("AC#4: vRequired > Vmax_safe ⇒ KONFLIK + ≥1 opsi solusi terukur", () => {
    const d = decideSpeed({
      vRequiredWorkKmh: 50,
      vmaxSafeWorkKmh: 39,
      context: {
        unitCount: 30,
        dailyTargetTon: 11_000,
        overload: {
          tkphTireValue: 98.4,
          currentPayloadT: 33,
          qaAtZeroPayloadT: 0.1 * 9.575, // share·tareT
          qaSlopePerPayloadT: 0.1 / 2, // share/2
        },
      },
    });
    expect(d.status).toBe("conflict");
    expect(d.recommendedWorkKmh).toBeNull();
    expect(d.options.length).toBeGreaterThanOrEqual(1);
    for (const o of d.options) expect(Number.isFinite(o.value)).toBe(true);

    const add = d.options.find((o) => o.kind === "add_units");
    expect(add).toBeTruthy();
    expect(add!.value).toBeGreaterThan(0);
    expect(add!.basis).toBe("work");

    const lower = d.options.find((o) => o.kind === "lower_target");
    expect(lower?.basis).toBe("work");
    expect(lower!.value).toBeLessThan(11_000);

    const reduce = d.options.find((o) => o.kind === "reduce_overload");
    expect(reduce?.basis).toBe("work");
    expect(reduce!.value).toBeLessThan(33); // payload maks < muatan kini
  });

  it("opsi add_units cukup menurunkan vRequiredWork ke ≤ Vmax_safe (basis work)", () => {
    const unitCount = 30;
    const vReq = 50;
    const vMax = 39;
    const d = decideSpeed({ vRequiredWorkKmh: vReq, vmaxSafeWorkKmh: vMax, context: { unitCount } });
    const add = d.options.find((o) => o.kind === "add_units")!;
    const needed = unitCount + add.value;
    // vRequiredWork ∝ 1/unitCount → pada `needed` unit harus ≤ Vmax_safe
    expect((vReq * unitCount) / needed).toBeLessThanOrEqual(vMax + 1e-9);
  });

  it("output keputusan menahan kedua nilai pada basis work (AC#5: satu-basis)", () => {
    const d = decideSpeed({ vRequiredWorkKmh: 50, vmaxSafeWorkKmh: 39 });
    expect(d.vRequiredWorkKmh).toBe(50);
    expect(d.vmaxSafeWorkKmh).toBe(39);
  });

  it("FR-6: tkphLifeAdjustmentPct — over-TKPH ⇒ penalti umur (cap 50%)", () => {
    expect(tkphLifeAdjustmentPct(120, 100)).toBeCloseTo(0.2, 9);
    expect(tkphLifeAdjustmentPct(90, 100)).toBe(0); // di bawah batas → tanpa penalti
    expect(tkphLifeAdjustmentPct(1_000, 100)).toBe(0.5); // dibatasi
  });
});
