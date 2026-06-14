// Hook TanStack Query untuk Modul A (Tire). Tipe respons mengikuti server services/tire.ts.

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";

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
}

export interface TireRecommendation {
  unitId: string;
  model: string;
  action: string;
  reason: string;
  factor: string;
  estimatedSavingsIdr: number;
  priority: number;
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
