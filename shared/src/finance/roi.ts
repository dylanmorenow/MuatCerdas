// §12.8–§12.9 — Mesin finansial gabungan & ROI.
// Sumber kebenaran rumus: PRD §12.8–§12.9. Fungsi murni.

import type { CostParams } from "../types";
import { tireAvoidableCost } from "../tire/finance";

export interface RoiResult {
  /** Bulan untuk balik modal = capex / (annualSavings / 12). */
  paybackMonths: number;
  /** ROI tahun-1 = (annualSavings - opex - capex) / capex. */
  roiYear1: number;
}

/** §12.9 — ROI & payback dari penghematan tahunan. */
export function roi(annualSavings: number, p: CostParams): RoiResult {
  const paybackMonths =
    annualSavings > 0 ? p.capexIdr / (annualSavings / 12) : Infinity;
  const roiYear1 =
    p.capexIdr > 0
      ? (annualSavings - p.opexAnnualIdr - p.capexIdr) / p.capexIdr
      : Infinity;
  return { paybackMonths, roiYear1 };
}

export interface FinancialSummary {
  /** §12.7 — biaya ban terhindarkan tertangkap seluruh armada. */
  fleetCaptured: number;
  /** §12.8 — biaya ekstra akibat underload (lever payload). */
  underloadExtraCost: number;
  /** §12.4/§12.8 — biaya keausan akibat overload (lever payload). */
  overloadCost: number;
  /** §12.9 — total penghematan tahunan. */
  annualSavings: number;
  paybackMonths: number;
  roiYear1: number;
}

/**
 * Komposisi savings + ROI (§12.8–§12.9).
 *
 * Catatan jujur: lever payload (`underloadExtraCost`, `overloadCost`) dimodelkan sebagai
 * bagian yang dapat dihemat (`_saved`). Param payload default = placeholder 0
 * (PRD §16 #2), sehingga `annualSavings = fleetCaptured` dan TIDAK membesar-besarkan ROI.
 *
 * `overloadCost` di-inject dari `overloadWearCost().total` (§12.4) oleh pemanggil
 * (server M5/M6) karena bergantung pada `PayloadEvent`; default 0.
 *
 * Sanity default (lever payload = 0): paybackMonths ≈ 3,7143 · roiYear1 ≈ 2,0308.
 */
export function financialSummary(
  p: CostParams,
  opts: { overloadCost?: number } = {},
): FinancialSummary {
  const { fleetCaptured } = tireAvoidableCost(p);
  const underloadExtraCost = p.tripsPerYear * p.underloadPct * p.fuelCostPerTripIdr;
  const overloadCost = opts.overloadCost ?? 0;
  const annualSavings = fleetCaptured + underloadExtraCost + overloadCost;
  const { paybackMonths, roiYear1 } = roi(annualSavings, p);
  return {
    fleetCaptured,
    underloadExtraCost,
    overloadCost,
    annualSavings,
    paybackMonths,
    roiYear1,
  };
}
