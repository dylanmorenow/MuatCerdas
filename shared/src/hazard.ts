// Revisi F3 — bahaya jalan dari "device LiDAR" (SIMULASI). Tipe, label, warna, bobot,
// dan derivasi conditionScore segmen DARI bahaya (menggantikan slider manual M10).
// conditionScore hasil derivasi tetap menyetir Modul A (eksposur ban) & Modul C (kecepatan).
// Murni & teruji. Batas jujur: mewakili keluaran LiDAR, bukan feed live.

export type HazardType =
  | "pothole"
  | "rutting"
  | "washboard"
  | "sharp_rock"
  | "spillage"
  | "standing_water"
  | "mud"
  | "edge_break";

export const HAZARD_TYPES: HazardType[] = [
  "pothole",
  "rutting",
  "washboard",
  "sharp_rock",
  "spillage",
  "standing_water",
  "mud",
  "edge_break",
];

/** Label Indonesia (istilah teknis pertahankan). */
export function hazardLabel(t: HazardType): string {
  switch (t) {
    case "pothole":
      return "Pothole (lubang)";
    case "rutting":
      return "Rutting (alur roda)";
    case "washboard":
      return "Washboard (gelombang)";
    case "sharp_rock":
      return "Batu tajam (exposed)";
    case "spillage":
      return "Spillage (tumpahan)";
    case "standing_water":
      return "Genangan air";
    case "mud":
      return "Lumpur";
    case "edge_break":
      return "Edge break (tepi runtuh)";
  }
}

/** Warna penanda per tipe (legenda peta). */
export function hazardColor(t: HazardType): string {
  switch (t) {
    case "pothole":
      return "#ef4444"; // merah
    case "rutting":
      return "#f97316"; // oranye
    case "washboard":
      return "#f59e0b"; // amber
    case "sharp_rock":
      return "#7c3aed"; // ungu — paling merusak ban
    case "spillage":
      return "#0ea5e9"; // biru muda
    case "standing_water":
      return "#3b82f6"; // biru
    case "mud":
      return "#a16207"; // cokelat
    case "edge_break":
      return "#db2777"; // magenta
  }
}

/** Bobot dampak ke keausan/kondisi (0..1). Batu tajam & pothole terparah utk ban. ASUMSI. */
export function hazardSeverityWeight(t: HazardType): number {
  switch (t) {
    case "sharp_rock":
      return 1.0;
    case "pothole":
      return 0.9;
    case "edge_break":
      return 0.8;
    case "rutting":
      return 0.6;
    case "washboard":
      return 0.5;
    case "spillage":
      return 0.5;
    case "mud":
      return 0.5;
    case "standing_water":
      return 0.4;
  }
}

export interface HazardLike {
  type: HazardType;
  segmentId: string;
  /** Keparahan terdeteksi 0..1. */
  severity: number;
}

const COND_BASE = 0.98;
const COND_SCALE = 0.85;
const COND_MIN = 0.2;
const COND_MAX = 0.98;

/**
 * Derivasi conditionScore (0..1, makin tinggi makin baik) segmen DARI daftar bahaya di segmen itu.
 * Lebih banyak/parah bahaya per km ⇒ skor lebih rendah. Tanpa bahaya ⇒ ~COND_MAX.
 */
export function conditionScoreFromHazards(hazards: HazardLike[], lengthKm: number): number {
  const len = Math.max(lengthKm, 1);
  const impactPerKm = hazards.reduce((s, h) => s + hazardSeverityWeight(h.type) * clamp01(h.severity), 0) / len;
  const score = COND_BASE - impactPerKm * COND_SCALE;
  return Number(Math.min(COND_MAX, Math.max(COND_MIN, score)).toFixed(3));
}

function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x));
}
