// Hook TanStack Query untuk revisi F2 — laporan massa operator & Mass Monitoring surveyor.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client";

export interface MassInputRow {
  id: string;
  unitId: string;
  category: string;
  material: string | null;
  totalT: number;
  bucket1T: number | null;
  bucket2T: number | null;
  excavatorOperator: string | null;
  operatorName: string;
  timestamp: string;
  source: string;
}

export interface MassMonitoring {
  hd785: MassInputRow[];
  todayCoalT: number;
  todayOverburdenT: number;
  reportsToday: number;
}

export interface OperatorDataGroups {
  groups: { key: string; label: string; rows: MassInputRow[] }[];
  total: number;
}

export interface AddMassBody {
  unitId?: string;
  material?: string | null;
  totalT?: number;
  bucket1T?: number | null;
  bucket2T?: number | null;
  excavatorOperator?: string | null;
  operatorName?: string;
  timestamp?: string;
  source?: string;
}

export function useMassMonitoring() {
  return useQuery({
    queryKey: ["mass-monitoring"],
    queryFn: () => apiGet<MassMonitoring>("/api/mass/monitoring"),
    refetchInterval: 15_000, // "real-time" ringan: poll tiap 15 dtk (data contoh/operator)
  });
}

export function useOperatorData() {
  return useQuery({
    queryKey: ["operator-data"],
    queryFn: () => apiGet<OperatorDataGroups>("/api/mass/operator-data"),
  });
}

export interface ExcavatorOperator {
  id: string;
  name: string;
  excavatorType: string;
}

export function useExcavatorOperators() {
  return useQuery({
    queryKey: ["excavator-operators"],
    queryFn: () => apiGet<ExcavatorOperator[]>("/api/mass/excavator-operators"),
  });
}

export function useAddExcavatorOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; excavatorType: string }) =>
      apiSend<ExcavatorOperator>("/api/mass/excavator-operators", "POST", body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["excavator-operators"] }),
  });
}

/** Kirim langsung satu laporan (dipakai jalur online; offline pakai lib/offlineQueue). */
export function useAddMass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AddMassBody) => apiSend<MassInputRow>("/api/mass", "POST", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["mass-monitoring"] });
      void qc.invalidateQueries({ queryKey: ["operator-data"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
      void qc.invalidateQueries({ queryKey: ["driver-me"] });
      void qc.invalidateQueries({ queryKey: ["speed"] });
    },
  });
}
