// Hook TanStack Query untuk Inti — Finansial/ROI + Dashboard.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CostParams } from "@muatcerdas/shared";
import { apiGet, apiSend } from "./client";

export interface FinanceData {
  params: CostParams;
  derived: {
    overloadRateSum: number;
    modelTireLifeKm: number;
    haulUnitCount: number;
  };
}

export interface FinanceKpis {
  avoidableTires: number;
  avoidableCostPerUnit: number;
  capturedPerUnit: number;
  fleetCaptured: number;
  underloadExtraCost: number;
  overloadCost: number;
  payloadAvoidable: number;
  annualSavings: number;
  paybackMonths: number;
  roiYear1: number;
}

export interface DashboardData {
  finance: FinanceKpis;
  capexIdr: number;
  opexAnnualIdr: number;
  tire: { totalUnits: number; ok: number; warn: number; critical: number; avgPredictedLifeKm: number };
  payload: { count: number; underPct: number; okPct: number; overPct: number; meanKg: number };
  calibration: { total: number; needs: number };
  ops: {
    tireReplacementCostIdr: number;
    productionLossIdr: number;
    coalQuota: { targetT: number; loadedT: number; pct: number };
  };
}

export function useFinance() {
  return useQuery({ queryKey: ["finance"], queryFn: () => apiGet<FinanceData>("/api/finance") });
}

/** Kunci tanggal lokal "YYYY-MM-DD" (untuk target coal per hari, item 4). */
export function localDateKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function useDashboard() {
  const today = localDateKey();
  return useQuery({
    queryKey: ["dashboard", today],
    queryFn: () => apiGet<DashboardData>(`/api/dashboard?today=${today}`),
  });
}

// — Item 4: kalender target produksi batubara harian —
export interface CoalTarget {
  date: string; // "YYYY-MM-DD"
  targetT: number;
}

export function useCoalTargets() {
  return useQuery({ queryKey: ["coal-targets"], queryFn: () => apiGet<CoalTarget[]>("/api/coal-targets") });
}

export function useSaveCoalTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CoalTarget) =>
      apiSend<{ ok: boolean; targets: CoalTarget[] }>("/api/coal-targets", "PUT", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["coal-targets"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

function useInvalidateFinance() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["finance"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useSaveParams() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: (params: CostParams) => apiSend<CostParams>("/api/finance/params", "PUT", params),
    onSuccess: invalidate,
  });
}

export function useResetParams() {
  const invalidate = useInvalidateFinance();
  return useMutation({
    mutationFn: () => apiSend<CostParams>("/api/finance/reset", "POST"),
    onSuccess: invalidate,
  });
}
