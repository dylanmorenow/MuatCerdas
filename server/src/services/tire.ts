// Modul A (Tire) — assembly fitur dari DB → engine §12.1/§12.2/§12.7 (shared).
// Fungsi MURNI (derivasi fitur, training rows, rekomendasi) dipisah dari orchestrator
// ber-Prisma agar bisa di-unit-test tanpa DB (pola seperti services/import.ts).

import {
  fitTireModel,
  predictRemainingLife,
  attributeWear,
  tireAvoidableCost,
  cyclesRemaining as cyclesRemainingFn,
  gradeCounts,
  worstGrade,
  type TireTrainingRow,
  type TireFeatures,
  type TireModel,
  type CostParams,
  type TireRiskGrade,
} from "@muatcerdas/shared";
import { prisma } from "../db";
import { getDriverEventSummaryByUnit } from "./driverEvents";

const MS_PER_DAY = 86_400_000;

// Jarak satu cycle (pulang-pergi) rute CPP KM33 → Jetty ~35 km × 2 = 70 km (ASUMSI).
const CYCLE_KM = 70;

// Ambang status sisa umur (km) — bertanda asumsi, mudah diubah.
export const TIRE_STATUS_WARN_KM = 25_000;
export const TIRE_STATUS_CRITICAL_KM = 10_000;

export type TireStatus = "ok" | "warn" | "critical";

