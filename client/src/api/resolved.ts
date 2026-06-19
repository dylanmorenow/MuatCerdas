// Hook revisi akhir (ADMIN-5) — tandai selesai sebuah tindakan + batalkan.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiSend } from "./client";

export interface ResolvedAction {
  id: string;
  unitId: string;
  actionType: string;
  refKey: string;
  detail: string | null;
  resolvedAt: string;
}

export function useResolvedActions() {
  return useQuery({ queryKey: ["resolved"], queryFn: () => apiGet<ResolvedAction[]>("/api/resolved") });
}

function useInvalidateAfterResolve() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["resolved"] });
    void qc.invalidateQueries({ queryKey: ["tire-recs"] });
    void qc.invalidateQueries({ queryKey: ["tire-units"] });
    void qc.invalidateQueries({ queryKey: ["dashboard"] });
  };
}

export function useResolveAction() {
  const invalidate = useInvalidateAfterResolve();
  return useMutation({
    mutationFn: (body: { unitId: string; actionType: string; refKey: string; detail?: string }) =>
      apiSend<ResolvedAction>("/api/resolved", "POST", body),
    onSuccess: invalidate,
  });
}

export function useUnresolveAction() {
  const invalidate = useInvalidateAfterResolve();
  return useMutation({
    mutationFn: (body: { actionType: string; refKey: string }) =>
      apiSend<{ ok: boolean }>("/api/resolved/undo", "POST", body),
    onSuccess: invalidate,
  });
}
