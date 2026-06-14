import { describe, it, expect } from "vitest";
import {
  fitTireModel,
  predictRemainingLife,
  conditionMultiplier,
  fallbackLife,
  MIN_TRAINING_ROWS,
  type TireFeatures,
  type TireTrainingRow,
} from "../tire/predict";

// Dataset sintetis deterministik & full-rank: umur = fungsi linear menurun terhadap
// tekanan, jalan, muatan, operator (+ efek merek). Tanpa noise → regresi memulihkan
// koefisien & monotonisitas. (period 6/4/5 + operator alternating + merek blok.)
const PRESS = [0, 3, 6, 9, 12, 15];
const ROAD = [0.1, 0.35, 0.6, 0.85];
const LOAD = [0.7, 0.8, 0.9, 1.0, 1.1];

function makeRows(): TireTrainingRow[] {
  const rows: TireTrainingRow[] = [];
  for (let i = 0; i < 30; i++) {
    const p = PRESS[i % PRESS.length]!;
    const rd = ROAD[i % ROAD.length]!;
    const ld = LOAD[i % LOAD.length]!;
    const op = i % 2 === 0 ? 0.1 : 0.4;
    const model = i < 15 ? "Scania P410" : "Volvo FH16";
    const brandEff = model === "Volvo FH16" ? 4_000 : 0;
    const lifeKm = 130_000 - 1_500 * p - 50_000 * rd - 15_000 * ld - 8_000 * op + brandEff;
    rows.push({
      model,
      avgPressureDeviationPct: p,
      loadIndex: ld,
      weightedRoadConditionExposure: rd,
      operatorFactor: op,
      lifeKm,
    });
  }
  return rows;
}

const good: TireFeatures = {
  model: "Scania P410",
  avgPressureDeviationPct: 0,
  loadIndex: 0.7,
  weightedRoadConditionExposure: 0.1,
  operatorFactor: 0,
};
const bad: TireFeatures = {
  model: "Scania P410",
  avgPressureDeviationPct: 15,
  loadIndex: 1.0,
  weightedRoadConditionExposure: 0.8,
  operatorFactor: 0.5,
};

describe("fitTireModel + predictRemainingLife §12.1", () => {
  const model = fitTireModel(makeRows());

  it("model tidak degenerate & fit sangat baik (R² ≈ 1)", () => {
    expect(model.degenerate).toBe(false);
    expect(model.n).toBe(30);
    expect(model.r2).toBeGreaterThan(0.99);
  });

  it("koefisien faktor buruk bertanda negatif (explainable)", () => {
    expect(model.coefficients.pressure).toBeLessThan(0);
    expect(model.coefficients.road).toBeLessThan(0);
    expect(model.coefficients.loadIndex).toBeLessThan(0);
    expect(model.coefficients.operator).toBeLessThan(0);
  });

  it("AC FR-0002-4 #3: unit jalan-buruk/tekanan-tinggi sisa umurnya lebih rendah", () => {
    const g = predictRemainingLife({ features: good, currentKm: 30_000, tireLifeBestKm: 120_000 }, model);
    const b = predictRemainingLife({ features: bad, currentKm: 30_000, tireLifeBestKm: 120_000 }, model);
    expect(b.remainingLifeKm).toBeLessThan(g.remainingLifeKm);
    expect(g.usedFallback).toBe(false);
    expect(g.confidence).toBeGreaterThan(0.99);
  });

  it("memulihkan umur sebenarnya (≈ data generating process)", () => {
    const g = predictRemainingLife({ features: good, currentKm: 0, tireLifeBestKm: 120_000 }, model);
    // 130000 - 50000*0,1 - 15000*0,7 = 114.500
    expect(g.predictedLifeKm).toBeCloseTo(114_500, -2);
  });

  it("interval keyakinan terurut: low ≤ remaining ≤ high (FR-0002-4 #1)", () => {
    const g = predictRemainingLife({ features: good, currentKm: 30_000, tireLifeBestKm: 120_000 }, model);
    expect(g.remainingLifeLowKm).toBeLessThanOrEqual(g.remainingLifeKm);
    expect(g.remainingLifeKm).toBeLessThanOrEqual(g.remainingLifeHighKm);
  });
});

describe("fallback heuristik (AC FR-0002-4 #2)", () => {
  it("data < MIN_TRAINING_ROWS → degenerate", () => {
    const m = fitTireModel(makeRows().slice(0, MIN_TRAINING_ROWS - 1));
    expect(m.degenerate).toBe(true);
  });

  it("fallback = best × pengali kondisi, ditandai estimasi awal (confidence rendah)", () => {
    const m = fitTireModel(makeRows().slice(0, 3));
    const feat: TireFeatures = {
      model: "Scania P410",
      avgPressureDeviationPct: 5,
      loadIndex: 0.9,
      weightedRoadConditionExposure: 0.2,
      operatorFactor: 0.3,
    };
    const pred = predictRemainingLife({ features: feat, currentKm: 10_000, tireLifeBestKm: 100_000 }, m);
    expect(pred.usedFallback).toBe(true);
    expect(pred.confidence).toBe(0.3);
    expect(pred.predictedLifeKm).toBeCloseTo(100_000 * conditionMultiplier(feat), 6);
  });
});

describe("helper kondisi", () => {
  it("conditionMultiplier 1 saat kondisi ideal, terlantai 0,5 saat ekstrem", () => {
    expect(conditionMultiplier({ avgPressureDeviationPct: 0, weightedRoadConditionExposure: 0 })).toBe(1);
    expect(conditionMultiplier({ avgPressureDeviationPct: 200, weightedRoadConditionExposure: 1 })).toBe(0.5);
  });
  it("fallbackLife = best × multiplier", () => {
    expect(fallbackLife(100_000, 0.9)).toBe(90_000);
  });
});
