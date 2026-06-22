import type { CostParams, SpeedParams } from "./types";

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

/**
 * Default SpeedParams Modul C (§C.1–§C.6) = ASUMSI, editable di UI.
 * TERPISAH dari CostParams → tidak menyentuh sanity Modul A/B yang terkunci.
 * Semua nilai placeholder bertanda ASUMSI; ganti dgn data riil (lihat docs/ASSUMPTIONS.md §E/§F).
 */
export const defaultSpeedParams: SpeedParams = {
  // — Koreksi TKPH ban (§C.2) —
  tempCorrectionFactor: 0.85, // ASUMSI: situs tropis Kalimantan (panas) menurunkan kapasitas
  siteCorrectionFactor: 1.0, // ASUMSI: netral sampai panduan pabrik tersedia
  // — Beban ban kritis Qa (§C.1) —
  loadShareHeaviestPosition: 0.1, // ASUMSI: fraksi GVW pada satu ban terberat
  // — Vm / TKPH site (§C.1) —
  distancePerShiftKm: 280, // ASUMSI
  workHoursPerShift: 12, // ASUMSI (1 shift)
  // — Rantai target produksi (§C.4) —
  effectiveWorkHoursPerDay: 20, // ASUMSI (2 shift efektif)
  fixedTimeHours: 0.5, // ASUMSI: loading+dumping+manuver+antri per siklus
  oneWayKm: 35, // rute CPP KM33 → Jetty (verifikasi, docs/ASSUMPTIONS.md §D)
  dailyTargetTon: 100_000, // target produksi harian (realita lapangan), editable
  haulUnitCount: 90, // jumlah unit hauling, editable
  haulPayloadCapacityTon: 120, // kapasitas 2 trailer per unit (ton), editable
};

/**
 * Katalog TKPH per model ban (§C.2). **WAJIB DICARI** dari brosur TKPH/TMPH pabrik
 * (Bridgestone/Michelin) sesuai ukuran — semua nilai di sini PLACEHOLDER (docs/ASSUMPTIONS.md §F).
 * Kunci = `tireModel` pada Unit. Ban truk hauling (Modul A) + 1 ban HD785 (panel Modul C ringkas).
 */
export const defaultTkphCatalog: Record<string, number> = {
  // — ban truk hauling (haul_truck), road-train 120 t — WAJIB DICARI dari brosur —
  // Nilai realistis utk ban tugas berat; batas aman ≈ TKPH_ban/Qa ≈ 40 km/jam pada muatan penuh.
  "Michelin X Works Z": 380,
  "Bridgestone M840": 360,
  "Michelin X Multi D": 350,
  "Bridgestone L355": 370,
  "Bridgestone L317": 370, // Scania 620 XT (325/95R24) — opsi ban
  "Pirelli TQ01": 300, // Scania P410 (13.00R24) — opsi ban
  // — ban HD785 (pit_dumper) off-highway — WAJIB DICARI —
  "Bridgestone VRPS 27.00R49": 700,
};

/** Fallback TKPH katalog bila model ban tak ada di katalog (ASUMSI konservatif). */
export const DEFAULT_TKPH_FALLBACK = 110;
