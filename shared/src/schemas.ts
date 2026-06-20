import { z } from "zod";

// Skema Zod paralel dengan types.ts (PRD §11). Dipakai untuk validasi import & body API (M3+).
// JAGA tetap sinkron dengan types.ts.

export const unitCategorySchema = z.enum(["haul_truck", "pit_dumper"]);
export const operatorShiftSchema = z.enum(["day", "night"]);
export const roadSurfaceSchema = z.enum(["laterite", "rock", "sealed"]);
export const tireRemovalReasonSchema = z.enum(["worn", "cut", "overload", "scheduled"]);
export const payloadStatusSchema = z.enum(["under", "ok", "over"]);

/** ISO date/datetime string (validasi longgar di M1; diperketat saat import M3). */
const isoString = z.string().min(1);

export const unitSchema = z.object({
  id: z.string().min(1),
  category: unitCategorySchema,
  model: z.string().min(1),
  tareKg: z.number().nonnegative(),
  ratedPayloadKg: z.number().nonnegative(),
  tiresCount: z.number().int().positive(),
  tireModel: z.string().min(1).optional(),
  tirePriceIdr: z.number().nonnegative().optional(),
  kmPerYear: z.number().nonnegative().optional(),
});

export const operatorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  shift: operatorShiftSchema,
});

export const roadSegmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  surface: roadSurfaceSchema,
  lengthKm: z.number().positive(),
  conditionScore: z.number().min(0).max(1),
  avgSpeedLoadedKmh: z.number().nonnegative(),
  avgSpeedEmptyKmh: z.number().nonnegative(),
});

export const tireRecordSchema = z.object({
  id: z.string().min(1),
  unitId: z.string().min(1),
  position: z.string().min(1),
  installDate: isoString,
  removalDate: isoString.optional(),
  kmAtRemoval: z.number().nonnegative().optional(),
  avgPressureDeviationPct: z.number().optional(),
  loadIndex: z.number().optional(),
  removalReason: tireRemovalReasonSchema,
  costIdr: z.number().nonnegative(),
});

export const segmentExposureSchema = z.object({
  segmentId: z.string().min(1),
  km: z.number().nonnegative(),
});

export const tripLogSchema = z.object({
  id: z.string().min(1),
  unitId: z.string().min(1),
  operatorId: z.string().min(1),
  date: isoString,
  km: z.number().nonnegative(),
  segmentExposure: z.array(segmentExposureSchema),
  avgPressureDeviationPct: z.number().optional(),
  payloadIdx: z.number().optional(),
});

export const payloadEventSchema = z.object({
  id: z.string().min(1),
  unitId: z.string().min(1),
  operatorId: z.string().min(1),
  timestamp: isoString,
  measuredPayloadKg: z.number().nonnegative(),
  targetPayloadKg: z.number().positive(),
  status: payloadStatusSchema,
});

export const calibrationRecordSchema = z.object({
  unitId: z.string().min(1),
  lastCalibrationDate: isoString,
  scaleStudyOffsetPct: z.number(),
});

export const costParamsSchema = z.object({
  tirePriceIdr: z.number().positive(),
  tiresPerUnit: z.number().positive(),
  kmPerYear: z.number().positive(),
  tireLifeActualKm: z.number().positive(),
  tireLifeBestKm: z.number().positive(),
  captureRate: z.number().min(0).max(1),
  fleetSize: z.number().int().positive(),
  capexIdr: z.number().nonnegative(),
  opexAnnualIdr: z.number().nonnegative(),
  fuelCostPerTripIdr: z.number().nonnegative(),
  tripsPerYear: z.number().nonnegative(),
  underloadPct: z.number().min(0).max(1),
  overloadWearCostFactorIdr: z.number().nonnegative(),
});

// — Modul C (Speed/TKPH) — docs/MODULE_C_SPEED.md §C.1–§C.6 —
export const speedParamsSchema = z.object({
  tempCorrectionFactor: z.number().positive(),
  siteCorrectionFactor: z.number().positive(),
  loadShareHeaviestPosition: z.number().min(0).max(1),
  distancePerShiftKm: z.number().positive(),
  workHoursPerShift: z.number().positive(),
  effectiveWorkHoursPerDay: z.number().positive(),
  fixedTimeHours: z.number().nonnegative(),
  oneWayKm: z.number().positive(),
  dailyTargetTon: z.number().positive(),
  haulUnitCount: z.number().int().positive(),
  haulPayloadCapacityTon: z.number().positive(),
});

export const opsParamsSchema = z.object({
  downtimeDaysPerCriticalUnit: z.number().nonnegative(),
  productionValuePerUnitPerDayIdr: z.number().nonnegative(),
  dailyCoalTargetT: z.number().positive(),
  hd785UnitCount: z.number().int().positive(),
});

export const tkphCatalogEntrySchema = z.object({
  tireModel: z.string().min(1),
  catalogTkph: z.number().positive(),
});
