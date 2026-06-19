// Revisi F3 + akhir — kejadian per unit dari surface driver (SIMULASI): overspeed, melewati
// zona bahaya, rem mendadak. Dikonsumsi rekomendasi Modul A + grading risiko ban.

import { gradeCounts, estimateExtraWearKm, worstGrade, type GradeCounts, type TireRiskGrade } from "@muatcerdas/shared";
import { prisma } from "../db";

const EVENT_TYPES = ["overspeed", "hazard", "hard_braking"] as const;
type EventType = (typeof EVENT_TYPES)[number];

export interface DriverEventRow {
  id: string;
  unitId: string;
  type: string;
  detail: string;
  atKm: number | null;
  hazardType: string | null;
  timestamp: string;
  source: string;
}

export interface AddDriverEvent {
  unitId: string;
  type: string;
  detail?: string;
  atKm?: number | null;
  hazardType?: string | null;
  timestamp?: string;
  source?: string;
}

export async function addDriverEvent(input: AddDriverEvent): Promise<DriverEventRow> {
  const unit = await prisma.unit.findUnique({ where: { id: input.unitId } });
  if (!unit) throw new Error(`Unit '${input.unitId}' tidak ditemukan`);
  if (!EVENT_TYPES.includes(input.type as EventType)) {
    throw new Error(`Tipe event '${input.type}' tak dikenal (overspeed | hazard)`);
  }
  const ts = input.timestamp ? new Date(input.timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) throw new Error("Timestamp tak valid");

  const rec = await prisma.driverEvent.create({
    data: {
      unitId: input.unitId,
      type: input.type,
      detail: (input.detail ?? "").slice(0, 240),
      atKm: input.atKm ?? null,
      hazardType: input.hazardType ?? null,
      timestamp: ts,
      source: input.source ?? "sim",
    },
  });
  return toRow(rec);
}

export interface UnitEventSummary {
  unitId: string;
  overspeedCount: number;
  hazardCount: number;
  hardBrakingCount: number;
  hazardTypes: string[];
  /** Semua penyebab risiko (per kejadian) untuk grading: overspeed, hard_braking, tiap tipe bahaya. */
  causes: string[];
  grades: GradeCounts;
  worstGrade: TireRiskGrade | null;
  extraWearKm: number;
  lastAtKm: number | null;
  lastDetail: string | null;
}

/** Ringkasan event per unit (untuk rekomendasi Modul A + grading risiko ban). */
export async function getDriverEventSummaryByUnit(): Promise<Record<string, UnitEventSummary>> {
  const recs = await prisma.driverEvent.findMany({ orderBy: { timestamp: "desc" }, take: 2000 });
  const out: Record<string, UnitEventSummary> = {};
  for (const r of recs) {
    const s =
      out[r.unitId] ??
      (out[r.unitId] = {
        unitId: r.unitId,
        overspeedCount: 0,
        hazardCount: 0,
        hardBrakingCount: 0,
        hazardTypes: [],
        causes: [],
        grades: { A: 0, B: 0, C: 0 },
        worstGrade: null,
        extraWearKm: 0,
        lastAtKm: null,
        lastDetail: null,
      });
    if (r.type === "overspeed") {
      s.overspeedCount++;
      s.causes.push("overspeed");
    }
    if (r.type === "hard_braking") {
      s.hardBrakingCount++;
      s.causes.push("hard_braking");
    }
    if (r.type === "hazard") {
      s.hazardCount++;
      if (r.hazardType) {
        s.causes.push(r.hazardType);
        if (!s.hazardTypes.includes(r.hazardType)) s.hazardTypes.push(r.hazardType);
      }
    }
    if (s.lastDetail === null) {
      s.lastDetail = r.detail;
      s.lastAtKm = r.atKm;
    }
  }
  // Derivasi grading per unit (shared).
  for (const s of Object.values(out)) {
    s.grades = gradeCounts(s.causes);
    s.worstGrade = worstGrade(s.grades);
    s.extraWearKm = estimateExtraWearKm(s.grades);
  }
  return out;
}

export async function getRecentDriverEvents(limit = 100): Promise<DriverEventRow[]> {
  const recs = await prisma.driverEvent.findMany({ orderBy: { timestamp: "desc" }, take: limit });
  return recs.map(toRow);
}

function toRow(r: {
  id: string;
  unitId: string;
  type: string;
  detail: string;
  atKm: number | null;
  hazardType: string | null;
  timestamp: Date;
  source: string;
}): DriverEventRow {
  return {
    id: r.id,
    unitId: r.unitId,
    type: r.type,
    detail: r.detail,
    atKm: r.atKm,
    hazardType: r.hazardType,
    timestamp: r.timestamp.toISOString(),
    source: r.source,
  };
}
