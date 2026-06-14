// §12.1 — Prediksi umur ban (Modul A). Sumber kebenaran rumus: PRD §12.1.
//
// Regresi linear berganda (library ml-regression-multivariate-linear):
//   predictedLifeKm = β0 + β1*pressureDev + β2*loadIndex
//                   + β3*weightedRoadConditionExposure + β4*operatorFactor + (dummy merek)
//   remainingLifeKm = predictedLifeKm - currentKm
// Koefisien diekspos (explainable, NFR-0002-6). Fallback heuristik bila data minim
// (best-practice merek × pengali kondisi), ditandai "estimasi awal" (AC FR-0002-4 #2).

import MLR from "ml-regression-multivariate-linear";

export interface TireFeatures {
  /** % deviasi tekanan dari spesifikasi (makin tinggi makin buruk). */
  avgPressureDeviationPct: number;
  /** Indeks muatan relatif kapasitas (makin tinggi makin buruk). */
  loadIndex: number;
  /** Eksposur kondisi jalan terbobot 0..1 (makin tinggi = jalan makin buruk). */
  weightedRoadConditionExposure: number;
  /** Faktor operator 0..1 (makin tinggi makin agresif/buruk). */
  operatorFactor: number;
  /** Merek/model truk → dummy. */
  model: string;
}

/** Baris latih = fitur + umur ban teramati (km) sebagai target. */
export type TireTrainingRow = TireFeatures & { lifeKm: number };

export interface TireCoefficients {
  intercept: number;
  pressure: number;
  loadIndex: number;
  road: number;
  operator: number;
  /** Koefisien dummy per merek (merek referensi = 0). */
  brand: Record<string, number>;
}

export interface TireModel {
  coefficients: TireCoefficients;
  /** Merek referensi (dummy = 0). */
  referenceBrand: string;
  /** Semua merek yang dikenal model. */
  brands: string[];
  /** Akar rata-rata galat kuadrat (km) — dasar interval keyakinan. */
  rmse: number;
  /** Koefisien determinasi 0..1 — dasar confidence. */
  r2: number;
  /** Jumlah baris latih. */
  n: number;
  /** true bila fit gagal/data degenerate → konsumen WAJIB fallback. */
  degenerate: boolean;
}

/** Ambang minimum baris latih untuk fit (di bawah ini → fallback). */
export const MIN_TRAINING_ROWS = 8;
/** Lantai pengali kondisi pada fallback heuristik. */
export const CONDITION_FLOOR = 0.5;

const Z_95 = 1.96;
const NUM_CORE_FEATURES = 4; // pressure, loadIndex, road, operator

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
function clamp01(v: number): number {
  return clamp(v, 0, 1);
}

function featureVector(f: TireFeatures, dummyBrands: string[]): number[] {
  return [
    f.avgPressureDeviationPct,
    f.loadIndex,
    f.weightedRoadConditionExposure,
    f.operatorFactor,
    ...dummyBrands.map((b) => (f.model === b ? 1 : 0)),
  ];
}

function getWeight(weights: number[][], i: number): number {
  const v = weights[i]?.[0];
  return typeof v === "number" ? v : NaN;
}

function emptyCoefficients(brands: string[]): TireCoefficients {
  const brand: Record<string, number> = {};
  for (const b of brands) brand[b] = 0;
  return { intercept: 0, pressure: 0, loadIndex: 0, road: 0, operator: 0, brand };
}

function readCoefficients(
  weights: number[][],
  brands: string[],
  dummyBrands: string[],
): TireCoefficients | null {
  const numFeatures = NUM_CORE_FEATURES + dummyBrands.length;
  if (weights.length < numFeatures + 1) return null;

  const pressure = getWeight(weights, 0);
  const loadIndex = getWeight(weights, 1);
  const road = getWeight(weights, 2);
  const operator = getWeight(weights, 3);
  const intercept = getWeight(weights, numFeatures);

  const brand: Record<string, number> = {};
  for (const b of brands) brand[b] = 0;
  const dummyValues: number[] = [];
  dummyBrands.forEach((b, k) => {
    const v = getWeight(weights, NUM_CORE_FEATURES + k);
    brand[b] = v;
    dummyValues.push(v);
  });

  const all = [pressure, loadIndex, road, operator, intercept, ...dummyValues];
  if (all.some((v) => !Number.isFinite(v))) return null;

  return { intercept, pressure, loadIndex, road, operator, brand };
}

/** Prediksi umur (km) dari koefisien — linear, TANPA clamp (untuk additivitas atribusi). */
export function tirePredictedLifeKm(model: TireModel, f: TireFeatures): number {
  const c = model.coefficients;
  return (
    c.intercept +
    c.pressure * f.avgPressureDeviationPct +
    c.loadIndex * f.loadIndex +
    c.road * f.weightedRoadConditionExposure +
    c.operator * f.operatorFactor +
    (c.brand[f.model] ?? 0)
  );
}

