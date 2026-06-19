// Revisi F2 — laporan massa muatan operator (store-and-forward) → Mass Monitoring surveyor.
// Orchestrator Prisma; agregasi murni di shared/mass.ts. SR-V3 ditegakkan (kategori unit benar).
//
// Batas integrasi: operatorFeed() adalah adaptor sumber data. Sekarang sumber = input operator
// (disimulasikan; antrean offline di klien). Kelak feed nyata (telematik kabin) dapat menambah
// adaptor di sini TANPA mengubah domain shared. Jangan memalsukan perangkat live.

import {
  latestMassPerUnit,
  summarizeMassByMaterial,
  isSameDay,
  type Material,
} from "@muatcerdas/shared";
import { prisma } from "../db";

export interface MassInputRow {
  id: string;
  unitId: string;
  category: string;
  material: string | null;
  totalT: number;
  bucket1T: number | null;
  bucket2T: number | null;
  excavatorOperator: string | null;
  operatorName: string;
  timestamp: string;
  source: string;
}

export interface AddMassInput {
  unitId: string;
  material?: string | null;
  totalT?: number;
  bucket1T?: number | null;
  bucket2T?: number | null;
  excavatorOperator?: string | null;
  operatorName?: string;
  timestamp?: string;
  source?: string;
}

const MATERIALS: Material[] = ["coal", "overburden"];

/** Catat satu laporan massa dari operator. Validasi kategori unit (SR-V3) + material + angka. */
export async function addMassInput(input: AddMassInput): Promise<MassInputRow> {
  const unit = await prisma.unit.findUnique({ where: { id: input.unitId } });
  if (!unit) throw new Error(`Unit '${input.unitId}' tidak ditemukan`);

  const material = input.material ?? null;
  if (material !== null && !MATERIALS.includes(material as Material)) {
    throw new Error(`Material '${material}' tak dikenal (coal | overburden)`);
  }
  // SR-V3 jujur: HD785 (pit_dumper) memuat coal/overburden; truk hauling mengangkut batubara.
  if (unit.category === "pit_dumper" && material === null) {
    throw new Error("HD785 wajib memilih material (coal | overburden)");
  }

  const bucket1T = numOrNull(input.bucket1T);
  const bucket2T = numOrNull(input.bucket2T);
  // totalT: pakai input bila ada & valid; jika tidak, jumlahkan bucket (truk hauling).
  let totalT = numOrNull(input.totalT) ?? 0;
  if (!(totalT > 0) && (bucket1T || bucket2T)) totalT = (bucket1T ?? 0) + (bucket2T ?? 0);
  if (!(totalT > 0)) throw new Error("Massa total harus > 0 ton");

  const operatorName = (input.operatorName ?? "").trim();
  if (!operatorName) throw new Error("Nama operator pelapor wajib diisi");

  const ts = input.timestamp ? new Date(input.timestamp) : new Date();
  if (Number.isNaN(ts.getTime())) throw new Error("Timestamp tak valid");

  const rec = await prisma.massInput.create({
    data: {
      unitId: input.unitId,
      category: unit.category,
      material,
      totalT,
      bucket1T,
      bucket2T,
      excavatorOperator: (input.excavatorOperator ?? "").trim() || null,
      operatorName,
      timestamp: ts,
      source: input.source ?? "operator",
    },
  });
  return toRow(rec);
}

/**
 * Mass Monitoring (surveyor) — laporan real-time per HD785: muatan terakhir + material
 * (coal vs overburden) + nama operator excavator pemuat. Plus ringkasan kuota coal harian.
 */
