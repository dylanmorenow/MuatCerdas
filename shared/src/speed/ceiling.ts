// Batas atas ABSOLUT kecepatan aman per kategori unit (km/jam) — "hard ceiling" regulasi/jalan.
// TERPISAH dari kalkulasi dinamis berbasis muatan (TKPH §C): rumus muatan tetap berjalan penuh,
// hasilnya hanya DI-CLAMP (Math.min) di OUTPUT sebelum tampil ke UI Admin/Driver dan jadi acuan
// alarm overspeed GPS. Tidak mengubah variabel sensitivitas muatan maupun logika keputusan.

/** Truk hauling (Scania/Volvo double trailer), rute CPP KM33 → Port. */
export const HAUL_SPEED_CEILING_KMH = 45;
/** Komatsu HD785-7, rute internal pit (in-pit site). */
export const HD785_SPEED_CEILING_KMH = 50;

/** Batas atas aktual untuk kategori unit. */
export function speedCeilingForCategory(category: string): number {
  return category === "pit_dumper" ? HD785_SPEED_CEILING_KMH : HAUL_SPEED_CEILING_KMH;
}

/**
 * Clamp kecepatan ke batas atas (km/jam): Math.min(value, ceiling).
 * - value > ceiling  → ceiling (mis. truk kosong rumus 55 → dipotong 45)
 * - value ≤ ceiling  → value apa adanya (rumus muatan berjalan murni)
 * - value tak hingga / NaN → ceiling
 */
export function clampSpeedKmh(valueKmh: number, ceilingKmh: number): number {
  if (!Number.isFinite(valueKmh)) return ceilingKmh;
  return Math.min(valueKmh, ceilingKmh);
}
