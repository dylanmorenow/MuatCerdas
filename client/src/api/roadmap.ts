// Hook Modul D + F3 — peta jalan LiDAR (prototipe). GET (driver+admin) ·
// POST /recompute (admin): turunkan conditionScore dari bahaya LiDAR (bukan input manual).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HazardType } from "@muatcerdas/shared";
import { apiGet, apiSend } from "./client";

export interface RoadMapSegment {
  id: string;
  name: string;
  surface: string;
  lengthKm: number;
  conditionScore: number;
  condition: "baik" | "berlubang" | "berlumpur" | "batu tajam";
  hazardCount: number;
}
export interface RoadMapHazard {
  id: string;
  type: HazardType;
  segmentId: string;
  positionKm: number;
  severity: number;
  coveragePct: number;
  urgent: boolean;
}
export interface RoadMapLivePosition {
  unitId: string;
  progressKm: number;
  groundSpeedKmh: number;
}
export interface RoadMapData {
  segments: RoadMapSegment[];
  hazards: RoadMapHazard[];
  routeLengthKm: number;
  mappers: { leadUnitId: string | null; lastUnitId: string | null };
  livePositions: RoadMapLivePosition[];
  lastUpdated: string;
  source: string;
  startLabel: string;
  endLabel: string;
}

export type MapArea = "haul" | "site";

export function useRoadMap(area: MapArea = "haul") {
  return useQuery({
    queryKey: ["roadmap", area],
    queryFn: () => apiGet<RoadMapData>(`/api/roadmap?area=${area}`),
    refetchInterval: 5000, // penanda truk live bergerak dari telemetri GPS
  });
}

/** Recompute conditionScore dari bahaya kamera AI (admin). conditionScore menyetir Modul A → invalidasi terkait. */
export function useRecomputeRoadmap() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiSend<RoadMapData>("/api/roadmap/recompute", "POST"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["roadmap"] });
      void qc.invalidateQueries({ queryKey: ["tire-units"] });
      void qc.invalidateQueries({ queryKey: ["tire-unit"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["speed"] });
    },
  });
}
