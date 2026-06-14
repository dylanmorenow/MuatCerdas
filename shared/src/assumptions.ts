import type { CostParams } from "./types";

/**
 * Default CostParams = ASUMSI (bukan data terverifikasi), editable di UI (M6).
 *
 * NILAI DIKUNCI oleh pemilik proyek — JANGAN diubah tanpa persetujuan eksplisit.
 *
 * - Modul A (ban): satu truk hauling 6×4 punya **10 ban** (angka "54" dari catatan
 *   BUKAN ban/unit). Nilai umur ban memakai best-practice PRD §12.
 * - Modul B (lever payload): PLACEHOLDER (0) selama data KPP belum ada (PRD §16 #2);
 *   sengaja netral agar ROI TIDAK dibesar-besarkan.
 * - Sanity turunan (§12.7/§12.9) dikunci unit test (foundation.test.ts):
 *     avoidableTires ≈ 5,38/unit · avoidableCostPerUnit ≈ Rp107,7 jt ·
 *     capturedPerUnit ≈ Rp53,8 jt · fleetCaptured(30) ≈ Rp1,62 M · paybackMonths ≈ 3,71 bln.
 */
export const defaultCostParams: CostParams = {
  // — Modul A: ban truk hauling (Scania/Volvo) —
  tirePriceIdr: 20_000_000, // ASUMSI (≈ harga ban truk hauling; konfirmasi bila beda)
  tiresPerUnit: 10, // truk hauling 6×4 = 10 ban
  kmPerYear: 100_000, // ASUMSI
  tireLifeActualKm: 65_000, // kondisi laterit/aktual
  tireLifeBestKm: 100_000, // best-practice
  captureRate: 0.5, // fraksi kerugian yang realistis tertangkap
  fleetSize: 30, // ASUMSI sementara, perlu konfirmasi (apakah jumlah truk hauling = 54?)

  // — Inti: biaya platform —
  capexIdr: 500_000_000, // ASUMSI
  opexAnnualIdr: 100_000_000, // ASUMSI

  // — Modul B: lever payload HD785 — PLACEHOLDER, belum ada data KPP (PRD §16 #2) —
  fuelCostPerTripIdr: 0, // PLACEHOLDER (belum ada data)
  tripsPerYear: 0, // PLACEHOLDER (belum ada data)
  underloadPct: 0.03, // ASUMSI (3%)
  overloadWearCostFactorIdr: 0, // PLACEHOLDER (belum ada data)
};
