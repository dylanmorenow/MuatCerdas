// Endpoint Modul C — Speed/TKPH (FR-0003-1..7). Rantai penuh haul_truck + panel HD785 (SR-V3 di service).

import type { FastifyInstance } from "fastify";
import { getSpeedOverview, getSpeedParams, saveSpeedParams, resetSpeedParams } from "../services/speed";

export async function speedRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/speed", async () => getSpeedOverview());

  app.get("/api/speed/params", async () => getSpeedParams());

  app.put("/api/speed/params", async (request, reply) => {
    try {
      return await saveSpeedParams(request.body);
    } catch (err) {
      const e = err as { issues?: { path: (string | number)[]; message: string }[]; message: string };
      const msg = e.issues
        ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : e.message;
      return reply.code(400).send({ error: `Asumsi tidak valid: ${msg}` });
    }
  });

  app.post("/api/speed/reset", async () => resetSpeedParams());
}
