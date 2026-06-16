// Domain murni untuk laporan massa muatan operator (revisi F2).
// Tanpa dependensi DB/UI — dipakai server (agregasi Mass Monitoring & kuota) dan client (preview).
// Semua densitas = ASUMSI sampai data riil masuk (docs/ASSUMPTIONS.md).

import { MATERIAL_DENSITY_T_PER_M3 } from "./payload/policy";

export type Material = "coal" | "overburden";

/** Map material (kode) → kunci densitas policy (label Indonesia). Satu sumber densitas: policy.ts. */
const MATERIAL_TO_POLICY_KEY: Record<Material, string> = { coal: "Batubara", overburden: "Overburden" };

/** Densitas material lepas (t/m³) untuk koreksi pass/policy excavator — reuse policy.ts (ASUMSI). */
export function materialDensityTPerM3(m: Material): number {
  return MATERIAL_DENSITY_T_PER_M3[MATERIAL_TO_POLICY_KEY[m]] ?? 1;
}

/** Label Indonesia untuk material. */
export function materialLabel(m: Material | null | undefined): string {
  if (m === "coal") return "Batubara";
  if (m === "overburden") return "Overburden";
  return "—";
}

/** Bentuk minimal sebuah laporan massa (subset MassInput) yang dibutuhkan domain. */
export interface MassInputLike {
  unitId: string;
  category: string; // "pit_dumper" | "haul_truck"
  material?: string | null; // "coal" | "overburden"
  totalT: number;
  timestamp: string | Date;
}

function toMs(t: string | Date): number {
  return t instanceof Date ? t.getTime() : new Date(t).getTime();
}

/**
 * Laporan TERBARU per unit (berdasarkan timestamp). Untuk panel Mass Monitoring real-time:
 * tiap HD785 menampilkan muatan terakhir yang dilaporkan.
 */
export function latestMassPerUnit<T extends MassInputLike>(inputs: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const m of inputs) {
    const cur = out[m.unitId];
    if (!cur || toMs(m.timestamp) >= toMs(cur.timestamp)) out[m.unitId] = m;
  }
  return out;
}

/** Total massa per material (ton) dari sekumpulan laporan. Untuk kuota produksi & ringkasan. */
export function summarizeMassByMaterial(inputs: MassInputLike[]): {
  coalT: number;
  overburdenT: number;
  totalT: number;
  count: number;
} {
  let coalT = 0;
  let overburdenT = 0;
  let totalT = 0;
  for (const m of inputs) {
    const t = Number.isFinite(m.totalT) ? m.totalT : 0;
    totalT += t;
    if (m.material === "coal") coalT += t;
    else if (m.material === "overburden") overburdenT += t;
  }
  return { coalT, overburdenT, totalT, count: inputs.length };
}

/** Apakah timestamp jatuh pada hari (lokal server) yang sama dengan `ref`. Untuk kuota harian. */
export function isSameDay(t: string | Date, ref: Date): boolean {
  const d = t instanceof Date ? t : new Date(t);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}
