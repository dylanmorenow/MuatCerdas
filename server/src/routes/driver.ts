// Endpoint Modul D — surface driver (FR-0004-2/4). Driver hanya unitnya (unitId dari token).

import type { FastifyInstance } from "fastify";
import { getDriverBundle } from "../services/driver";
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
}
