// Revisi item 4 — kelola operator (nama + shift) untuk unit baru. Reuse tabel Operator.
import { prisma } from "../db";

export interface OperatorRow {
  id: string;
  name: string;
  shift: string;
  unitId: string | null;
}

export async function listOperators(): Promise<OperatorRow[]> {
  return prisma.operator.findMany({ orderBy: { id: "asc" } });
}

/** Tambah operator baru (nama + shift + unit yang dipegang). Id otomatis OP-xx berikutnya. */
export async function addOperator(input: { name?: string; shift?: string; unitId?: string | null }): Promise<OperatorRow> {
  const name = (input.name ?? "").trim();
  const shift = input.shift === "night" ? "night" : "day";
  if (!name) throw new Error("Nama operator wajib diisi");
  // Validasi unit (bila diisi) harus benar-benar ada.
  const unitId = input.unitId?.trim() || null;
  if (unitId) {
    const unit = await prisma.unit.findUnique({ where: { id: unitId }, select: { id: true } });
    if (!unit) throw new Error(`Unit '${unitId}' tak ditemukan`);
  }
  const count = await prisma.operator.count();
  const id = `OP-${String(count + 1).padStart(2, "0")}`;
  return prisma.operator.create({ data: { id, name, shift, unitId } });
}
