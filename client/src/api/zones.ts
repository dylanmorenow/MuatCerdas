// Hook revisi akhir (ADMIN-8) — kondisi jalan per zona. GET + PUT (admin).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client";

export interface ZoneCondition {
  zone: string;
  condition: string;
  label: string;
}

export function useZones() {
  return useQuery({ queryKey: ["zones"], queryFn: () => apiGet<ZoneCondition[]>("/api/zones") });
}

export function useSetZoneCondition() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ zone, condition }: { zone: string; condition: string }) =>
      apiSend<{ zone: string; condition: string }>(`/api/zones/${zone}`, "PUT", { condition }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["zones"] });
      void qc.invalidateQueries({ queryKey: ["speed"] });
    },
  });
}
