// Endpoint ingest: POST /api/import/:entity (multipart) — FR-0002-1 / SR-1.
// Parse → validasi (SR-V2 per-baris, SR-V3 pemetaan unit) → upsert baris valid.

import type { FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { prisma } from "../db";
import {
  parseFile,
  validateRows,
  isImportEntity,
  IMPORT_ENTITIES,
  type ImportEntity,
  type RawRow,
  type ValidateCtx,
} from "../services/import";
import type { UnitCategory } from "@muatcerdas/shared";

async function loadUnitCategories(): Promise<Map<string, UnitCategory>> {
  const units = await prisma.unit.findMany({ select: { id: true, category: true } });
  return new Map(units.map((u) => [u.id, u.category as UnitCategory]));
}

/** Upsert baris valid (idempoten by id). Mengembalikan jumlah baris tertulis. */
async function upsertEntity(entity: ImportEntity, rows: RawRow[]): Promise<number> {
  let n = 0;
  for (const r of rows) {
    const id = String(r["id"]);
    switch (entity) {
      case "units": {
        const d = r as unknown as Prisma.UnitUncheckedCreateInput;
        await prisma.unit.upsert({ where: { id }, create: d, update: d });
        break;
      }
      case "operators": {
        const d = r as unknown as Prisma.OperatorUncheckedCreateInput;
        await prisma.operator.upsert({ where: { id }, create: d, update: d });
        break;
      }
      case "segments": {
        const d = r as unknown as Prisma.RoadSegmentUncheckedCreateInput;
        await prisma.roadSegment.upsert({ where: { id }, create: d, update: d });
        break;
      }
      case "tires": {
        const d = r as unknown as Prisma.TireRecordUncheckedCreateInput;
        await prisma.tireRecord.upsert({ where: { id }, create: d, update: d });
        break;
      }
      case "payload": {
        const d = r as unknown as Prisma.PayloadEventUncheckedCreateInput;
        await prisma.payloadEvent.upsert({ where: { id }, create: d, update: d });
        break;
      }
      case "calibration": {
        const d = r as unknown as Prisma.CalibrationRecordUncheckedCreateInput;
        await prisma.calibrationRecord.upsert({ where: { id }, create: d, update: d });
        break;
      }
    }
    n++;
  }
  return n;
}

export async function importRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/import/:entity", async (request, reply) => {
    const { entity } = request.params as { entity: string };
    if (!isImportEntity(entity)) {
      return reply.code(400).send({
        error: `entity tak dikenal: '${entity}'. Pilihan: ${IMPORT_ENTITIES.join(", ")}`,
      });
    }

    const file = await request.file();
    if (!file) {
      return reply.code(400).send({ error: "tidak ada berkas (field multipart 'file')" });
    }

    let rows: RawRow[];
    try {
      const buf = await file.toBuffer();
      rows = parseFile(buf, file.filename);
    } catch (err) {
      return reply.code(400).send({ error: (err as Error).message });
    }

    const ctx: ValidateCtx = { unitCategory: await loadUnitCategories() };
    const { valid, errors } = validateRows(entity, rows, ctx);

    let inserted = 0;
    try {
      inserted = await upsertEntity(entity, valid);
    } catch (err) {
      request.log.error(err);
      return reply.code(500).send({ error: `gagal menyimpan: ${(err as Error).message}` });
    }

    return reply.send({
      entity,
      totalRows: rows.length,
      validCount: valid.length,
      inserted,
      skipped: errors.length,
      errors,
    });
  });
}
