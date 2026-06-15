// Hook Modul D — surface driver (data unit sendiri).
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "./client";
import type { RoadMapData } from "./roadmap";

export interface DriverBundle {
  identity: { username: string | null; name: string | null; shift: string | null };
  unit: { id: string; model: string; category: string };
  speed: { vmaxSafeTravelKmh: number; reason: string; overTarget: boolean; payloadT: number; targetT: number } | null;
  tire: {
    status: "ok" | "warn" | "critical";
    remainingLifeKm: number;
    predictedLifeKm: number;
    confidence: number;
    usedFallback: boolean;
  } | null;
  payload: {
    meanKg: number;
    targetKg: number;
    status: "under" | "ok" | "over";
    pctOfTarget: number;
    events: number;
  } | null;
  calibration: { needsCalibration: boolean; ageDays: number; scaleStudyOffsetPct: number } | null;
  production: { dailyTargetTon: number; unitShareTon: number; perTripPayloadT: number };
  roadMap: RoadMapData;
}

export function useDriverMe() {
  return useQuery({ queryKey: ["driver-me"], queryFn: () => apiGet<DriverBundle>("/api/driver/me") });
}
