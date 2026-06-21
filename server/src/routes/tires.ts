// Endpoint Modul A (Tire) — FR-0002-3/4/5/6. Hanya unit haul_truck (SR-V3 ditegakkan
// di service: getTireUnitDetail → null bila unit bukan haul_truck → 404 di sini).

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  getTireUnits,
  getTireUnitDetail,
  getTireRecommendations,
  getTireModelSummary,
  getTireCatalog,
  upsertTireCatalog,
  getHaulUnitsTire,
  assignUnitTire,
} from "../services/tire";

const catalogInput = z.object({
  tireModel: z.string().min(1),
  catalogTkph: z.number().positive(),
  idealLifeKm: z.number().positive(),
  sizeSpec: z.string().nullish(),
  loadRating: z.string().nullish(),
});

export async function tiresRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/tires/units", async () => getTireUnits());

  app.get("/api/tires/model", async () => getTireModelSummary());

  app.get("/api/tires/recommendations", async () => getTireRecommendations());

  // — Item 5: katalog tipe ban (keterangan + umur ideal) & assign tipe ban per unit —
  app.get("/api/tires/catalog", async () => getTireCatalog());

  app.put("/api/tires/catalog", async (request, reply) => {
    const parsed = catalogInput.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.issues[0]?.message ?? "Input tidak valid" });
    try {
      return await upsertTireCatalog(parsed.data);
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

  app.get("/api/tires/assign", async () => getHaulUnitsTire());

  app.put("/api/tires/assign/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = z.object({ tireModel: z.string().min(1) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "tireModel wajib diisi" });
    try {
      await assignUnitTire(id, parsed.data.tireModel);
      return { ok: true };
    } catch (e) {
      return reply.code(400).send({ error: (e as Error).message });
    }
  });

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
