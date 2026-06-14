// §12.3 — Analitik payload HD785 (Modul B). Sumber kebenaran: PRD §12.3 + SR-V1.
// Status DIHITUNG dari measured/target (sumber kebenaran), bukan membaca event.status.

import type { PayloadEvent, PayloadStatus } from "../types";

/** SR-V1: <95% target = under; 95–110% = ok; >110% = over. */
export const PAYLOAD_UNDER_THRESHOLD = 0.95;
export const PAYLOAD_OVER_THRESHOLD = 1.1;

/** Klasifikasi satu pengukuran payload terhadap target (SR-V1). */
export function classifyPayload(measuredKg: number, targetKg: number): PayloadStatus {
  if (targetKg <= 0) throw new Error("targetKg harus > 0 untuk klasifikasi payload");
  const ratio = measuredKg / targetKg;
  if (ratio < PAYLOAD_UNDER_THRESHOLD) return "under";
  if (ratio > PAYLOAD_OVER_THRESHOLD) return "over";
  return "ok";
}

export interface PayloadStats {
  count: number;
  underCount: number;
  okCount: number;
  overCount: number;
  /** Fraksi 0..1 (format via formatPersen). */
  underPct: number;
  okPct: number;
  overPct: number;
  /** Rata-rata payload terukur (kg). */
  mean: number;
  /** Simpangan baku populasi payload terukur (kg). */
  stdev: number;
  /** Rata-rata rasio measured/target (fraksi). */
  meanPctOfTarget: number;
}

export interface PayloadStatsWithGroups extends PayloadStats {
  /** Statistik per irisan (unitId / operatorId) bila groupBy diberikan. */
  byGroup?: Record<string, PayloadStats>;
}

function emptyStats(): PayloadStats {
  return {
    count: 0,
    underCount: 0,
    okCount: 0,
    overCount: 0,
    underPct: 0,
    okPct: 0,
    overPct: 0,
    mean: 0,
    stdev: 0,
    meanPctOfTarget: 0,
  };
}

function computeStats(events: PayloadEvent[]): PayloadStats {
  const count = events.length;
  if (count === 0) return emptyStats();

  let underCount = 0;
  let okCount = 0;
  let overCount = 0;
  let sumKg = 0;
  let sumRatio = 0;

  for (const e of events) {
    const status = classifyPayload(e.measuredPayloadKg, e.targetPayloadKg);
    if (status === "under") underCount++;
    else if (status === "over") overCount++;
    else okCount++;
    sumKg += e.measuredPayloadKg;
    sumRatio += e.measuredPayloadKg / e.targetPayloadKg;
  }

  const mean = sumKg / count;
  let sumSq = 0;
  for (const e of events) sumSq += (e.measuredPayloadKg - mean) ** 2;
  const stdev = Math.sqrt(sumSq / count);

  return {
    count,
    underCount,
    okCount,
    overCount,
    underPct: underCount / count,
    okPct: okCount / count,
    overPct: overCount / count,
    mean,
    stdev,
    meanPctOfTarget: sumRatio / count,
  };
}

/**
 * Statistik payload agregat (§12.3), opsional dipecah per unit/operator.
 * Mengembalikan fraksi (bukan persen jadi) agar konsisten dengan helper format.
 */
export function payloadStats(
  events: PayloadEvent[],
  groupBy?: "unit" | "operator",
): PayloadStatsWithGroups {
  const overall = computeStats(events);
  if (!groupBy) return overall;

  const buckets = new Map<string, PayloadEvent[]>();
  for (const e of events) {
    const key = groupBy === "unit" ? e.unitId : e.operatorId;
    const arr = buckets.get(key);
    if (arr) arr.push(e);
    else buckets.set(key, [e]);
  }

  const byGroup: Record<string, PayloadStats> = {};
  for (const [key, arr] of buckets) byGroup[key] = computeStats(arr);

  return { ...overall, byGroup };
}
