// Entitas inti MuatCerdas — mirror PRD §11.
// Ini sumber kebenaran tipe domain; Prisma (storage) & client mengikuti bentuk ini.
// Catatan: enum direpresentasikan sebagai union literal di sini; di Prisma/SQLite
// menjadi kolom String yang ditegakkan oleh schemas.ts (Zod).

export type UnitCategory = "haul_truck" | "pit_dumper";
export type OperatorShift = "day" | "night";
export type RoadSurface = "laterite" | "rock" | "sealed";
export type TireRemovalReason = "worn" | "cut" | "overload" | "scheduled";
export type PayloadStatus = "under" | "ok" | "over";

/**
 * Unit armada.
 * - haul_truck: truk hauling jalan (Scania P410/R580, Volvo FH16 6x4T, Scania 620 XT) → Modul A (ban).
 * - pit_dumper: HD785 → Modul B (payload). JANGAN tertukar (SR-V3).
 */
export interface Unit {
  id: string;
  category: UnitCategory;
  model: string;
  tareKg: number;
  ratedPayloadKg: number;
  tiresCount: number;
  tireModel?: string;
  tirePriceIdr?: number;
  kmPerYear?: number;
}

export interface Operator {
  id: string;
  name: string;
  shift: OperatorShift;
}

export interface RoadSegment {
  id: string;
  name: string;
  surface: RoadSurface;
  lengthKm: number;
  /** 0..1 — makin tinggi makin baik. */
  conditionScore: number;
  avgSpeedLoadedKmh: number;
  avgSpeedEmptyKmh: number;
}

/** Registry ban truk hauling (Modul A). */
export interface TireRecord {
  id: string;
  unitId: string;
  position: string;
  /** ISO date (YYYY-MM-DD). */
  installDate: string;
  removalDate?: string;
  kmAtRemoval?: number;
  avgPressureDeviationPct?: number;
  loadIndex?: number;
  removalReason: TireRemovalReason;
  costIdr: number;
}

export interface SegmentExposure {
  segmentId: string;
  km: number;
}

/** Log perjalanan truk hauling (Modul A). */
export interface TripLog {
  id: string;
  unitId: string;
  operatorId: string;
  /** ISO date. */
  date: string;
  km: number;
  segmentExposure: SegmentExposure[];
  avgPressureDeviationPct?: number;
  payloadIdx?: number;
}

/** Event payload HD785 (Modul B). */
export interface PayloadEvent {
  id: string;
  /** HD785. */
  unitId: string;
  operatorId: string;
  /** ISO datetime. */
  timestamp: string;
  measuredPayloadKg: number;
  targetPayloadKg: number;
  status: PayloadStatus;
}

export interface CalibrationRecord {
  unitId: string;
  /** ISO date. */
  lastCalibrationDate: string;
  scaleStudyOffsetPct: number;
}

/**
 * Parameter biaya (ASUMSI, editable di UI). Sumber kebenaran rumus: PRD §12.7–§12.9.
 * Default ada di assumptions.ts.
 */
export interface CostParams {
  // — Modul A: ban truk hauling —
  tirePriceIdr: number;
  tiresPerUnit: number;
  kmPerYear: number;
  tireLifeActualKm: number;
  tireLifeBestKm: number;
  captureRate: number;
  fleetSize: number;
  // — Inti: biaya platform —
  capexIdr: number;
  opexAnnualIdr: number;
  // — Modul B: lever payload HD785 —
  fuelCostPerTripIdr: number;
  tripsPerYear: number;
  underloadPct: number;
  overloadWearCostFactorIdr: number;
}

/**
 * Parameter Modul C — Speed/TKPH (ASUMSI, editable di UI). Sumber kebenaran rumus:
 * docs/MODULE_C_SPEED.md §C.1–§C.6. Disimpan terpisah dari CostParams (tak menyentuh
 * sanity Modul A/B). Default di assumptions.ts (defaultSpeedParams).
 */
export interface SpeedParams {
  // — Koreksi TKPH ban (§C.2) —
  tempCorrectionFactor: number;
  siteCorrectionFactor: number;
  // — Beban ban kritis Qa (§C.1) —
  loadShareHeaviestPosition: number;
  // — Vm / TKPH site (§C.1) —
  distancePerShiftKm: number;
  workHoursPerShift: number;
  // — Rantai target produksi (§C.4) —
  effectiveWorkHoursPerDay: number;
  fixedTimeHours: number;
  oneWayKm: number;
  dailyTargetTon: number;
  // — Armada hauling (editable di layar Kecepatan) —
  haulUnitCount: number; // jumlah unit hauling (realita lapangan)
  haulPayloadCapacityTon: number; // kapasitas muatan per unit (2 trailer), ton
  // — Armada & rantai produksi HD785 in-pit (Revisi item 2) —
  hd785UnitCount: number; // jumlah unit HD785
  hd785PayloadCapacityTon: number; // batas muatan "pas" HD785 (overload bila > ini), ton
  hd785DailyTargetTon: number; // target produksi harian HD785 (ton/hari)
  hd785EffectiveWorkHoursPerDay: number; // jam kerja efektif HD785/hari
  hd785FixedTimeHours: number; // waktu diam per siklus in-pit (jam)
  hd785OneWayKm: number; // jarak satu arah in-pit (km)
}

/** Entri katalog TKPH per model ban (§C.2). Nilai WAJIB DICARI dari brosur pabrik. */
export interface TkphCatalogEntry {
  tireModel: string;
  catalogTkph: number;
}
