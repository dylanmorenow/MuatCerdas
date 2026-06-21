// Hook TanStack Query untuk Modul A (Tire). Tipe respons mengikuti server services/tire.ts.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client";

export type TireStatus = "ok" | "warn" | "critical";

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
  riskGrade: "A" | "B" | "C" | null;
  extraWearKm: number;
}

export interface FactorContribution {
  factor: string;
  contribution: number;
}

export interface TireModelSummary {
  coefficients: {
    intercept: number;
    pressure: number;
    loadIndex: number;
    road: number;
    operator: number;
    brand: Record<string, number>;
  };
  referenceBrand: string;
  brands: string[];
  r2: number;
  rmse: number;
  n: number;
  degenerate: boolean;
}

export interface TireUnitFeatures {
  model: string;
  avgPressureDeviationPct: number;
  loadIndex: number;
  weightedRoadConditionExposure: number;
  operatorFactor: number;
  currentKm: number;
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

export interface TireUnitDetail extends TireUnitSummary {
  features: TireUnitFeatures;
  history: TireHistoryRow[];
  attribution: {
    baselineLifeKm: number;
    shortfallKm: number;
    contributions: FactorContribution[];
  };
  regressionModel: TireModelSummary;
  tireModel: string | null;
  idealLifeKm: number;
}

export interface TireRecommendation {
  unitId: string;
  model: string;
  action: string;
  reason: string;
  factor: string;
  estimatedSavingsIdr: number;
  priority: number;
  grade: "A" | "B" | "C";
  actionType: string;
  refKey: string;
}

export function useTireUnits() {
  return useQuery({ queryKey: ["tire-units"], queryFn: () => apiGet<TireUnitSummary[]>("/api/tires/units") });
}

export function useTireUnit(id: string | undefined) {
  return useQuery({
    queryKey: ["tire-unit", id],
    queryFn: () => apiGet<TireUnitDetail>(`/api/tires/units/${id}`),
    enabled: Boolean(id),
  });
}

export function useTireRecommendations() {
  return useQuery({
    queryKey: ["tire-recs"],
    queryFn: () => apiGet<TireRecommendation[]>("/api/tires/recommendations"),
  });
}

export function useTireModel() {
  return useQuery({ queryKey: ["tire-model"], queryFn: () => apiGet<TireModelSummary>("/api/tires/model") });
}

// — Item 5: katalog tipe ban (keterangan + umur ideal) & assign tipe ban per unit —
export interface TireCatalogRow {
  tireModel: string;
  catalogTkph: number;
  idealLifeKm: number;
  sizeSpec: string | null;
  loadRating: string | null;
  unitsUsing: string[];
}

export interface TireAssignRow {
  id: string;
  model: string;
  tireModel: string | null;
}

export function useTireCatalog() {
  return useQuery({ queryKey: ["tire-catalog"], queryFn: () => apiGet<TireCatalogRow[]>("/api/tires/catalog") });
}

export function useSaveTireCatalog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      tireModel: string;
      catalogTkph: number;
      idealLifeKm: number;
      sizeSpec?: string | null;
      loadRating?: string | null;
    }) => apiSend<TireCatalogRow[]>("/api/tires/catalog", "PUT", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tire-catalog"] });
      void qc.invalidateQueries({ queryKey: ["tire-units"] });
      void qc.invalidateQueries({ queryKey: ["tire-unit"] });
    },
  });
}

export function useTireAssignments() {
  return useQuery({ queryKey: ["tire-assign"], queryFn: () => apiGet<TireAssignRow[]>("/api/tires/assign") });
}

export function useAssignUnitTire() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ unitId, tireModel }: { unitId: string; tireModel: string }) =>
      apiSend<{ ok: boolean }>(`/api/tires/assign/${unitId}`, "PUT", { tireModel }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["tire-assign"] });
      void qc.invalidateQueries({ queryKey: ["tire-catalog"] });
      void qc.invalidateQueries({ queryKey: ["tire-units"] });
      void qc.invalidateQueries({ queryKey: ["tire-unit"] });
      void qc.invalidateQueries({ queryKey: ["speed"] });
    },
  });
}