export function tireStatus(remainingLifeKm: number): TireStatus {
  if (remainingLifeKm < TIRE_STATUS_CRITICAL_KM) return "critical";
  if (remainingLifeKm < TIRE_STATUS_WARN_KM) return "warn";
  return "ok";
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

// ——————————————————————————————————————————————————————————————
// Derivasi fitur (MURNI)
// ——————————————————————————————————————————————————————————————

/** Faktor operator 0..1 dari overload-rate PayloadEvent HD785, dinormalisasi lintas operator. */
export function deriveOperatorFactors(
  rows: { operatorId: string; over: number; total: number }[],
): Map<string, number> {
  const rate = new Map<string, number>();
  for (const r of rows) rate.set(r.operatorId, r.total > 0 ? r.over / r.total : 0);
  const vals = [...rate.values()];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min;
  const out = new Map<string, number>();
  for (const [id, v] of rate) out.set(id, span > 1e-9 ? (v - min) / span : 0.5);
  return out;
}

/** Faktor operator unit = rata-rata berbobot trip atas faktor operatornya. */
export function unitOperatorFactor(
  mix: { operatorId: string; trips: number }[],
  operatorFactors: Map<string, number>,
): number {
  let num = 0;
  let den = 0;
  for (const m of mix) {
    num += (operatorFactors.get(m.operatorId) ?? 0.5) * m.trips;
    den += m.trips;
  }
  return den > 0 ? num / den : 0.5;
}

/** Eksposur kondisi jalan terbobot per-km: Σ km·(1−conditionScore) / Σ km. */
export function unitRoadExposure(exposures: { km: number; conditionScore: number }[]): number {
  let badKm = 0;
  let totalKm = 0;
  for (const e of exposures) {
    badKm += e.km * (1 - e.conditionScore);
    totalKm += e.km;
  }
  return totalKm > 0 ? badKm / totalKm : 0;
}

/**
 * Heuristik km akumulasi ban TERPASANG saat ini (tak ada odometer live, bertanda asumsi):
 * usia set ban (hari sejak pelepasan terakhir) × laju km/tahun.
 */
export function currentTireKm(
  latestRemoval: Date | null,
  today: Date,
  kmPerYear: number,
): number {
  const days = latestRemoval
    ? (today.getTime() - latestRemoval.getTime()) / MS_PER_DAY
    : 180;
  return Math.round((clamp(days, 30, 330) / 365) * kmPerYear);
}

/** Baris latih per ban-dilepas: fitur per-ban + jalan/operator per-unit + umur teramati. */
export function buildTrainingRows(
  records: {
    unitId: string;
    avgPressureDeviationPct: number | null;
    loadIndex: number | null;
    kmAtRemoval: number | null;
  }[],
  unitModel: Map<string, string>,
  unitRoad: Map<string, number>,
  unitOperator: Map<string, number>,
): TireTrainingRow[] {
  const rows: TireTrainingRow[] = [];
  for (const r of records) {
    if (r.kmAtRemoval == null) continue; // hanya ban dgn umur teramati
    const model = unitModel.get(r.unitId);
    if (!model) continue;
    rows.push({
      lifeKm: r.kmAtRemoval,
      avgPressureDeviationPct: r.avgPressureDeviationPct ?? 0,
      loadIndex: r.loadIndex ?? 1,
      weightedRoadConditionExposure: unitRoad.get(r.unitId) ?? 0,
      operatorFactor: unitOperator.get(r.unitId) ?? 0.5,
      model,
    });
  }
  return rows;
}

/** Baseline best-practice armada untuk atribusi (faktor terkendali; merek diisi per unit). */
export function fleetBaseline(featuresList: TireFeatures[]): Omit<TireFeatures, "model"> {
  const pressures = featuresList.map((f) => f.avgPressureDeviationPct);
  const roads = featuresList.map((f) => f.weightedRoadConditionExposure);
  const operators = featuresList.map((f) => f.operatorFactor);
  return {
    avgPressureDeviationPct: pressures.length ? Math.min(...pressures) : 0,
    loadIndex: 0.9, // muatan nominal (titik belok trueLife)
    weightedRoadConditionExposure: roads.length ? Math.min(...roads) : 0,
    operatorFactor: operators.length ? Math.min(...operators) : 0,
  };
}

// ——————————————————————————————————————————————————————————————
// Tipe keluaran (untuk routes)
// ——————————————————————————————————————————————————————————————

export interface TireUnitFeatures extends TireFeatures {
  currentKm: number;
}

export interface TireUnitSummary {
  id: string;
  model: string;
  predictedLifeKm: number;
  remainingLifeKm: number;
  remainingLifeLowKm: number;
  remainingLifeHighKm: number;
  confidence: number;
  usedFallback: boolean;
  status: TireStatus;
  cyclesRemaining: number;
  riskGrade: TireRiskGrade | null;
  extraWearKm: number;
}

export interface TireHistoryRow {
  id: string;
  position: string;
  installDate: string;
  removalDate: string | null;
  kmAtRemoval: number | null;
  avgPressureDeviationPct: number | null;
  loadIndex: number | null;
  removalReason: string;
  costIdr: number;
}

export interface FactorContribution {
  factor: string;
  contribution: number;
}

export interface TireUnitDetail extends TireUnitSummary {
  features: TireUnitFeatures;
  history: TireHistoryRow[];
  attribution: { baselineLifeKm: number; shortfallKm: number; contributions: FactorContribution[] };
  regressionModel: TireModelSummary;
}

export interface TireModelSummary {
  coefficients: TireModel["coefficients"];
  referenceBrand: string;
  brands: string[];
  r2: number;
  rmse: number;
  n: number;
  degenerate: boolean;
}

export interface TireRecommendation {
  unitId: string;
  model: string;
  action: string;
  reason: string;
  factor: string;
  estimatedSavingsIdr: number;
  priority: number; // makin tinggi makin mendesak
  grade: TireRiskGrade; // A/B/C — untuk pemisahan tabel rekomendasi (ADMIN-7)
}

// Grade tiap faktor masalah (ADMIN-7). Faktor jalan/zona bahaya bisa di-override per unit.
const FACTOR_GRADE: Record<string, TireRiskGrade> = {
  "Sisa umur": "A",
  Muatan: "A",
  "Kondisi jalan": "A",
  "Tekanan ban": "B",
  Operator: "B",
  "Driver ngebut": "A",
  "Driver rem mendadak": "B",
  "Lewat zona bahaya": "A",
};

function modelSummary(model: TireModel): TireModelSummary {
  return {
    coefficients: model.coefficients,
    referenceBrand: model.referenceBrand,
    brands: model.brands,
    r2: model.r2,
    rmse: model.rmse,
    n: model.n,
    degenerate: model.degenerate,
  };
}

// ——————————————————————————————————————————————————————————————
// Konteks (orchestrator ber-Prisma) — fetch sekali, derive semua
// ——————————————————————————————————————————————————————————————

interface UnitContext {
  id: string;
  model: string;
  kmPerYear: number;
  tireLifeBestKm: number;
  tirePriceIdr: number;
  features: TireUnitFeatures;
  history: TireHistoryRow[];
}

interface TireContext {
  model: TireModel;
  units: UnitContext[];
  baseline: Omit<TireFeatures, "model">;
  costParams: CostParams;
}

async function loadCostParams(): Promise<CostParams> {
  const row = await prisma.costParams.findUnique({ where: { id: 1 } });
  if (!row) throw new Error("CostParams belum di-seed (jalankan db:seed)");
  // Buang kolom id agar cocok dgn tipe CostParams.
  const { id: _id, ...params } = row;
  return params;
}

async function loadContext(today = new Date()): Promise<TireContext> {
  const [units, tireRecords, exposures, payloadGroups, tripOpGroups, tripAvgGroups, costParams] =
    await Promise.all([
      prisma.unit.findMany({ where: { category: "haul_truck" } }),
      prisma.tireRecord.findMany({ orderBy: { removalDate: "desc" } }),
      prisma.tripSegmentExposure.findMany({
        select: { km: true, segment: { select: { conditionScore: true } }, tripLog: { select: { unitId: true } } },
      }),
      prisma.payloadEvent.groupBy({ by: ["operatorId", "status"], _count: { _all: true } }),
      prisma.tripLog.groupBy({ by: ["unitId", "operatorId"], _count: { _all: true } }),
      prisma.tripLog.groupBy({
        by: ["unitId"],
        _avg: { avgPressureDeviationPct: true, payloadIdx: true },
      }),
      loadCostParams(),
    ]);

  const haulIds = new Set(units.map((u) => u.id));
  const unitModel = new Map(units.map((u) => [u.id, u.model]));

  // — operatorFactor per operator (overload HD785) —
  const opAgg = new Map<string, { over: number; total: number }>();
  for (const g of payloadGroups) {
    const cur = opAgg.get(g.operatorId) ?? { over: 0, total: 0 };
    const c = g._count._all;
    cur.total += c;
    if (g.status === "over") cur.over += c;
    opAgg.set(g.operatorId, cur);
  }
  const operatorFactors = deriveOperatorFactors(
    [...opAgg.entries()].map(([operatorId, v]) => ({ operatorId, ...v })),
  );

  // — operator mix per unit → operatorFactor unit —
  const mixByUnit = new Map<string, { operatorId: string; trips: number }[]>();
  for (const g of tripOpGroups) {
    const arr = mixByUnit.get(g.unitId) ?? [];
    arr.push({ operatorId: g.operatorId, trips: g._count._all });
    mixByUnit.set(g.unitId, arr);
  }
  const unitOperator = new Map<string, number>();
  for (const id of haulIds) {
    unitOperator.set(id, unitOperatorFactor(mixByUnit.get(id) ?? [], operatorFactors));
  }

  // — road exposure per unit —
  const expByUnit = new Map<string, { km: number; conditionScore: number }[]>();
  for (const e of exposures) {
    const unitId = e.tripLog.unitId;
    if (!haulIds.has(unitId)) continue;
    const arr = expByUnit.get(unitId) ?? [];
    arr.push({ km: e.km, conditionScore: e.segment.conditionScore });
    expByUnit.set(unitId, arr);
  }
  const unitRoad = new Map<string, number>();
  for (const id of haulIds) unitRoad.set(id, unitRoadExposure(expByUnit.get(id) ?? []));

  // — trip averages per unit (fitur prediksi "saat ini") —
  const tripAvg = new Map<string, { pressure: number; load: number }>();
  for (const g of tripAvgGroups) {
    tripAvg.set(g.unitId, {
      pressure: g._avg.avgPressureDeviationPct ?? 0,
      load: g._avg.payloadIdx ?? 1,
    });
  }

  // — riwayat ban + km terakhir lepas per unit —
  const historyByUnit = new Map<string, TireHistoryRow[]>();
  const latestRemovalByUnit = new Map<string, Date | null>();
  for (const r of tireRecords) {
    if (!haulIds.has(r.unitId)) continue;
    const arr = historyByUnit.get(r.unitId) ?? [];
    arr.push({
      id: r.id,
      position: r.position,
      installDate: r.installDate.toISOString().slice(0, 10),
      removalDate: r.removalDate ? r.removalDate.toISOString().slice(0, 10) : null,
      kmAtRemoval: r.kmAtRemoval,
      avgPressureDeviationPct: r.avgPressureDeviationPct,
      loadIndex: r.loadIndex,
      removalReason: r.removalReason,
      costIdr: r.costIdr,
    });
    historyByUnit.set(r.unitId, arr);
    if (r.removalDate) {
      const cur = latestRemovalByUnit.get(r.unitId);
      if (!cur || r.removalDate > cur) latestRemovalByUnit.set(r.unitId, r.removalDate);
    }
  }

  // — fit model (training dari semua ban-dilepas) —
  const trainingRows = buildTrainingRows(tireRecords, unitModel, unitRoad, unitOperator);
  const model = fitTireModel(trainingRows);

  // — fitur per unit (untuk prediksi) —
  const unitFeatures: TireFeatures[] = [];
  const unitCtxPre: { u: (typeof units)[number]; features: TireUnitFeatures }[] = [];
  for (const u of units) {
    const avg = tripAvg.get(u.id);
    const features: TireUnitFeatures = {
      model: u.model,
      avgPressureDeviationPct: avg?.pressure ?? 0,
      loadIndex: avg?.load ?? 1,
      weightedRoadConditionExposure: unitRoad.get(u.id) ?? 0,
      operatorFactor: unitOperator.get(u.id) ?? 0.5,
      currentKm: currentTireKm(latestRemovalByUnit.get(u.id) ?? null, today, u.kmPerYear ?? 100_000),
    };
    unitFeatures.push(features);
    unitCtxPre.push({ u, features });
  }
  const baseline = fleetBaseline(unitFeatures);

  const unitCtx: UnitContext[] = unitCtxPre.map(({ u, features }) => ({
    id: u.id,
    model: u.model,
    kmPerYear: u.kmPerYear ?? 100_000,
    tireLifeBestKm: costParams.tireLifeBestKm,
    tirePriceIdr: u.tirePriceIdr ?? costParams.tirePriceIdr,
    features,
    history: historyByUnit.get(u.id) ?? [],
  }));

  return { model, units: unitCtx, baseline, costParams };
}

function predictFor(ctx: UnitContext, model: TireModel) {
  return predictRemainingLife(
    { features: ctx.features, currentKm: ctx.features.currentKm, tireLifeBestKm: ctx.tireLifeBestKm },
    model,
  );
}

function summaryFor(ctx: UnitContext, model: TireModel): TireUnitSummary {
  const p = predictFor(ctx, model);
  const remainingLifeKm = Math.round(p.remainingLifeKm);
  return {
    id: ctx.id,
    model: ctx.model,
    predictedLifeKm: Math.round(p.predictedLifeKm),
    remainingLifeKm,
    remainingLifeLowKm: Math.round(p.remainingLifeLowKm),
    remainingLifeHighKm: Math.round(p.remainingLifeHighKm),
    confidence: Number(p.confidence.toFixed(3)),
    usedFallback: p.usedFallback,
    status: tireStatus(p.remainingLifeKm),
    cyclesRemaining: cyclesRemainingFn(remainingLifeKm, CYCLE_KM),
    riskGrade: null, // diisi di getTireUnits dari data kejadian driver
    extraWearKm: 0,
  };
}

// ——————————————————————————————————————————————————————————————
// API publik (dipanggil routes)
// ——————————————————————————————————————————————————————————————

/** Daftar unit truk hauling + ringkasan prediksi (diurut sisa umur menaik). */
export async function getTireUnits(): Promise<TireUnitSummary[]> {
  const [ctx, eventSummary] = await Promise.all([loadContext(), getDriverEventSummaryByUnit()]);
  return ctx.units
    .map((u) => {
      const s = summaryFor(u, ctx.model);
      const ev = eventSummary[u.id];
      // Risiko ban di luar jarak tempuh: dari kejadian driver (ngebut/rem mendadak/lewat bahaya).
      s.riskGrade = ev?.worstGrade ?? null;
      s.extraWearKm = ev?.extraWearKm ?? 0;
      return s;
    })
    .sort((a, b) => a.remainingLifeKm - b.remainingLifeKm);
}

/** Ringkasan model (explainability, NFR-0002-6). */
export async function getTireModelSummary(): Promise<TireModelSummary> {
  const ctx = await loadContext();
  return modelSummary(ctx.model);
}

/** Detail satu unit: riwayat, prediksi+interval, atribusi, koefisien model. null bila bukan haul_truck. */
export async function getTireUnitDetail(unitId: string): Promise<TireUnitDetail | null> {
  const ctx = await loadContext();
  const u = ctx.units.find((x) => x.id === unitId);
  if (!u) return null; // bukan haul_truck / tak ada (SR-V3 ditegakkan di route)
  const summary = summaryFor(u, ctx.model);
  const attr = attributeWear(
    { features: u.features, baselineFeatures: { ...ctx.baseline, model: u.model } },
    ctx.model,
  );
  return {
    ...summary,
    features: u.features,
    history: u.history,
    attribution: {
      baselineLifeKm: Math.round(attr.baselineLifeKm),
      shortfallKm: Math.round(attr.shortfallKm),
      contributions: attr.contributions.map((c) => ({
        factor: c.factor,
        contribution: Math.round(c.contribution),
      })),
    },
    regressionModel: modelSummary(ctx.model),
  };
}

const FACTOR_ACTION: Record<string, { action: string; reason: string }> = {
  "Tekanan ban": {
    action: "Setel ulang tekanan ban sesuai standar",
    reason: "Tekanan yang melenceng jauh mempercepat keausan ban",
  },
  "Kondisi jalan": {
    action: "Perbaiki ruas laterit yang rusak dan rotasi ban",
    reason: "Jalan yang buruk jadi penyebab utama keausan",
  },
  Muatan: {
    action: "Periksa dan batasi muatan berlebih",
    reason: "Muatan yang terlalu berat memperpendek umur ban",
  },
  Operator: {
    action: "Beri arahan soal gaya berkendara ke operator",
    reason: "Gaya berkendara yang agresif mempercepat keausan",
  },
};

/** Rekomendasi tindakan ban + estimasi penghematan (FR-0002-6). */
export async function getTireRecommendations(): Promise<TireRecommendation[]> {
  const [ctx, eventSummary] = await Promise.all([loadContext(), getDriverEventSummaryByUnit()]);
  const recs: TireRecommendation[] = [];

  for (const u of ctx.units) {
    const summary = summaryFor(u, ctx.model);
    const attr = attributeWear(
      { features: u.features, baselineFeatures: { ...ctx.baseline, model: u.model } },
      ctx.model,
    );
    const shortfall = attr.shortfallKm;

    // Penghematan tertangkap per unit bila umur naik dari prediksi → best-practice.
    const perUnit = tireAvoidableCost({
      ...ctx.costParams,
      tireLifeActualKm: Math.max(1, summary.predictedLifeKm),
      tireLifeBestKm: u.tireLifeBestKm,
      tirePriceIdr: u.tirePriceIdr,
      kmPerYear: u.kmPerYear,
      fleetSize: 1,
    });
    const capturedPerUnit = Math.max(0, perUnit.capturedPerUnit);

    // Rekomendasi penggantian bila sisa umur kritis.
    if (summary.status === "critical") {
      recs.push({
        unitId: u.id,
        model: u.model,
        action: "Jadwalkan penggantian ban",
        reason: `Sisa umur kritis (${summary.remainingLifeKm.toLocaleString("id-ID")} km)`,
        factor: "Sisa umur",
        estimatedSavingsIdr: 0,
        priority: 100 + Math.max(0, TIRE_STATUS_CRITICAL_KM - summary.remainingLifeKm) / 1000,
        grade: "A",
      });
    }

    // Rekomendasi per faktor penyebab (kontribusi positif & berarti).
    if (shortfall > 1_000) {
      for (const c of attr.contributions) {
        const tmpl = FACTOR_ACTION[c.factor];
        if (!tmpl || c.contribution <= shortfall * 0.15) continue; // hanya faktor signifikan
        const share = clamp(c.contribution / shortfall, 0, 1);
        recs.push({
          unitId: u.id,
          model: u.model,
          action: tmpl.action,
          reason: tmpl.reason,
          factor: c.factor,
          estimatedSavingsIdr: Math.round(capturedPerUnit * share),
          priority: Math.round(c.contribution / 100),
          grade: FACTOR_GRADE[c.factor] ?? "B",
        });
      }
    }

    // F3 — rekomendasi dari data driver (overspeed & zona bahaya dilewati). "Loss bila diabaikan"
    // = fraksi capturedPerUnit menurut intensitas kejadian (keausan ban dari ngebut/jalan rusak).
    const ev = eventSummary[u.id];
    if (ev && ev.overspeedCount > 0) {
      recs.push({
        unitId: u.id,
        model: u.model,
        action: "Beri arahan ke driver supaya tidak ngebut, jaga di bawah batas aman",
        reason: `Terdeteksi ngebut ${ev.overspeedCount} kali. Ban jadi panas dan umurnya turun.`,
        factor: "Driver ngebut",
        estimatedSavingsIdr: Math.round(capturedPerUnit * Math.min(0.5, ev.overspeedCount * 0.05)),
        priority: 60 + ev.overspeedCount,
        grade: "A",
      });
    }
    // ADMIN-6 — rekomendasi dari rem mendadak (kecepatan turun drastis tiba-tiba).
    if (ev && ev.hardBrakingCount > 0) {
      recs.push({
        unitId: u.id,
        model: u.model,
        action: "Beri arahan agar tidak rem mendadak; jaga jarak dan kecepatan",
        reason: `Rem mendadak ${ev.hardBrakingCount} kali. Beban kejut mempercepat keausan dan kerusakan ban.`,
        factor: "Driver rem mendadak",
        estimatedSavingsIdr: Math.round(capturedPerUnit * Math.min(0.4, ev.hardBrakingCount * 0.04)),
        priority: 50 + ev.hardBrakingCount,
        grade: "B",
      });
    }
    if (ev && ev.hazardCount > 0) {
      const types = ev.hazardTypes.slice(0, 3).join(", ");
      recs.push({
        unitId: u.id,
        model: u.model,
        action: "Hindari atau perbaiki ruas jalan berbahaya yang sering dilewati",
        reason: `Melewati zona bahaya ${ev.hazardCount} kali${types ? ` (${types})` : ""}. Mempercepat keausan dan risiko ban sobek.`,
        factor: "Lewat zona bahaya",
        estimatedSavingsIdr: Math.round(capturedPerUnit * Math.min(0.5, ev.hazardCount * 0.04)),
        priority: 55 + ev.hazardCount,
        grade: worstGrade(gradeCounts(ev.hazardTypes)) ?? "A",
      });
    }
  }

  return recs.sort((a, b) => b.priority - a.priority || b.estimatedSavingsIdr - a.estimatedSavingsIdr);
}
