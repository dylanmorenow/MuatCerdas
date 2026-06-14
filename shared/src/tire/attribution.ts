// §12.2 — Atribusi penyebab keausan dini (Modul A). Sumber kebenaran: PRD §12.2.
//
//   contribution_i = β_i * (x_i_baseline - x_i_aktual)     // km shortfall per faktor
//   Σ contribution_i ≈ shortfall = baselineLife - predictedLife
//
// Konvensi tanda: kontribusi POSITIF = faktor itu menurunkan umur (memperburuk).
// Untuk model linear, jumlah kontribusi = shortfall secara eksak (intercept hilang);
// normalisasi hanya menyerap galat pembulatan float.

import type { TireFeatures, TireModel } from "./predict";
import { tirePredictedLifeKm } from "./predict";

export interface FactorContribution {
  factor: string;
  /** km shortfall yang diatribusikan ke faktor ini (positif = memperburuk). */
  contribution: number;
}

export interface WearAttribution {
  baselineLifeKm: number;
  predictedLifeKm: number;
  /** baseline - predicted (positif = lebih buruk dari baseline). */
  shortfallKm: number;
  /** Kontribusi tiap faktor; menjumlah ke shortfallKm. */
  contributions: FactorContribution[];
}

/** Atribusi shortfall umur ban ke faktor penyebab (§12.2). */
export function attributeWear(
  input: { features: TireFeatures; baselineFeatures: TireFeatures },
  model: TireModel,
): WearAttribution {
  const c = model.coefficients;
  const a = input.features;
  const b = input.baselineFeatures;

  const baselineLifeKm = tirePredictedLifeKm(model, b);
  const predictedLifeKm = tirePredictedLifeKm(model, a);
  const shortfallKm = baselineLifeKm - predictedLifeKm;

  const raw: FactorContribution[] = [
    { factor: "Tekanan ban", contribution: c.pressure * (b.avgPressureDeviationPct - a.avgPressureDeviationPct) },
    { factor: "Muatan", contribution: c.loadIndex * (b.loadIndex - a.loadIndex) },
    { factor: "Kondisi jalan", contribution: c.road * (b.weightedRoadConditionExposure - a.weightedRoadConditionExposure) },
    { factor: "Operator", contribution: c.operator * (b.operatorFactor - a.operatorFactor) },
    { factor: "Merek", contribution: (c.brand[b.model] ?? 0) - (c.brand[a.model] ?? 0) },
  ];

  // Normalisasi agar Σ = shortfall persis (menyerap galat float; skala ≈ 1).
  const sumRaw = raw.reduce((s, r) => s + r.contribution, 0);
  const contributions =
    Number.isFinite(shortfallKm) && Math.abs(sumRaw) > 1e-9
      ? raw.map((r) => ({ factor: r.factor, contribution: r.contribution * (shortfallKm / sumRaw) }))
      : raw;

  return { baselineLifeKm, predictedLifeKm, shortfallKm, contributions };
}
