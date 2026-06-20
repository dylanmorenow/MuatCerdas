// Revisi item 4 — load/save OpsParams (termasuk jumlah unit HD785).
import { defaultOpsParams, opsParamsSchema, type OpsParams } from "@muatcerdas/shared";
import { prisma } from "../db";

export async function loadOpsParams(): Promise<OpsParams> {
  const row = await prisma.opsParams.findUnique({ where: { id: 1 } });
  if (!row) return defaultOpsParams;
  const { id: _id, ...params } = row;
  return params;
}

export async function saveOpsParams(input: unknown): Promise<OpsParams> {
  const parsed = opsParamsSchema.parse(input);
  const saved = await prisma.opsParams.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed },
    update: parsed,
  });
  const { id: _id, ...rest } = saved;
  return rest;
}
