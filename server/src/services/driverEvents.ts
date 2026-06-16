// Revisi F3 — kejadian per unit dari surface driver (SIMULASI): overspeed (vs Vmax_safe) &
// melewati zona bahaya. Dikonsumsi rekomendasi Modul A. Masuk via antrean offline operator.

import { prisma } from "../db";

const EVENT_TYPES = ["overspeed", "hazard"] as const;
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
  hazardTypes: string[];
  lastAtKm: number | null;
  lastDetail: string | null;
}

/** Ringkasan event per unit (untuk rekomendasi Modul A): #overspeed, #hazard, jenis bahaya dilewati. */
export async function getDriverEventSummaryByUnit(): Promise<Record<string, UnitEventSummary>> {
  const recs = await prisma.driverEvent.findMany({ orderBy: { timestamp: "desc" }, take: 2000 });
  const out: Record<string, UnitEventSummary> = {};
  for (const r of recs) {
    const s =
      out[r.unitId] ??
      (out[r.unitId] = { unitId: r.unitId, overspeedCount: 0, hazardCount: 0, hazardTypes: [], lastAtKm: null, lastDetail: null });
    if (r.type === "overspeed") s.overspeedCount++;
    if (r.type === "hazard") {
      s.hazardCount++;
      if (r.hazardType && !s.hazardTypes.includes(r.hazardType)) s.hazardTypes.push(r.hazardType);
    }
    if (s.lastDetail === null) {
      s.lastDetail = r.detail;
      s.lastAtKm = r.atKm;
    }
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
