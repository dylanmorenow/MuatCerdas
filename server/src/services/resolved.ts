// Revisi akhir (ADMIN-5) — tindakan yang sudah diselesaikan. Item yang ditandai selesai
// dikecualikan dari daftar rekomendasi & dari total biaya/kerugian (mis. ganti ban → biaya turun).
// Tersimpan permanen; bisa dibatalkan.

import { prisma } from "../db";

export interface ResolvedActionRow {
  id: string;
  unitId: string;
  actionType: string;
  refKey: string;
  detail: string | null;
  resolvedAt: string;
}

/** Tandai sebuah tindakan selesai (idempoten via actionType+refKey). */
export async function resolveAction(input: {
  unitId: string;
  actionType: string;
  refKey: string;
  detail?: string | null;
}): Promise<ResolvedActionRow> {
  if (!input.unitId || !input.actionType || !input.refKey) {
    throw new Error("unitId, actionType, dan refKey wajib diisi");
  }
  const rec = await prisma.resolvedAction.upsert({
    where: { actionType_refKey: { actionType: input.actionType, refKey: input.refKey } },
    create: { unitId: input.unitId, actionType: input.actionType, refKey: input.refKey, detail: input.detail ?? null },
    update: { detail: input.detail ?? null },
  });
  return toRow(rec);
}

/** Batalkan status selesai (tindakan muncul lagi). */
export async function unresolveAction(input: { actionType: string; refKey: string }): Promise<{ ok: boolean }> {
  await prisma.resolvedAction.deleteMany({ where: { actionType: input.actionType, refKey: input.refKey } });
  return { ok: true };
}

export async function listResolvedActions(): Promise<ResolvedActionRow[]> {
  const recs = await prisma.resolvedAction.findMany({ orderBy: { resolvedAt: "desc" } });
  return recs.map(toRow);
}

/** Set kunci "actionType::refKey" untuk memfilter cepat. */
export async function resolvedKeySet(): Promise<Set<string>> {
  const recs = await prisma.resolvedAction.findMany({ select: { actionType: true, refKey: true } });
  return new Set(recs.map((r) => `${r.actionType}::${r.refKey}`));
}

/** Unit yang penggantian bannya sudah ditandai selesai (untuk menurunkan biaya dashboard). */
export async function resolvedTireReplaceUnitIds(): Promise<Set<string>> {
  const recs = await prisma.resolvedAction.findMany({ where: { actionType: "tire_replace" }, select: { unitId: true } });
  return new Set(recs.map((r) => r.unitId));
}

function toRow(r: {
  id: string;
  unitId: string;
  actionType: string;
  refKey: string;
  detail: string | null;
  resolvedAt: Date;
}): ResolvedActionRow {
  return {
    id: r.id,
    unitId: r.unitId,
    actionType: r.actionType,
    refKey: r.refKey,
    detail: r.detail,
    resolvedAt: r.resolvedAt.toISOString(),
  };
}
