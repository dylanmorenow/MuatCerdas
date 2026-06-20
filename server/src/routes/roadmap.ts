// Endpoint Modul D + F3 — peta jalan LiDAR (FR-0004-5/6/7). GET (driver+admin).
// POST /recompute = admin: turunkan ulang conditionScore dari bahaya LiDAR (bukan input manual).

import type { FastifyInstance } from "fastify";
import { getRoadMap, recomputeConditionFromHazards, type MapArea } from "../services/roadmap";

export async function roadmapRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/roadmap", async (request) => {
    const q = request.query as { area?: string };
    const area: MapArea = q.area === "site" ? "site" : "haul";
    return getRoadMap(area);
  });

  app.post("/api/roadmap/recompute", async (_request, reply) => {
    try {
      return await recomputeConditionFromHazards();
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
