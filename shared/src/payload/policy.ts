// FR-0002-11 — Generator loading policy (Modul B): band target, jumlah pass disarankan,
// koreksi densitas material. Fungsi murni; nilai referensi = ASUMSI (PRD §16), editable di UI.

import { PAYLOAD_UNDER_THRESHOLD, PAYLOAD_OVER_THRESHOLD } from "./analytics";

/** Kapasitas bucket excavator (m³) — ASUMSI, konfirmasi spesifikasi KPP. */
export const EXCAVATOR_BUCKET_M3: Record<string, number> = {
  PC2000: 11,
  PC1250: 6.7,
  PC850: 4.5,
};

/** Densitas material lepas (t/m³) — ASUMSI. */
export const MATERIAL_DENSITY_T_PER_M3: Record<string, number> = {
  Batubara: 0.9,
  Laterit: 1.6,
  Overburden: 1.8,
};

/** Fill factor bucket default (ASUMSI). */
export const DEFAULT_FILL_FACTOR = 0.9;

export interface LoadingPolicyInput {
  targetKg: number;
  bucketCapacityM3: number;
  materialDensityTPerM3: number;
  /** 0..1 (default 0,9). */
  fillFactor?: number;
}

export interface LoadingPolicy {
  /** Berat per pass bucket (kg) = bucketM3 × densitas × 1000 × fillFactor. */
  perPassKg: number;
  /** Jumlah pass disarankan = round(target / perPass). */
  suggestedPasses: number;
  /** Payload efektif bila mengikuti suggestedPasses (kg). */
  effectivePayloadKg: number;
  /** Band target [85% .. 100%] × target (kg). */
  targetBandKg: [number, number];
}

/** Hitung loading policy (§FR-0002-11). */
export function loadingPolicy(input: LoadingPolicyInput): LoadingPolicy {
  if (input.targetKg <= 0) throw new Error("targetKg harus > 0");
  if (input.bucketCapacityM3 <= 0 || input.materialDensityTPerM3 <= 0) {
    throw new Error("kapasitas bucket & densitas harus > 0");
  }
  const fill = input.fillFactor ?? DEFAULT_FILL_FACTOR;
  const perPassKg = input.bucketCapacityM3 * input.materialDensityTPerM3 * 1000 * fill;
  const suggestedPasses = Math.max(1, Math.round(input.targetKg / perPassKg));
  const effectivePayloadKg = suggestedPasses * perPassKg;
  const targetBandKg: [number, number] = [
    input.targetKg * PAYLOAD_UNDER_THRESHOLD,
    input.targetKg * PAYLOAD_OVER_THRESHOLD,
  ];
  return { perPassKg, suggestedPasses, effectivePayloadKg, targetBandKg };
}
