// Item 4 — target/kuota produksi batubara per hari (sistem kalender).
// Admin menyetel target untuk beberapa hari ke depan; dashboard memakai target tanggal hari ini
// (fallback ke OpsParams.dailyCoalTargetT bila tanggal belum disetel). Tanggal = string "YYYY-MM-DD".

import { prisma } from "../db";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Kunci tanggal lokal "YYYY-MM-DD". */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isValidDateKey(s: string): boolean {
  return DATE_RE.test(s);
}

/** Target (ton) yang disetel untuk satu tanggal, atau null bila belum disetel. */
export async function getCoalTargetForDate(date: string): Promise<number | null> {
  if (!isValidDateKey(date)) return null;
  const row = await prisma.coalTarget.findUnique({ where: { date } });
  return row?.targetT ?? null;
}

/** Semua target yang sudah disetel, urut tanggal naik. */
export async function listCoalTargets(): Promise<{ date: string; targetT: number }[]> {
  const rows = await prisma.coalTarget.findMany({ orderBy: { date: "asc" } });
  return rows.map((r) => ({ date: r.date, targetT: r.targetT }));
}

/** Setel/ubah target tanggal. targetT ≤ 0 menghapus baris (kembali ke default). */
export async function setCoalTarget(date: string, targetT: number): Promise<void> {
  if (!isValidDateKey(date)) throw new Error("Tanggal harus format YYYY-MM-DD");
  if (!Number.isFinite(targetT) || targetT < 0) throw new Error("Target ton tidak valid");
  if (targetT === 0) {
    await prisma.coalTarget.deleteMany({ where: { date } });
    return;
  }
  await prisma.coalTarget.upsert({
    where: { date },
    update: { targetT },
    create: { date, targetT },
  });
}
