// Revisi item 4 — endpoint kelola armada & operator (admin).
import type { FastifyInstance } from "fastify";
import { listOperators, addOperator } from "../services/operators";
import { loadOpsParams, saveOpsParams } from "../services/opsParams";

export async function fleetRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/operators", async () => listOperators());

  app.post("/api/operators", async (request, reply) => {
    const b = (request.body ?? {}) as { name?: string; shift?: string };
    try {
      return await addOperator({ name: b.name, shift: b.shift });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.get("/api/ops", async () => loadOpsParams());

  app.put("/api/ops", async (request, reply) => {
    try {
      return await saveOpsParams(request.body);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
