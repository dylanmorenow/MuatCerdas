// Kecepatan OPTIMAL yang ditampilkan ke admin & operator (Revisi). Berbeda dari Vmax_safe (batas ban):
// optimal = kecepatan yang DIPERLUKAN dari rantai produksi (jumlah armada vs target harian, jam kerja),
// untuk unit pada beban "pas" (120 t hauling / 91 t HD785). Bila muatan OVERLOAD (> pas), optimal
// DITURUNKAN sedikit demi umur ban, dan perimeter pelanggaran ikut turun. Batas bahaya absolut
// (45 hauling / 50 HD785) hanya jadi keterangan/ambang pelanggaran instan. Fungsi MURNI & deterministik.
import { clampSpeedKmh } from "./ceiling";

const r1 = (n: number) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : n);

/** Lantai faktor perlambatan overload (tak lebih lambat dari 70% optimal). */
export const OVERLOAD_SLOW_FLOOR = 0.7;

/** Faktor perlambatan saat overload (> pas): proporsional & lembut. 1 bila ≤ pas. */
export function overloadSlowFactor(payloadT: number, pasCapacityT: number): number {
  if (!(pasCapacityT > 0) || payloadT <= pasCapacityT) return 1;
  return Math.max(OVERLOAD_SLOW_FLOOR, pasCapacityT / payloadT);
}

export interface OptimalSpeedResult {
  /** Kecepatan optimal yang ditampilkan (sudah turun bila overload, dibatasi batas bahaya). */
  optimalKmh: number;
  /** Optimal sebelum penyesuaian overload (= V_required dibatasi batas bahaya). */
  baseOptimalKmh: number;
  overloaded: boolean;
  overloadFactor: number;
}

/**
 * Kecepatan optimal per unit. V_required (basis travel/aktual) dari produksi → dibatasi batas bahaya
 * → diturunkan bila overload. Perimeter pelanggaran = optimalKmh.
 */
export function optimalSpeed(args: {
  vRequiredTravelKmh: number;
  payloadT: number;
  pasCapacityT: number;
  ceilingKmh: number;
}): OptimalSpeedResult {
  const base = clampSpeedKmh(args.vRequiredTravelKmh, args.ceilingKmh);
  const factor = overloadSlowFactor(args.payloadT, args.pasCapacityT);
  const optimal = clampSpeedKmh(base * factor, args.ceilingKmh);
  return { optimalKmh: r1(optimal), baseOptimalKmh: r1(base), overloaded: factor < 1, overloadFactor: factor };
}

export type SpeedViolationLevel = "ok" | "over_optimal" | "danger";

/**
 * Level pelanggaran kecepatan AKTUAL (GPS):
 *  - ok          : aktual ≤ optimal
 *  - over_optimal: optimal < aktual ≤ batas bahaya (melebihi kecepatan optimal)
 *  - danger      : aktual > batas bahaya (melebihi batas aman absolut)
 */
export function speedViolationLevel(actualKmh: number, optimalKmh: number, ceilingKmh: number): SpeedViolationLevel {
  if (!Number.isFinite(actualKmh)) return "ok";
  if (actualKmh > ceilingKmh) return "danger";
  if (actualKmh > optimalKmh) return "over_optimal";
  return "ok";
}
