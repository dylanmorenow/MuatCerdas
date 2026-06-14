// Endpoint Inti — Finansial/ROI (§12.7–§12.9) + Dashboard. FR-0002-12/13/14.

import type { FastifyInstance } from "fastify";
import { getFinanceData, saveCostParams, resetCostParams, getDashboard } from "../services/finance";

export async function financeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/finance", async () => getFinanceData());

  app.put("/api/finance/params", async (request, reply) => {
    try {
      return await saveCostParams(request.body);
    } catch (err) {
      const e = err as { issues?: { path: (string | number)[]; message: string }[]; message: string };
      const msg = e.issues
        ? e.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
        : e.message;
      return reply.code(400).send({ error: `Asumsi tidak valid: ${msg}` });
    }
  });

  app.post("/api/finance/reset", async () => resetCostParams());

  app.get("/api/dashboard", async () => getDashboard());
}
