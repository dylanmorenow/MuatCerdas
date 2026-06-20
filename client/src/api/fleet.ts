// Hook revisi item 4 — kelola armada (jumlah unit HD785) & operator (admin).
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { OpsParams } from "@muatcerdas/shared";
import { apiGet, apiSend } from "./client";

export interface Operator {
  id: string;
  name: string;
  shift: string;
}

export function useOperators() {
  return useQuery({ queryKey: ["operators"], queryFn: () => apiGet<Operator[]>("/api/operators") });
}

export function useAddOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; shift: string }) => apiSend<Operator>("/api/operators", "POST", body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["operators"] });
      void qc.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useOpsParams() {
  return useQuery({ queryKey: ["ops-params"], queryFn: () => apiGet<OpsParams>("/api/ops") });
}

export function useSaveOpsParams() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: OpsParams) => apiSend<OpsParams>("/api/ops", "PUT", params),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["ops-params"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}