function diagnostics(
  rows: TireTrainingRow[],
  model: TireModel,
): { rmse: number; r2: number } {
  const n = rows.length;
  const meanY = rows.reduce((s, r) => s + r.lifeKm, 0) / n;
  let ssRes = 0;
  let ssTot = 0;
  for (const r of rows) {
    const pred = tirePredictedLifeKm(model, r);
    ssRes += (r.lifeKm - pred) ** 2;
    ssTot += (r.lifeKm - meanY) ** 2;
  }
  const rmse = Math.sqrt(ssRes / n);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { rmse, r2 };
}

/** Fit model umur ban (§12.1). Mengembalikan model degenerate bila data tak memadai. */
export function fitTireModel(rows: TireTrainingRow[]): TireModel {
  const brands = [...new Set(rows.map((r) => r.model))].sort();
  const referenceBrand = brands[0] ?? "";
  const dummyBrands = brands.slice(1);
  const numFeatures = NUM_CORE_FEATURES + dummyBrands.length;

  const degenerateModel = (): TireModel => ({
    coefficients: emptyCoefficients(brands),
    referenceBrand,
    brands,
    rmse: NaN,
    r2: 0,
    n: rows.length,
    degenerate: true,
  });

  // Butuh cukup baris > jumlah parameter agar fit bermakna.
  if (rows.length < Math.max(MIN_TRAINING_ROWS, numFeatures + 2)) {
    return degenerateModel();
  }

  const X = rows.map((r) => featureVector(r, dummyBrands));
  const Y = rows.map((r) => [r.lifeKm]);

  let weights: number[][];
  try {
    const mlr = new MLR(X, Y, { intercept: true, statistics: false });
    weights = mlr.weights;
  } catch {
    return degenerateModel();
  }

  const coefficients = readCoefficients(weights, brands, dummyBrands);
  if (!coefficients) return degenerateModel();

  const model: TireModel = {
    coefficients,
    referenceBrand,
    brands,
    rmse: NaN,
    r2: 0,
    n: rows.length,
    degenerate: false,
  };
  const diag = diagnostics(rows, model);
  model.rmse = diag.rmse;
  model.r2 = diag.r2;
  model.degenerate = !Number.isFinite(diag.rmse);
  return model;
}

/** Pengali kondisi 0..1 untuk fallback heuristik (transparan). */
export function conditionMultiplier(
  f: Pick<TireFeatures, "avgPressureDeviationPct" | "weightedRoadConditionExposure">,
): number {
  const roadPenalty = clamp01(f.weightedRoadConditionExposure) * 0.3; // s/d -30%
  const pressurePenalty = clamp01(Math.abs(f.avgPressureDeviationPct) / 100) * 0.2; // s/d -20%
  return clamp(1 - roadPenalty - pressurePenalty, CONDITION_FLOOR, 1);
}

/** Fallback heuristik: umur best-practice merek × pengali kondisi (§12.1). */
export function fallbackLife(tireLifeBestKm: number, conditionMult: number): number {
  return tireLifeBestKm * conditionMult;
}

export interface RemainingLifePrediction {
  predictedLifeKm: number;
  remainingLifeKm: number;
  /** ± margin (km) interval keyakinan 95% (FR-0002-4 #1). */
  marginKm: number;
  remainingLifeLowKm: number;
  remainingLifeHighKm: number;
  /** 0..1. */
  confidence: number;
  /** true → "estimasi awal" (heuristik). */
  usedFallback: boolean;
}

/**
 * Prediksi sisa umur ban + interval keyakinan (§12.1).
 * Fallback ke heuristik bila model degenerate / data < MIN_TRAINING_ROWS.
 */
export function predictRemainingLife(
  input: {
    features: TireFeatures;
    currentKm: number;
    tireLifeBestKm: number;
    /** Opsional; bila kosong dihitung dari fitur. */
    conditionMultiplier?: number;
  },
  model: TireModel,
): RemainingLifePrediction {
  const useFallback = model.degenerate || model.n < MIN_TRAINING_ROWS;

  let predictedLifeKm: number;
  let marginKm: number;
  let confidence: number;

  if (useFallback) {
    const cm = input.conditionMultiplier ?? conditionMultiplier(input.features);
    predictedLifeKm = fallbackLife(input.tireLifeBestKm, cm);
    marginKm = 0.25 * predictedLifeKm; // interval lebar untuk estimasi awal
    confidence = 0.3;
  } else {
    predictedLifeKm = tirePredictedLifeKm(model, input.features);
    marginKm = Z_95 * model.rmse;
    confidence = clamp01(model.r2);
  }

  predictedLifeKm = Math.max(0, predictedLifeKm);
  const remainingLifeKm = predictedLifeKm - input.currentKm;

  return {
    predictedLifeKm,
    remainingLifeKm,
    marginKm,
    remainingLifeLowKm: remainingLifeKm - marginKm,
    remainingLifeHighKm: remainingLifeKm + marginKm,
    confidence,
    usedFallback: useFallback,
  };
}
