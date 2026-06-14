// Endpoint Modul A (Tire) — FR-0002-3/4/5/6. Hanya unit haul_truck (SR-V3 ditegakkan
// di service: getTireUnitDetail → null bila unit bukan haul_truck → 404 di sini).

import type { FastifyInstance } from "fastify";
import {
  getTireUnits,
  getTireUnitDetail,
  getTireRecommendations,
  getTireModelSummary,
} from "../services/tire";

export async function tiresRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/tires/units", async () => getTireUnits());

  app.get("/api/tires/model", async () => getTireModelSummary());

  app.get("/api/tires/recommendations", async () => getTireRecommendations());

  app.get("/api/tires/units/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const detail = await getTireUnitDetail(id);
    if (!detail) {
      return reply
        .code(404)
        .send({ error: `Unit truk hauling '${id}' tak ditemukan (atau bukan haul_truck — SR-V3)` });
    }
    return detail;
  });
}
