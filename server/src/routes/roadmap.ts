// Endpoint Modul D — peta jalan (FR-0004-5/6). GET publik-untuk-login (driver+admin);
// PUT conditionScore = admin (driver diblok oleh hook peran).

import type { FastifyInstance } from "fastify";
import { getRoadMap, updateSegmentCondition } from "../services/roadmap";

export async function roadmapRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/roadmap", async () => getRoadMap());

  app.put("/api/roadmap/segment/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body ?? {}) as { conditionScore?: number };
    try {
      return await updateSegmentCondition(id, Number(body.conditionScore));
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
