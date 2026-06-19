// Revisi F2 — endpoint laporan massa operator + Mass Monitoring surveyor.
// POST /api/mass             : operator (admin/driver) catat massa. Driver hanya unitnya sendiri.
// GET  /api/mass/monitoring  : surveyor (admin) — real-time per HD785 + ringkasan coal/OB harian.
// GET  /api/mass/operator-data: surveyor (admin) — semua laporan operator dikelompokkan per jenis.

import type { FastifyInstance } from "fastify";
import {
  addMassInput,
  getMassMonitoring,
  getOperatorData,
  listExcavatorOperators,
  addExcavatorOperator,
} from "../services/mass";
import { type TokenPayload } from "../auth";

export async function massRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/mass", async (request, reply) => {
    const payload = request.user as unknown as TokenPayload | undefined;
    const body = (request.body ?? {}) as Record<string, unknown>;

    // Driver hanya boleh melapor untuk unitnya sendiri (FR-0004-2).
    if (payload?.role === "driver") {
      if (!payload.unitId) return reply.code(400).send({ error: "Akun driver tanpa unit" });
      if (body.unitId && body.unitId !== payload.unitId) {
        return reply.code(403).send({ error: "Driver hanya boleh melapor untuk unitnya sendiri" });
      }
      body.unitId = payload.unitId;
    }

    try {
      return await addMassInput({
        unitId: String(body.unitId ?? ""),
        material: (body.material as string | null) ?? null,
        totalT: body.totalT === undefined ? undefined : Number(body.totalT),
        bucket1T: body.bucket1T === undefined ? null : Number(body.bucket1T),
        bucket2T: body.bucket2T === undefined ? null : Number(body.bucket2T),
        excavatorOperator: (body.excavatorOperator as string | null) ?? null,
        operatorName: String(body.operatorName ?? payload?.sub ?? ""),
        timestamp: body.timestamp ? String(body.timestamp) : undefined,
        source: body.source ? String(body.source) : "operator",
      });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });

  app.get("/api/mass/monitoring", async () => getMassMonitoring());

  app.get("/api/mass/operator-data", async () => getOperatorData());

  // OPERATOR-2 — katalog operator excavator (dropdown). GET: driver + admin. POST: tambah anggota baru.
  app.get("/api/mass/excavator-operators", async () => listExcavatorOperators());

  app.post("/api/mass/excavator-operators", async (request, reply) => {
    const body = (request.body ?? {}) as { name?: string; excavatorType?: string };
    try {
      return await addExcavatorOperator({ name: body.name, excavatorType: body.excavatorType });
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }
  });
}
