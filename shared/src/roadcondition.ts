// Revisi akhir — kondisi jalan operasional per zona yang memengaruhi kecepatan unit.
// Berbeda dari conditionScore (keausan ban). Ini pengali kecepatan: makin buruk jalan,
// kecepatan aman makin turun. Slippery praktis berhenti. Semua faktor = ASUMSI.

export type RoadOpsCondition = "normal" | "dusty" | "wet" | "muddy" | "slippery";

export const ROAD_OPS_CONDITIONS: RoadOpsCondition[] = ["normal", "dusty", "wet", "muddy", "slippery"];

export function roadOpsConditionLabel(c: RoadOpsCondition): string {
  switch (c) {
    case "normal":
      return "Normal";
    case "dusty":
      return "Berdebu";
    case "wet":
      return "Basah / lembap";
    case "muddy":
      return "Berlumpur";
    case "slippery":
      return "Licin (biasanya berhenti)";
  }
}

/** Pengali kecepatan aman menurut kondisi jalan (0..1). Slippery ≈ berhenti. ASUMSI. */
export function roadOpsSpeedFactor(c: RoadOpsCondition): number {
  switch (c) {
    case "normal":
      return 1;
    case "dusty":
      return 0.9;
    case "wet":
      return 0.8;
    case "muddy":
      return 0.6;
    case "slippery":
      return 0.15;
  }
}

/** Apakah kondisi ini menambah risiko ban grade C (debu/licin). Untuk integrasi grading. */
export function roadOpsRiskCause(c: RoadOpsCondition): "dust" | "mud" | null {
  if (c === "dusty") return "dust";
  if (c === "muddy" || c === "slippery") return "mud";
  return null;
}
