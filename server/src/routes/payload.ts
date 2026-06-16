// Endpoint Modul B (Payload) — FR-0002-7/8/9. Hanya HD785 (SR-V3 ditegakkan di service).

import type { FastifyInstance } from "fastify";
import { getPayloadAnalytics, getCalibrationHealth, addCalibration } from "../services/payload";

export async function payloadRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/payload/analytics", async (request, reply) => {
    const q = request.query as { unitId?: string; operatorId?: string };
    try {
      return await getPayloadAnalytics({ unitId: q.unitId, operatorId: q.operatorId });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.get("/api/payload/calibration", async () => getCalibrationHealth());

  app.post("/api/payload/calibration", async (request, reply) => {
    const body = (request.body ?? {}) as {
      unitId?: string;
      lastCalibrationDate?: string;
      scaleStudyOffsetPct?: number;
    };
    try {
      return await addCalibration({
        unitId: body.unitId ?? "",
        lastCalibrationDate: body.lastCalibrationDate ?? "",
        scaleStudyOffsetPct: Number(body.scaleStudyOffsetPct),
      });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
