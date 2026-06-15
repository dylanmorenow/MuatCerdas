// Hook untuk inventaris & impor (layar Data/Import).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet } from "./client";

export interface InventoryUnit {
  id: string;
  category: string;
  model: string;
  tareKg: number;
  ratedPayloadKg: number;
  tiresCount: number;
  tireModel: string | null;
}
export interface InventoryOperator {
  id: string;
  name: string;
  shift: string;
}
export interface InventorySegment {
  id: string;
  name: string;
  surface: string;
  lengthKm: number;
  conditionScore: number;
  avgSpeedLoadedKmh: number;
  avgSpeedEmptyKmh: number;
}
export interface Inventory {
  counts: { units: number; operators: number; segments: number };
  units: InventoryUnit[];
  operators: InventoryOperator[];
  segments: InventorySegment[];
}

export interface ImportResult {
  entity: string;
  totalRows: number;
  validCount: number;
  inserted: number;
  skipped: number;
  errors: { row: number; message: string }[];
}

export function useInventory() {
  return useQuery({ queryKey: ["inventory"], queryFn: () => apiGet<Inventory>("/api/data/inventory") });
}

export function useImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ entity, file }: { entity: string; file: File }) => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/import/${entity}`, { method: "POST", body: fd });
      const body = (await res.json().catch(() => ({}))) as ImportResult & { error?: string };
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      return body;
    },
    // Data berubah → segarkan semua query turunan.
    onSuccess: () => void qc.invalidateQueries(),
  });
}
