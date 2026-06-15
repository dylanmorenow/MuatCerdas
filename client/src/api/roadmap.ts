// Hook Modul D — peta jalan (prototipe). GET (driver+admin) · PUT conditionScore (admin).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client";

export interface RoadMapSegment {
  id: string;
  name: string;
  surface: string;
  lengthKm: number;
  conditionScore: number;
  condition: "baik" | "berlubang" | "berlumpur" | "batu tajam";
}
export interface RoadMapData {
  segments: RoadMapSegment[];
  mappers: { leadUnitId: string | null; lastUnitId: string | null };
  lastUpdated: string;
  source: string;
}

export function useRoadMap() {
  return useQuery({ queryKey: ["roadmap"], queryFn: () => apiGet<RoadMapData>("/api/roadmap") });
}

export function useUpdateSegment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, conditionScore }: { id: string; conditionScore: number }) =>
      apiSend<RoadMapSegment>(`/api/roadmap/segment/${id}`, "PUT", { conditionScore }),
    onSuccess: () => {
      // conditionScore dipakai Modul A → segarkan data terkait (FR-0004-6).
      void qc.invalidateQueries({ queryKey: ["roadmap"] });
      void qc.invalidateQueries({ queryKey: ["tire-units"] });
      void qc.invalidateQueries({ queryKey: ["tire-unit"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
