import { describe, it, expect } from "vitest";
import { defaultSpeedParams, defaultTkphCatalog, type SpeedParams } from "@muatcerdas/shared";
import { computeSpeedModel, buildSpeedUnitRow, type SpeedUnitInput } from "../services/speed";

const catalog = new Map(Object.entries(defaultTkphCatalog));

function haul(id: string, payloadKg: number, tireModel = "Bridgestone M840"): SpeedUnitInput {
  return { id, model: "Scania R580", tireModel, tareKg: 9_500, payloadKg, targetKg: 34_000 };
}

describe("computeSpeedModel (Modul C, MURNI tanpa DB)", () => {
  const haulUnits = [haul("HT-01", 33_000), haul("HT-02", 33_000), haul("HT-03", 33_000), haul("HT-04", 47_000)];
  const hd785Units: SpeedUnitInput[] = [
    { id: "HD-01", model: "Komatsu HD785-7", tireModel: "Bridgestone VRPS 27.00R49", tareKg: 75_000, payloadKg: 100_000, targetKg: 91_000 },
    { id: "HD-02", model: "Komatsu HD785-7", tireModel: "Bridgestone VRPS 27.00R49", tareKg: 75_000, payloadKg: 85_000, targetKg: 91_000 },
  ];

  it("AC#1 (service): unit overload punya Vmax_safe lebih rendah", () => {
    const m = computeSpeedModel({ params: defaultSpeedParams, catalog, haulUnits, hd785Units });
    const overload = m.units.find((u) => u.id === "HT-04")!;
    const normal = m.units.find((u) => u.id === "HT-01")!;
    expect(overload.payloadT).toBeGreaterThan(normal.payloadT);
    expect(overload.vmaxSafeWorkKmh).toBeLessThan(normal.vmaxSafeWorkKmh);
    expect(overload.overTarget).toBe(true); // 47 t > 34 t rated
  });

  it("driver: Vmax travel ≥ Vmax work (basis travel utk spidometer)", () => {
    const m = computeSpeedModel({ params: defaultSpeedParams, catalog, haulUnits, hd785Units });
    for (const u of m.units) expect(u.vmaxSafeTravelKmh).toBeGreaterThanOrEqual(u.vmaxSafeWorkKmh);
  });

  it("AC#3 (service): target rendah ⇒ fleet AMAN + rekomendasi", () => {
    const params: SpeedParams = { ...defaultSpeedParams, dailyTargetTon: 900 };
    const m = computeSpeedModel({ params, catalog, haulUnits, hd785Units });
    expect(m.fleet.decision.status).toBe("safe");
    expect(m.fleet.decision.recommendedWorkKmh).not.toBeNull();
  });

  it("AC#4 (service): target tinggi ⇒ fleet KONFLIK + ≥1 opsi terukur", () => {
    const params: SpeedParams = { ...defaultSpeedParams, dailyTargetTon: 8_000 };
    const m = computeSpeedModel({ params, catalog, haulUnits, hd785Units });
    expect(m.fleet.decision.status).toBe("conflict");
    expect(m.fleet.decision.options.length).toBeGreaterThanOrEqual(1);
    for (const o of m.fleet.decision.options) expect(Number.isFinite(o.value)).toBe(true);
  });

  it("HD785 panel: payload > target ditandai overTarget", () => {
    const m = computeSpeedModel({ params: defaultSpeedParams, catalog, haulUnits, hd785Units });
    expect(m.hd785.find((u) => u.id === "HD-01")!.overTarget).toBe(true);
    expect(m.hd785.find((u) => u.id === "HD-02")!.overTarget).toBe(false);
  });

  it("katalog fallback dipakai bila model ban tak dikenal", () => {
    const row = buildSpeedUnitRow({
      unit: haul("HT-X", 33_000, "Model Tak Dikenal"),
      catalogTkph: (catalog.get("Model Tak Dikenal") || 110),
      params: defaultSpeedParams,
      vmKmh: 23,
      vRequiredWorkKmh: 20,
      travelFraction: 0.85,
    });
    expect(row.catalogTkph).toBe(110); // DEFAULT_TKPH_FALLBACK
  });
});
