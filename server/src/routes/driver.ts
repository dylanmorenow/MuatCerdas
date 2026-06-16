// Endpoint Modul D — surface driver (FR-0004-2/4). Driver hanya unitnya (unitId dari token).

import type { FastifyInstance } from "fastify";
import { getDriverBundle } from "../services/driver";
import { addDriverEvent, getRecentDriverEvents } from "../services/driverEvents";
import { type TokenPayload } from "../auth";
import { prisma } from "../db";

export async function driverRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/driver/me", async (request, reply) => {
    const payload = request.user as unknown as TokenPayload | undefined;
    const unitId = payload?.unitId;
    if (!unitId) {
      return reply.code(400).send({ error: "Token tanpa unit (akun ini bukan driver)" });
    }
    const full = payload?.sub ? await prisma.user.findUnique({ where: { username: payload.sub } }) : null;
    const bundle = await getDriverBundle(unitId);
    return {
      identity: { username: payload?.sub ?? null, name: full?.name ?? null, shift: full?.shift ?? null },
      ...bundle,
    };
  });

  // F3 — driver melapor kejadian (overspeed/hazard) unitnya. Driver hanya unitnya sendiri.
  app.post("/api/driver/event", async (request, reply) => {
    const payload = request.user as unknown as TokenPayload | undefined;
    const body = (request.body ?? {}) as Record<string, unknown>;
    if (payload?.role === "driver") {
      if (!payload.unitId) return reply.code(400).send({ error: "Akun driver tanpa unit" });
      if (body.unitId && body.unitId !== payload.unitId) {
        return reply.code(403).send({ error: "Driver hanya boleh melapor untuk unitnya sendiri" });
      }
      body.unitId = payload.unitId;
    }
    try {
      return await addDriverEvent({
        unitId: String(body.unitId ?? ""),
        type: String(body.type ?? ""),
        detail: body.detail ? String(body.detail) : "",
        atKm: body.atKm === undefined || body.atKm === null ? null : Number(body.atKm),
        hazardType: body.hazardType ? String(body.hazardType) : null,
        timestamp: body.timestamp ? String(body.timestamp) : undefined,
        source: body.source ? String(body.source) : "sim",
      });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  // F3 — daftar event terbaru (admin; driver diblok hook peran).
  app.get("/api/driver/events", async () => getRecentDriverEvents(150));
}
