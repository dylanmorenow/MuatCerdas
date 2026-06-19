// Revisi akhir (ADMIN-5) — endpoint tandai selesai. Admin (driver diblok hook peran).

import type { FastifyInstance } from "fastify";
import { resolveAction, unresolveAction, listResolvedActions } from "../services/resolved";

export async function resolvedRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/resolved", async () => listResolvedActions());

  app.post("/api/resolved", async (request, reply) => {
    const b = (request.body ?? {}) as { unitId?: string; actionType?: string; refKey?: string; detail?: string };
    try {
      return await resolveAction({
        unitId: String(b.unitId ?? ""),
        actionType: String(b.actionType ?? ""),
        refKey: String(b.refKey ?? ""),
        detail: b.detail ?? null,
      });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.post("/api/resolved/undo", async (request, reply) => {
    const b = (request.body ?? {}) as { actionType?: string; refKey?: string };
    try {
      return await unresolveAction({ actionType: String(b.actionType ?? ""), refKey: String(b.refKey ?? "") });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
