// §12.7 — Biaya ban terhindarkan (Modul A, finansial).
// Sumber kebenaran rumus: PRD §12.7. Fungsi murni; tidak menyentuh DB/UI.
//
// tireLifeActualKm boleh memakai keluaran agregat model §12.1 (predict.ts), bukan
// hanya input manual (lihat catatan PRD §12.7). Di sini ia diterima via CostParams.

import type { CostParams } from "../types";

export interface TireAvoidableCost {
  /** Ban terpakai/tahun pada umur aktual: tiresPerUnit * kmPerYear / tireLifeActualKm. */
  tiresActualPerYear: number;
  /** Ban terpakai/tahun pada umur best-practice. */
  tiresBestPerYear: number;
  /** Selisih = ban yang sebenarnya bisa dihindari per unit/tahun. */
  avoidableTires: number;
  /** Nilai Rupiah ban terhindarkan per unit/tahun. */
  avoidableCostPerUnit: number;
  /** Bagian yang realistis tertangkap per unit (× captureRate). */
  capturedPerUnit: number;
  /** Total tertangkap untuk seluruh armada (× fleetSize). */
  fleetCaptured: number;
}

/**
 * Hitung biaya ban terhindarkan (§12.7).
 *
 * Sanity default (PRD §8 / foundation.test.ts):
 *   avoidableTires ≈ 5,3846 · avoidableCostPerUnit ≈ Rp107,69 jt ·
 *   capturedPerUnit ≈ Rp53,85 jt · fleetCaptured(30) ≈ Rp1,615 M.
 */
export function tireAvoidableCost(p: CostParams): TireAvoidableCost {
  const tiresActualPerYear = (p.tiresPerUnit * p.kmPerYear) / p.tireLifeActualKm;
  const tiresBestPerYear = (p.tiresPerUnit * p.kmPerYear) / p.tireLifeBestKm;
  const avoidableTires = tiresActualPerYear - tiresBestPerYear;
  const avoidableCostPerUnit = avoidableTires * p.tirePriceIdr;
  const capturedPerUnit = avoidableCostPerUnit * p.captureRate;
  const fleetCaptured = capturedPerUnit * p.fleetSize;

  return {
    tiresActualPerYear,
    tiresBestPerYear,
    avoidableTires,
    avoidableCostPerUnit,
    capturedPerUnit,
    fleetCaptured,
  };
}
