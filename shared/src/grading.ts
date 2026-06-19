// Revisi akhir — sistem grading risiko ban (A/B/C) + estimasi pengurangan umur ban di luar
// jarak tempuh. Murni & teruji. Penyebab bisa berupa tipe bahaya jalan ATAU kejadian driver
// (overspeed, overload, rem mendadak) ATAU kondisi (debu). Semua bobot = ASUMSI.

export type TireRiskGrade = "A" | "B" | "C";

/** Penyebab risiko: gabungan tipe bahaya, kejadian driver, dan kondisi. */
export type RiskCause =
  | "sharp_rock"
  | "overload"
  | "overspeed"
  | "pothole"
  | "washboard"
  | "edge_break"
  | "spillage"
  | "rutting"
  | "standing_water"
  | "hard_braking"
  | "mud"
  | "dust";

const GRADE_OF: Record<string, TireRiskGrade> = {
  // Grade A — risiko ban sangat tinggi
  sharp_rock: "A",
  overload: "A",
  overspeed: "A",
  pothole: "A",
  washboard: "A",
  edge_break: "A", // tepi runtuh: dampak parah → A (asumsi)
  // Grade B — risiko ban tinggi
  spillage: "B",
  rutting: "B",
  standing_water: "B",
  hard_braking: "B",
  // Grade C — risiko ban sedang
  mud: "C",
  dust: "C",
};

/** Grade risiko ban dari sebuah penyebab. null bila tak dikenal. */
export function tireRiskGrade(cause: string): TireRiskGrade | null {
  return GRADE_OF[cause] ?? null;
}

/** Perkiraan km umur ban yang hilang per kejadian, menurut grade (ASUMSI). */
export const GRADE_WEAR_KM: Record<TireRiskGrade, number> = { A: 1200, B: 600, C: 250 };

export function gradeLabel(g: TireRiskGrade): string {
  if (g === "A") return "Grade A — risiko sangat tinggi";
  if (g === "B") return "Grade B — risiko tinggi";
  return "Grade C — risiko sedang";
}

/** Warna untuk badge/indikator grade. */
export function gradeColor(g: TireRiskGrade): string {
  if (g === "A") return "#ef4444"; // merah
  if (g === "B") return "#f59e0b"; // amber
  return "#3b82f6"; // biru
}

export interface GradeCounts {
  A: number;
  B: number;
  C: number;
}

/** Hitung jumlah kejadian per grade dari daftar penyebab (yang tak dikenal diabaikan). */
export function gradeCounts(causes: string[]): GradeCounts {
  const c: GradeCounts = { A: 0, B: 0, C: 0 };
  for (const cause of causes) {
    const g = tireRiskGrade(cause);
    if (g) c[g] += 1;
  }
  return c;
}

/** Estimasi total pengurangan umur ban (km) dari jumlah kejadian per grade. */
export function estimateExtraWearKm(counts: GradeCounts): number {
  return counts.A * GRADE_WEAR_KM.A + counts.B * GRADE_WEAR_KM.B + counts.C * GRADE_WEAR_KM.C;
}

/** Grade terburuk yang muncul (A > B > C). null bila tak ada. */
export function worstGrade(counts: GradeCounts): TireRiskGrade | null {
  if (counts.A > 0) return "A";
  if (counts.B > 0) return "B";
  if (counts.C > 0) return "C";
  return null;
}

/** Perkiraan berapa kali cycle lagi ban bisa dipakai. */
export function cyclesRemaining(remainingLifeKm: number, cycleDistanceKm: number): number {
  if (!(cycleDistanceKm > 0)) return 0;
  return Math.max(0, Math.floor(remainingLifeKm / cycleDistanceKm));
}
