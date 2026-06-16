// Modul B (Payload) — assembly dari DB → engine §12.3/§12.4/§12.6 (shared).
// Helper MURNI (tren, histogram) dipisah dari orchestrator Prisma agar bisa diuji tanpa DB.

import {
  payloadStats,
  overloadWearCost,
  classifyPayload,
  needsCalibration,
  calibrationAgeDays,
  type PayloadEvent,
  type PayloadStats,
  type OverloadWearResult,
  type CostParams,
} from "@muatcerdas/shared";
import { prisma } from "../db";

const HD785_TARGET_KG = 91_000;

// ——————————————————————————————————————————————————————————————
// Helper MURNI
// ——————————————————————————————————————————————————————————————

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  count: number;
  mean: number;
  underPct: number;
  okPct: number;
  overPct: number;
}

/** Tren harian payload: rata-rata & komposisi status per tanggal. */
export function payloadTrend(events: PayloadEvent[]): TrendPoint[] {
  const byDate = new Map<string, PayloadEvent[]>();
  for (const e of events) {
    const d = e.timestamp.slice(0, 10);
    const arr = byDate.get(d);
    if (arr) arr.push(e);
    else byDate.set(d, [e]);
  }
  const points: TrendPoint[] = [];
  for (const [date, evs] of byDate) {
    const s = payloadStats(evs);
    points.push({
      date,
      count: s.count,
      mean: Math.round(s.mean),
      underPct: s.underPct,
      okPct: s.okPct,
      overPct: s.overPct,
    });
  }
  return points.sort((a, b) => a.date.localeCompare(b.date));
}

export interface HistogramBin {
  from: number;
  to: number;
  /** Label ton, mis. "85–90". */
  label: string;
  count: number;
}

/** Distribusi payload ke bin (default 5 t, 55..120 t). */
export function payloadHistogram(
  events: PayloadEvent[],
  binKg = 5_000,
  min = 55_000,
  max = 120_000,
): HistogramBin[] {
  const bins: HistogramBin[] = [];
  for (let from = min; from < max; from += binKg) {
    bins.push({ from, to: from + binKg, label: `${from / 1000}–${(from + binKg) / 1000}`, count: 0 });
  }
  for (const e of events) {
    let idx = Math.floor((e.measuredPayloadKg - min) / binKg);
    if (idx < 0) idx = 0;
    if (idx >= bins.length) idx = bins.length - 1;
    const b = bins[idx];
    if (b) b.count++;
  }
  return bins;
}

// ——————————————————————————————————————————————————————————————
// Orchestrator (Prisma)
// ——————————————————————————————————————————————————————————————

async function loadCostParams(): Promise<CostParams> {
  const row = await prisma.costParams.findUnique({ where: { id: 1 } });
  if (!row) throw new Error("CostParams belum di-seed (jalankan db:seed)");
  const { id: _id, ...params } = row;
  return params;
}

export interface PayloadAnalyticsFilter {
  unitId?: string;
  operatorId?: string;
}

export interface GroupStat {
  key: string;
  label: string;
  stats: PayloadStats;
}

export interface ShiftOperators {
  day: string | null;
  night: string | null;
}

/** Operator dominan per unit per shift (1=day, 2=night) — 1 unit dipegang 1 orang/shift (murni). */
export function deriveUnitShiftOperators(
  events: { unitId: string; operatorId: string }[],
  operators: { id: string; name: string; shift: string }[],
): Record<string, ShiftOperators> {
  const opById = new Map(operators.map((o) => [o.id, o]));
  const counts = new Map<string, Map<string, number>>();
  for (const e of events) {
    const m = counts.get(e.unitId) ?? new Map<string, number>();
    m.set(e.operatorId, (m.get(e.operatorId) ?? 0) + 1);
    counts.set(e.unitId, m);
  }
  const out: Record<string, ShiftOperators> = {};
  for (const [unitId, m] of counts) {
    let day: { name: string; c: number } | null = null;
    let night: { name: string; c: number } | null = null;
    for (const [opId, c] of m) {
      const o = opById.get(opId);
      if (!o) continue;
      if (o.shift === "day") {
        if (!day || c > day.c) day = { name: o.name, c };
      } else if (!night || c > night.c) night = { name: o.name, c };
    }
    out[unitId] = { day: day?.name ?? null, night: night?.name ?? null };
  }
  return out;
}

export interface PayloadAnalytics {
  targetKg: number;
  filter: PayloadAnalyticsFilter;
  overall: PayloadStats;
  byUnit: GroupStat[];
  byOperator: GroupStat[];
  trend: TrendPoint[];
  histogram: HistogramBin[];
  overloadWear: OverloadWearResult;
  units: { id: string }[];
  operators: { id: string; name: string }[];
  /** Operator pemegang per unit per shift (FR revisi Modul B). */
  shiftOperatorsByUnit: Record<string, ShiftOperators>;
}

