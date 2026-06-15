// Modul D — kategori kondisi jalan dari conditionScore (0..1, makin tinggi makin baik).
// Ambang = ASUMSI (docs/MODULE_D §11). Murni; dipakai service roadmap & UI peta.

export type RoadCondition = "baik" | "berlubang" | "berlumpur" | "batu tajam";

/** Kategori kondisi dari skor (≥0,65 baik · ≥0,5 berlubang · ≥0,35 berlumpur · <0,35 batu tajam). */
export function conditionLabel(conditionScore: number): RoadCondition {
  if (conditionScore >= 0.65) return "baik";
  if (conditionScore >= 0.5) return "berlubang";
  if (conditionScore >= 0.35) return "berlumpur";
  return "batu tajam";
}

/** Warna hex untuk SVG/indikator sesuai kondisi. */
export function conditionColor(conditionScore: number): string {
  if (conditionScore >= 0.65) return "#10b981"; // hijau — baik
  if (conditionScore >= 0.5) return "#f59e0b"; // kuning — berlubang
  if (conditionScore >= 0.35) return "#f97316"; // oranye — berlumpur
  return "#ef4444"; // merah — batu tajam
}
