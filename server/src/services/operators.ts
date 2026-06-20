// Revisi item 4 — kelola operator (nama + shift) untuk unit baru. Reuse tabel Operator.
import { prisma } from "../db";

export interface OperatorRow {
  id: string;
  name: string;
  shift: string;
}

export async function listOperators(): Promise<OperatorRow[]> {
  return prisma.operator.findMany({ orderBy: { id: "asc" } });
}

/** Tambah operator baru (nama + shift). Id otomatis OP-xx berikutnya. */
export async function addOperator(input: { name?: string; shift?: string }): Promise<OperatorRow> {
  const name = (input.name ?? "").trim();
  const shift = input.shift === "night" ? "night" : "day";
  if (!name) throw new Error("Nama operator wajib diisi");
  const count = await prisma.operator.count();
  const id = `OP-${String(count + 1).padStart(2, "0")}`;
  return prisma.operator.create({ data: { id, name, shift } });
}
