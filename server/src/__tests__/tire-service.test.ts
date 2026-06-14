import { describe, it, expect } from "vitest";
import { fitTireModel, predictRemainingLife, attributeWear, type TireFeatures } from "@muatcerdas/shared";
import {
  deriveOperatorFactors,
  unitOperatorFactor,
  unitRoadExposure,
  currentTireKm,
  buildTrainingRows,
  fleetBaseline,
  tireStatus,
} from "../services/tire";

describe("deriveOperatorFactors (overload HD785 → 0..1)", () => {
  it("normalisasi min→0, max→1, sisanya proporsional", () => {
    const f = deriveOperatorFactors([
      { operatorId: "A", over: 0, total: 100 }, // rate 0 → min
      { operatorId: "B", over: 50, total: 100 }, // rate 0,5 → max
      { operatorId: "C", over: 20, total: 100 }, // rate 0,2 → 0,4
    ]);
    expect(f.get("A")).toBeCloseTo(0, 6);
    expect(f.get("B")).toBeCloseTo(1, 6);
    expect(f.get("C")).toBeCloseTo(0.4, 6);
  });
  it("semua sama → 0,5", () => {
    const f = deriveOperatorFactors([
      { operatorId: "A", over: 10, total: 100 },
      { operatorId: "B", over: 10, total: 100 },
    ]);
    expect(f.get("A")).toBe(0.5);
  });
});

describe("unitOperatorFactor (rata-rata berbobot trip)", () => {
  it("dominasi operator utama", () => {
    const factors = new Map([
      ["P", 0.8],
      ["Q", 0.2],
    ]);
    const v = unitOperatorFactor(
      [
        { operatorId: "P", trips: 7 },
        { operatorId: "Q", trips: 3 },
      ],
      factors,
    );
    expect(v).toBeCloseTo(0.8 * 0.7 + 0.2 * 0.3, 6); // 0,62
  });
});

describe("unitRoadExposure", () => {
  it("Σ km·(1−cond)/Σ km", () => {
    const v = unitRoadExposure([
      { km: 100, conditionScore: 0.4 }, // bad 60
      { km: 100, conditionScore: 0.9 }, // bad 10
    ]);
    expect(v).toBeCloseTo(0.35, 6); // 70/200
  });
  it("kosong → 0", () => expect(unitRoadExposure([])).toBe(0));
});

describe("currentTireKm (heuristik, ter-clamp 30..330 hari)", () => {
  const today = new Date("2026-06-14T00:00:00Z");
  it("100 hari × 100.000 km/th", () => {
    const last = new Date(today.getTime() - 100 * 86_400_000);
    expect(currentTireKm(last, today, 100_000)).toBe(Math.round((100 / 365) * 100_000));
  });
  it("clamp atas (>330 hari)", () => {
    const last = new Date(today.getTime() - 500 * 86_400_000);
    expect(currentTireKm(last, today, 100_000)).toBe(Math.round((330 / 365) * 100_000));
  });
});

describe("buildTrainingRows", () => {
  const unitModel = new Map([["U1", "Scania P410"]]);
  const unitRoad = new Map([["U1", 0.5]]);
  const unitOperator = new Map([["U1", 0.3]]);
  it("memetakan fitur per-ban + per-unit; lewati kmAtRemoval null", () => {
    const rows = buildTrainingRows(
      [
        { unitId: "U1", avgPressureDeviationPct: 5, loadIndex: 1.0, kmAtRemoval: 80_000 },
        { unitId: "U1", avgPressureDeviationPct: 8, loadIndex: 1.1, kmAtRemoval: null }, // dilewati
      ],
      unitModel,
      unitRoad,
      unitOperator,
    );
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({
      lifeKm: 80_000,
      avgPressureDeviationPct: 5,
      loadIndex: 1.0,
      weightedRoadConditionExposure: 0.5,
      operatorFactor: 0.3,
      model: "Scania P410",
    });
  });
});

