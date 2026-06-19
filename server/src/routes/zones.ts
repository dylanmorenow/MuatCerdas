// Revisi akhir (ADMIN-8) — endpoint kondisi jalan per zona. Admin (driver diblok hook peran).

import type { FastifyInstance } from "fastify";
import { getZoneConditions, setZoneCondition, ZONE_LABEL } from "../services/zones";

export async function zoneRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/zones", async () => {
    const rows = await getZoneConditions();
    return rows.map((r) => ({ ...r, label: ZONE_LABEL[r.zone] ?? r.zone }));
  });

  app.put("/api/zones/:zone", async (request, reply) => {
    const { zone } = request.params as { zone: string };
    const body = (request.body ?? {}) as { condition?: string };
    try {
      return await setZoneCondition(zone, String(body.condition ?? ""));
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
