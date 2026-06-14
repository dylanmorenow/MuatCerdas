import { describe, it, expect } from "vitest";
import { fitTireModel, type TireFeatures, type TireTrainingRow } from "../tire/predict";
import { attributeWear } from "../tire/attribution";

// Dataset sintetis sama seperti tire-predict (full-rank, tanpa noise).
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

const baseline: TireFeatures = {
  model: "Scania P410",
  avgPressureDeviationPct: 0,
  loadIndex: 0.7,
  weightedRoadConditionExposure: 0.1,
  operatorFactor: 0,
};
const actual: TireFeatures = {
  model: "Scania P410",
  avgPressureDeviationPct: 15,
  loadIndex: 1.0,
  weightedRoadConditionExposure: 0.8,
  operatorFactor: 0.5,
};

describe("attributeWear §12.2 (AC FR-0002-5)", () => {
  const model = fitTireModel(makeRows());
  const r = attributeWear({ features: actual, baselineFeatures: baseline }, model);

  it("shortfall positif (kondisi memburuk)", () => {
    expect(r.shortfallKm).toBeGreaterThan(0);
  });

  it("Σ kontribusi = shortfall", () => {
    const sum = r.contributions.reduce((s, c) => s + c.contribution, 0);
    expect(sum).toBeCloseTo(r.shortfallKm, 3);
  });

  it("faktor jalan, tekanan, muatan, operator berkontribusi positif (memperburuk)", () => {
    const get = (f: string) => r.contributions.find((c) => c.factor === f)?.contribution ?? 0;
    expect(get("Kondisi jalan")).toBeGreaterThan(0);
    expect(get("Tekanan ban")).toBeGreaterThan(0);
    expect(get("Muatan")).toBeGreaterThan(0);
    expect(get("Operator")).toBeGreaterThan(0);
  });

  it("baseline = actual → shortfall 0 & semua kontribusi 0", () => {
    const same = attributeWear({ features: baseline, baselineFeatures: baseline }, model);
    expect(same.shortfallKm).toBeCloseTo(0, 6);
    for (const c of same.contributions) expect(c.contribution).toBeCloseTo(0, 6);
  });
});
