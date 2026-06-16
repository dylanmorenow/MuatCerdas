// Hook TanStack Query untuk Modul B (Payload). Tipe mengikuti server services/payload.ts.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client";

export interface PayloadStats {
  count: number;
  underCount: number;
  okCount: number;
  overCount: number;
  underPct: number;
  okPct: number;
  overPct: number;
  mean: number;
  stdev: number;
  meanPctOfTarget: number;
}

export interface GroupStat {
  key: string;
  label: string;
  stats: PayloadStats;
}

export interface TrendPoint {
  date: string;
  count: number;
  mean: number;
  underPct: number;
  okPct: number;
  overPct: number;
}

export interface HistogramBin {
  from: number;
  to: number;
  label: string;
  count: number;
}

export interface UnitOverloadWear {
  unitId: string;
  events: number;
  overEvents: number;
  overloadRate: number;
  costIdr: number;
}

export interface PayloadAnalytics {
  targetKg: number;
  filter: { unitId?: string; operatorId?: string };
  overall: PayloadStats;
  byUnit: GroupStat[];
  byOperator: GroupStat[];
  trend: TrendPoint[];
  histogram: HistogramBin[];
  overloadWear: { byUnit: UnitOverloadWear[]; total: number };
  units: { id: string }[];
  operators: { id: string; name: string }[];
  shiftOperatorsByUnit: Record<string, { day: string | null; night: string | null }>;
}

export interface CalibrationRow {
  unitId: string;
  lastCalibrationDate: string;
  scaleStudyOffsetPct: number;
  ageDays: number;
  needsCalibration: boolean;
}

export interface PayloadFilter {
  unitId?: string;
  operatorId?: string;
}

export function usePayloadAnalytics(filter: PayloadFilter) {
  const qs = new URLSearchParams();
  if (filter.unitId) qs.set("unitId", filter.unitId);
  if (filter.operatorId) qs.set("operatorId", filter.operatorId);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  return useQuery({
    queryKey: ["payload-analytics", filter.unitId ?? null, filter.operatorId ?? null],
    queryFn: () => apiGet<PayloadAnalytics>(`/api/payload/analytics${suffix}`),
  });
}

export function useCalibration() {
  return useQuery({
    queryKey: ["payload-calibration"],
    queryFn: () => apiGet<CalibrationRow[]>("/api/payload/calibration"),
  });
}

export function useAddCalibration() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { unitId: string; lastCalibrationDate: string; scaleStudyOffsetPct: number }) =>
      apiSend<CalibrationRow>("/api/payload/calibration", "POST", input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["payload-calibration"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
