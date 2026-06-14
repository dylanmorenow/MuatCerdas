// §12.5 — Loading guidance HD785 (Modul B). Sumber kebenaran: PRD §12.5 + AC FR-0002-10.
//
// Interpretasi (monotonik saat memuat, didamaikan dari §12.5 & AC):
//   rasio < 95%      → HIJAU  ("masih di bawah target, lanjut muat")
//   95% ≤ rasio ≤110% → KUNING ("≥95% target, bersiap stop")
//   rasio > 110%     → MERAH  ("STOP — overload")
// Konsisten dengan band status payload §12.3.

export type LoadingStatus = "green" | "amber" | "red";

export const LOADING_AMBER_THRESHOLD = 0.95;
export const LOADING_RED_THRESHOLD = 1.1;

/** Status indikator pemuatan terhadap target (§12.5). */
export function loadingStatus(totalKg: number, targetKg: number): LoadingStatus {
  if (targetKg <= 0) throw new Error("targetKg harus > 0 untuk loading guidance");
  const ratio = totalKg / targetKg;
  if (ratio > LOADING_RED_THRESHOLD) return "red";
  if (ratio >= LOADING_AMBER_THRESHOLD) return "amber";
  return "green";
}

/** Total berat bucket. */
export function bucketsTotal(buckets: number[]): number {
  return buckets.reduce((sum, kg) => sum + kg, 0);
}

/** Status pemuatan dari urutan berat bucket (§12.5). */
export function loadingStatusFromBuckets(buckets: number[], targetKg: number): LoadingStatus {
  return loadingStatus(bucketsTotal(buckets), targetKg);
}