export async function getMassMonitoring(today = new Date()): Promise<{
  hd785: MassInputRow[];
  todayCoalT: number;
  todayOverburdenT: number;
  reportsToday: number;
}> {
  const recs = await prisma.massInput.findMany({
    where: { category: "pit_dumper" },
    orderBy: { timestamp: "desc" },
    take: 500,
  });
  const rows = recs.map(toRow);
  const latest = latestMassPerUnit(rows);
  const hd785 = Object.values(latest).sort((a, b) => a.unitId.localeCompare(b.unitId));

  const todays = rows.filter((r) => isSameDay(r.timestamp, today));
  const sum = summarizeMassByMaterial(todays);
  return {
    hd785,
    todayCoalT: Math.round(sum.coalT),
    todayOverburdenT: Math.round(sum.overburdenT),
    reportsToday: todays.length,
  };
}

/**
 * Seluruh laporan operator, DIKELOMPOKKAN per jenis data (untuk surveyor). F2: massa HD785
 * (coal/OB) & massa truk hauling (bucket). DriverEvent menyusul (F3).
 */
export async function getOperatorData(): Promise<{
  groups: { key: string; label: string; rows: MassInputRow[] }[];
  total: number;
}> {
  const recs = await prisma.massInput.findMany({ orderBy: { timestamp: "desc" }, take: 500 });
  const rows = recs.map(toRow);
  const hd = rows.filter((r) => r.category === "pit_dumper");
  const haul = rows.filter((r) => r.category === "haul_truck");
  const groups = [
    { key: "hd785-mass", label: "Massa muatan HD785 (batubara atau overburden)", rows: hd },
    { key: "haul-bucket", label: "Massa truk hauling (per bucket)", rows: haul },
  ].filter((g) => g.rows.length > 0);
  return { groups, total: rows.length };
}

/**
 * Total coal (ton) dimuat HD785 HARI INI dari laporan operator — sumber kuota Dashboard.
 * Mengembalikan null bila belum ada laporan hari ini (pemanggil boleh fallback ke estimasi).
 */
export async function coalLoadedTodayT(today = new Date()): Promise<number | null> {
  const recs = await prisma.massInput.findMany({
    where: { category: "pit_dumper", material: "coal" },
    orderBy: { timestamp: "desc" },
    take: 1000,
  });
  const todays = recs.map(toRow).filter((r) => isSameDay(r.timestamp, today));
  if (todays.length === 0) return null;
  return Math.round(summarizeMassByMaterial(todays).coalT);
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// — Revisi akhir (OPERATOR-2): katalog operator excavator untuk dropdown laporan HD785 —

export interface ExcavatorOperatorRow {
  id: string;
  name: string;
  excavatorType: string;
}

/** Daftar operator excavator (urut nama) untuk dropdown. */
export async function listExcavatorOperators(): Promise<ExcavatorOperatorRow[]> {
  return prisma.excavatorOperator.findMany({ orderBy: { name: "asc" } });
}

/** Tambah operator/anggota baru. Idempoten: bila nama sudah ada, kembalikan yang lama. */
export async function addExcavatorOperator(input: {
  name?: string;
  excavatorType?: string;
}): Promise<ExcavatorOperatorRow> {
  const name = (input.name ?? "").trim();
  const excavatorType = (input.excavatorType ?? "").trim();
  if (!name) throw new Error("Nama operator excavator wajib diisi");
  if (!excavatorType) throw new Error("Tipe excavator wajib diisi");
  const existing = await prisma.excavatorOperator.findUnique({ where: { name } });
  if (existing) return existing;
  return prisma.excavatorOperator.create({ data: { name, excavatorType } });
}

function toRow(r: {
  id: string;
  unitId: string;
  category: string;
  material: string | null;
  totalT: number;
  bucket1T: number | null;
  bucket2T: number | null;
  excavatorOperator: string | null;
  operatorName: string;
  timestamp: Date;
  source: string;
}): MassInputRow {
  return {
    id: r.id,
    unitId: r.unitId,
    category: r.category,
    material: r.material,
    totalT: r.totalT,
    bucket1T: r.bucket1T,
    bucket2T: r.bucket2T,
    excavatorOperator: r.excavatorOperator,
    operatorName: r.operatorName,
    timestamp: r.timestamp.toISOString(),
    source: r.source,
  };
}
