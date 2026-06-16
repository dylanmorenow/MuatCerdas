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

export function useDashboard() {
  return useQuery({ queryKey: ["dashboard"], queryFn: () => apiGet<DashboardData>("/api/dashboard") });
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