describe("fleetBaseline", () => {
  it("ambil minimum tekanan/jalan/operator; muatan nominal 0,9", () => {
    const list: TireFeatures[] = [
      { model: "A", avgPressureDeviationPct: 3, loadIndex: 1.1, weightedRoadConditionExposure: 0.4, operatorFactor: 0.2 },
      { model: "A", avgPressureDeviationPct: 9, loadIndex: 0.9, weightedRoadConditionExposure: 0.6, operatorFactor: 0.8 },
    ];
    expect(fleetBaseline(list)).toEqual({
      avgPressureDeviationPct: 3,
      loadIndex: 0.9,
      weightedRoadConditionExposure: 0.4,
      operatorFactor: 0.2,
    });
  });
});

describe("tireStatus", () => {
  it("ambang sisa umur", () => {
    expect(tireStatus(5_000)).toBe("critical");
    expect(tireStatus(20_000)).toBe("warn");
    expect(tireStatus(40_000)).toBe("ok");
  });
});

describe("integrasi: assembly → fit → prediksi → atribusi (lewat shared)", () => {
  // Dataset sintetis: 6 unit × ~6 ban, 4 faktor bervariasi & DB-derivable.
  const unitModel = new Map<string, string>();
  const unitRoad = new Map<string, number>();
  const unitOperator = new Map<string, number>();
  const records: {
    unitId: string;
    avgPressureDeviationPct: number;
    loadIndex: number;
    kmAtRemoval: number;
  }[] = [];

  for (let u = 0; u < 6; u++) {
    const id = `U${u}`;
    const model = u % 2 === 0 ? "Scania P410" : "Volvo FH16";
    const road = 0.4 + 0.03 * u; // 0,40..0,55
    const operator = 0.1 + 0.14 * u; // 0,10..0,80
    unitModel.set(id, model);
    unitRoad.set(id, road);
    unitOperator.set(id, operator);
    for (let k = 0; k < 6; k++) {
      const pressure = 2 + k * 2 + u; // bervariasi
      const load = 0.85 + 0.05 * (k % 3);
      const life =
        120_000 - 1_200 * pressure - 40_000 * road - 18_000 * Math.max(0, load - 0.9) - 22_000 * operator;
      records.push({ unitId: id, avgPressureDeviationPct: pressure, loadIndex: load, kmAtRemoval: Math.round(life) });
    }
  }

  const model = fitTireModel(buildTrainingRows(records, unitModel, unitRoad, unitOperator));

  it("model tidak degenerate & fit baik", () => {
    expect(model.degenerate).toBe(false);
    expect(model.n).toBe(36);
    expect(model.r2).toBeGreaterThan(0.9);
  });

  it("unit kondisi buruk → sisa umur < unit baik (AC FR-0002-4 #3)", () => {
    const good: TireFeatures = { model: "Scania P410", avgPressureDeviationPct: 2, loadIndex: 0.9, weightedRoadConditionExposure: 0.4, operatorFactor: 0.1 };
    const bad: TireFeatures = { model: "Scania P410", avgPressureDeviationPct: 14, loadIndex: 1.1, weightedRoadConditionExposure: 0.55, operatorFactor: 0.8 };
    const g = predictRemainingLife({ features: good, currentKm: 30_000, tireLifeBestKm: 120_000 }, model);
    const b = predictRemainingLife({ features: bad, currentKm: 30_000, tireLifeBestKm: 120_000 }, model);
    expect(b.remainingLifeKm).toBeLessThan(g.remainingLifeKm);
  });

  it("atribusi menjumlah ke shortfall (AC FR-0002-5)", () => {
    const features: TireFeatures = { model: "Scania P410", avgPressureDeviationPct: 12, loadIndex: 1.1, weightedRoadConditionExposure: 0.55, operatorFactor: 0.8 };
    const baseline = { ...fleetBaseline([features]), avgPressureDeviationPct: 2, weightedRoadConditionExposure: 0.4, operatorFactor: 0.1, model: "Scania P410" };
    const attr = attributeWear({ features, baselineFeatures: baseline }, model);
    const sum = attr.contributions.reduce((s, c) => s + c.contribution, 0);
    expect(sum).toBeCloseTo(attr.shortfallKm, 3);
  });
});