/** SR-V3: payload analytics HANYA untuk HD785 (pit_dumper). */
export async function getPayloadAnalytics(filter: PayloadAnalyticsFilter = {}): Promise<PayloadAnalytics> {
  const [rawEvents, units, operators] = await Promise.all([
    prisma.payloadEvent.findMany({ where: { unit: { category: "pit_dumper" } } }),
    prisma.unit.findMany({ where: { category: "pit_dumper" }, select: { id: true } }),
    prisma.operator.findMany({ select: { id: true, name: true, shift: true } }),
  ]);
  const costParams = await loadCostParams();

  // Tegakkan SR-V3: tolak filter unit yang bukan HD785.
  if (filter.unitId && !units.some((u) => u.id === filter.unitId)) {
    throw new Error(`Unit '${filter.unitId}' bukan HD785 (pit_dumper) — analitik payload hanya HD785 (SR-V3)`);
  }

  const events: PayloadEvent[] = rawEvents.map((e) => ({
    id: e.id,
    unitId: e.unitId,
    operatorId: e.operatorId,
    timestamp: e.timestamp.toISOString(),
    measuredPayloadKg: e.measuredPayloadKg,
    targetPayloadKg: e.targetPayloadKg,
    status: classifyPayload(e.measuredPayloadKg, e.targetPayloadKg),
  }));

  const operatorName = new Map(operators.map((o) => [o.id, o.name]));

  // Breakdown (selalu penuh, untuk perbandingan).
  const byUnitStats = payloadStats(events, "unit").byGroup ?? {};
  const byOperatorStats = payloadStats(events, "operator").byGroup ?? {};
  const byUnit: GroupStat[] = Object.entries(byUnitStats)
    .map(([key, stats]) => ({ key, label: key, stats }))
    .sort((a, b) => b.stats.overPct - a.stats.overPct || a.key.localeCompare(b.key));
  const byOperator: GroupStat[] = Object.entries(byOperatorStats)
    .map(([key, stats]) => ({ key, label: operatorName.get(key) ?? key, stats }))
    .sort((a, b) => b.stats.overPct - a.stats.overPct || a.key.localeCompare(b.key));

  // Slice terfilter untuk headline + tren + histogram.
  const filtered = events.filter(
    (e) =>
      (!filter.unitId || e.unitId === filter.unitId) &&
      (!filter.operatorId || e.operatorId === filter.operatorId),
  );

  return {
    targetKg: events[0]?.targetPayloadKg ?? HD785_TARGET_KG,
    filter,
    overall: payloadStats(filtered),
    byUnit,
    byOperator,
    trend: payloadTrend(filtered),
    histogram: payloadHistogram(filtered),
    overloadWear: overloadWearCost(events, costParams), // per-unit, penuh
    units,
    operators: operators.map((o) => ({ id: o.id, name: o.name })),
    shiftOperatorsByUnit: deriveUnitShiftOperators(events, operators),
  };
}

export interface CalibrationHealthRow {
  unitId: string;
  lastCalibrationDate: string; // YYYY-MM-DD
  scaleStudyOffsetPct: number;
  ageDays: number;
  needsCalibration: boolean;
}

/** Kesehatan kalibrasi HD785 (§12.6). Ambil kalibrasi TERBARU per unit. */
export async function getCalibrationHealth(today = new Date()): Promise<CalibrationHealthRow[]> {
  const all = await prisma.calibrationRecord.findMany({
    where: { unit: { category: "pit_dumper" } },
    orderBy: { lastCalibrationDate: "desc" },
  });
  const seen = new Set<string>();
  const records = all.filter((r) => (seen.has(r.unitId) ? false : (seen.add(r.unitId), true)));
  return records
    .map((r) => {
      const rec = {
        unitId: r.unitId,
        lastCalibrationDate: r.lastCalibrationDate.toISOString(),
        scaleStudyOffsetPct: r.scaleStudyOffsetPct,
      };
      return {
        unitId: r.unitId,
        lastCalibrationDate: r.lastCalibrationDate.toISOString().slice(0, 10),
        scaleStudyOffsetPct: r.scaleStudyOffsetPct,
        ageDays: calibrationAgeDays(rec, today),
        needsCalibration: needsCalibration(rec, today),
      };
    })
    .sort((a, b) => Number(b.needsCalibration) - Number(a.needsCalibration) || b.ageDays - a.ageDays);
}

/** Catat kalibrasi baru (admin) — pilih unit HD785 + tanggal + offset. SR-V3: hanya pit_dumper. */
export async function addCalibration(input: {
  unitId: string;
  lastCalibrationDate: string;
  scaleStudyOffsetPct: number;
}): Promise<CalibrationHealthRow> {
  const unit = await prisma.unit.findUnique({ where: { id: input.unitId } });
  if (!unit || unit.category !== "pit_dumper") {
    throw new Error(`Unit '${input.unitId}' bukan HD785 (pit_dumper) — kalibrasi hanya HD785 (SR-V3)`);
  }
  const date = new Date(input.lastCalibrationDate);
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal kalibrasi tak valid");
  const offset = Number(input.scaleStudyOffsetPct);
  if (!Number.isFinite(offset)) throw new Error("Offset harus angka");
  await prisma.calibrationRecord.create({
    data: { unitId: input.unitId, lastCalibrationDate: date, scaleStudyOffsetPct: offset },
  });
  const today = new Date();
  const rec = { unitId: input.unitId, lastCalibrationDate: date.toISOString(), scaleStudyOffsetPct: offset };
  return {
    unitId: input.unitId,
    lastCalibrationDate: date.toISOString().slice(0, 10),
    scaleStudyOffsetPct: offset,
    ageDays: calibrationAgeDays(rec, today),
    needsCalibration: needsCalibration(rec, today),
  };
}
