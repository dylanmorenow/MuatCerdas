// Inti — Finansial & ROI (§12.7–§12.9) + Dashboard. Helper MURNI (uji tanpa DB) +
// orchestrator Prisma. Sumber rumus tunggal = shared (SR-V5).

import {
  financialSummary,
  tireAvoidableCost,
  costParamsSchema,
  defaultCostParams,
  type CostParams,
} from "@muatcerdas/shared";
import { prisma } from "../db";
import { getTireUnits } from "./tire";
import { getPayloadAnalytics, getCalibrationHealth } from "./payload";

// ——————————————————————————————————————————————————————————————
// Helper MURNI
// ——————————————————————————————————————————————————————————————

export interface FinanceKpis {
  avoidableTires: number;
  avoidableCostPerUnit: number;
  capturedPerUnit: number;
  /** Biaya ban terhindarkan/th (armada). */
  fleetCaptured: number;
  underloadExtraCost: number;
  overloadCost: number;
  /** Biaya payload terhindarkan/th = underload + overload. */
  payloadAvoidable: number;
  annualSavings: number;
  paybackMonths: number;
  roiYear1: number;
}

/**
 * KPI finansial dari CostParams (+ overloadRateSum dari data).
 * overloadCost = overloadWearCostFactorIdr × Σ overloadRate (§12.4/§12.8).
 * LOCK (default params, overloadRateSum 0): fleetCaptured≈Rp1,615 M · payback≈3,71 · roi≈2,03.
 */
export function computeFinanceKpis(params: CostParams, overloadRateSum: number): FinanceKpis {
  const overloadCost = params.overloadWearCostFactorIdr * overloadRateSum;
  const summary = financialSummary(params, { overloadCost });
  const tac = tireAvoidableCost(params);
  return {
    avoidableTires: tac.avoidableTires,
    avoidableCostPerUnit: tac.avoidableCostPerUnit,
    capturedPerUnit: tac.capturedPerUnit,
    fleetCaptured: summary.fleetCaptured,
    underloadExtraCost: summary.underloadExtraCost,
    overloadCost: summary.overloadCost,
    payloadAvoidable: summary.underloadExtraCost + summary.overloadCost,
    annualSavings: summary.annualSavings,
    paybackMonths: summary.paybackMonths,
    roiYear1: summary.roiYear1,
  };
}

export interface FleetScenario {
  fleetSize: number;
  fleetCaptured: number;
  annualSavings: number;
  paybackMonths: number;
  roiYear1: number;
}

/** Skenario armada: KPI pada beberapa ukuran armada (FR-0002-12 skenario). */
export function financeScenarios(
  params: CostParams,
  overloadRateSum: number,
  fleetSizes: number[],
): FleetScenario[] {
  return fleetSizes.map((fleetSize) => {
    const k = computeFinanceKpis({ ...params, fleetSize }, overloadRateSum);
    return {
      fleetSize,
      fleetCaptured: k.fleetCaptured,
      annualSavings: k.annualSavings,
      paybackMonths: k.paybackMonths,
      roiYear1: k.roiYear1,
    };
  });
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

/** Validasi (costParamsSchema) → upsert DB id=1 → kembalikan tersimpan. */
export async function saveCostParams(input: unknown): Promise<CostParams> {
  const parsed = costParamsSchema.parse(input); // ZodError → route 400
  const saved = await prisma.costParams.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed },
    update: parsed,
  });
  const { id: _id, ...rest } = saved;
  return rest;
}

/** Kembalikan CostParams ke asumsi default terkunci. */
export async function resetCostParams(): Promise<CostParams> {
  return saveCostParams(defaultCostParams);
}

async function overloadRateSumFrom(payload: Awaited<ReturnType<typeof getPayloadAnalytics>>): Promise<number> {
  return payload.overloadWear.byUnit.reduce((s, u) => s + u.overloadRate, 0);
}

export interface FinanceData {
  params: CostParams;
  derived: {
    /** Σ overloadRate HD785 → overloadCost = factor × ini. */
    overloadRateSum: number;
    /** Rata-rata predictedLifeKm model §12.1 (untuk toggle "umur aktual"). */
    modelTireLifeKm: number;
    haulUnitCount: number;
  };
}

export async function getFinanceData(): Promise<FinanceData> {
  const [params, tireUnits, payload] = await Promise.all([
    loadCostParams(),
    getTireUnits(),
    getPayloadAnalytics(),
  ]);
  const predicted = tireUnits.map((u) => u.predictedLifeKm).filter((n) => n > 0);
  const modelTireLifeKm = predicted.length
    ? Math.round(predicted.reduce((a, b) => a + b, 0) / predicted.length)
    : 0;
  return {
    params,
    derived: {
      overloadRateSum: await overloadRateSumFrom(payload),
      modelTireLifeKm,
      haulUnitCount: tireUnits.length,
    },
  };
}

export interface DashboardData {
  finance: FinanceKpis;
  capexIdr: number;
  opexAnnualIdr: number;
  tire: { totalUnits: number; ok: number; warn: number; critical: number; avgPredictedLifeKm: number };
  payload: { count: number; underPct: number; okPct: number; overPct: number; meanKg: number };
  calibration: { total: number; needs: number };
}

export async function getDashboard(): Promise<DashboardData> {
  const [params, tireUnits, payload, calib] = await Promise.all([
    loadCostParams(),
    getTireUnits(),
    getPayloadAnalytics(),
    getCalibrationHealth(),
  ]);
  const overloadRateSum = await overloadRateSumFrom(payload);
  const finance = computeFinanceKpis(params, overloadRateSum);

  const predicted = tireUnits.map((u) => u.predictedLifeKm).filter((n) => n > 0);
  const avgPredictedLifeKm = predicted.length
    ? Math.round(predicted.reduce((a, b) => a + b, 0) / predicted.length)
    : 0;

  return {
    finance,
    capexIdr: params.capexIdr,
    opexAnnualIdr: params.opexAnnualIdr,
    tire: {
      totalUnits: tireUnits.length,
      ok: tireUnits.filter((u) => u.status === "ok").length,
      warn: tireUnits.filter((u) => u.status === "warn").length,
      critical: tireUnits.filter((u) => u.status === "critical").length,
      avgPredictedLifeKm,
    },
    payload: {
      count: payload.overall.count,
      underPct: payload.overall.underPct,
      okPct: payload.overall.okPct,
      overPct: payload.overall.overPct,
      meanKg: Math.round(payload.overall.mean),
    },
    calibration: {
      total: calib.length,
      needs: calib.filter((r) => r.needsCalibration).length,
    },
  };
}
