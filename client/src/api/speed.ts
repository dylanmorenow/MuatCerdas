// Hook TanStack Query untuk Modul C — Speed/TKPH. Mirror pola api/finance.ts.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  SpeedParams,
  TkphCatalogEntry,
  SpeedDecision,
  ProductionSpeedResult,
} from "@muatcerdas/shared";
import { apiGet, apiSend } from "./client";

export interface SpeedUnitRow {
  id: string;
  model: string;
  tireModel: string | null;
  payloadT: number;
  targetT: number;
  qaT: number;
  catalogTkph: number;
  tkphTire: number;
  tkphSite: number;
  vmaxSafeWorkKmh: number;
  vmaxSafeTravelKmh: number;
  overTarget: boolean;
  exceedsRequired: boolean;
  reason: string;
}

export interface Hd785SpeedRow {
  id: string;
  model: string;
  tireModel: string | null;
  payloadT: number;
  targetT: number;
  qaT: number;
  catalogTkph: number;
  tkphTire: number;
  vmaxSafeWorkKmh: number;
  vmaxSafeTravelKmh: number;
  overTarget: boolean;
  reason: string;
}

export interface SpeedOverview {
  params: SpeedParams;
  catalog: TkphCatalogEntry[];
  vmKmh: number;
  fleetInputs: { unitCount: number; payloadPerUnitTon: number; avgTareKg: number; avgCatalogTkph: number };
  production: ProductionSpeedResult & { payloadPerUnitTon: number; unitCount: number };
  fleet: {
    representativeQaT: number;
    representativeTkphTire: number;
    vmaxSafeWorkKmh: number;
    vmaxSafeTravelKmh: number;
    decision: SpeedDecision;
  };
  units: SpeedUnitRow[];
  hd785: Hd785SpeedRow[];
}

export function useSpeed() {
  return useQuery({ queryKey: ["speed"], queryFn: () => apiGet<SpeedOverview>("/api/speed") });
}

function useInvalidateSpeed() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["speed"] });
  };
}

export function useSaveSpeedParams() {
  const invalidate = useInvalidateSpeed();
  return useMutation({
    mutationFn: (params: SpeedParams) => apiSend<SpeedParams>("/api/speed/params", "PUT", params),
    onSuccess: invalidate,
  });
}

export function useResetSpeedParams() {
  const invalidate = useInvalidateSpeed();
  return useMutation({
    mutationFn: () => apiSend<SpeedParams>("/api/speed/reset", "POST"),
    onSuccess: invalidate,
  });
}
