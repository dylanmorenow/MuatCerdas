// Endpoint Data — inventaris untuk layar Data/Import (lihat). Pengubahan data lewat /import.

import type { FastifyInstance } from "fastify";
import { prisma } from "../db";

export async function dataRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/data/inventory", async () => {
    const [units, operators, segments] = await Promise.all([
      prisma.unit.findMany({
        orderBy: { id: "asc" },
        select: {
          id: true,
          category: true,
          model: true,
          tareKg: true,
          ratedPayloadKg: true,
          tiresCount: true,
          tireModel: true,
        },
      }),
      prisma.operator.findMany({ orderBy: { id: "asc" } }),
      prisma.roadSegment.findMany({ orderBy: { id: "asc" } }),
    ]);
    return {
      counts: { units: units.length, operators: operators.length, segments: segments.length },
      units,
      operators,
      segments,
    };
  });
}
