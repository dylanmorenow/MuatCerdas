// §C.1–§C.3 — TKPH (Tonne-Kilometre Per Hour). Sumber kebenaran: docs/MODULE_C_SPEED.md.
// Fungsi MURNI & deterministik (BUKAN AI) — tidak menyentuh DB/UI. Koefisien/parameter
// terlihat (explainable). Semua angka katalog/kondisi = ASUMSI editable (lihat assumptions.ts).

export interface CriticalTireLoad {
  /** Beban ban posisi terberat saat BERMUATAN (tonne/ban) — TKL. */
  tkLoadedT: number;
  /** Beban ban posisi terberat saat KOSONG (tonne/ban) — TKE. */
  tkEmptyT: number;
  /** Qa = (TKL + TKE)/2 — beban ban kritis rata-rata (tonne/ban) (§C.1). */
  qaT: number;
}

/**
 * Beban ban kritis Qa (§C.1). Model ASUMSI yang transparan: satu ban di posisi
 * terberat memikul fraksi `loadShareHeaviestPosition` dari berat kendaraan total.
 * GVW bermuatan = tare + payload; kosong = tare.
 *
 * Qa linear terhadap payload → dipakai untuk inversi opsi "kurangi overload" (decision.ts):
 *   Qa(payloadT) = share·tareT + (share/2)·payloadT
 */
export function criticalTireLoadTonnes(input: {
  tareKg: number;
  payloadKg: number;
  /** 0..1 — fraksi GVW pada satu ban terberat (ASUMSI, editable). */
  loadShareHeaviestPosition: number;
}): CriticalTireLoad {
  const tareT = Math.max(0, input.tareKg) / 1000;
  const payloadT = Math.max(0, input.payloadKg) / 1000;
  const share = input.loadShareHeaviestPosition;
  const tkLoadedT = share * (tareT + payloadT);
  const tkEmptyT = share * tareT;
  return { tkLoadedT, tkEmptyT, qaT: (tkLoadedT + tkEmptyT) / 2 };
}

/** Intersep Qa pada payload = 0 (tonne): share·tareT. Untuk inversi opsi reduce_overload. */
export function qaAtZeroPayloadT(tareKg: number, loadShareHeaviestPosition: number): number {
  return loadShareHeaviestPosition * (Math.max(0, tareKg) / 1000);
}

/** Kemiringan dQa/dPayload (tonne Qa per tonne payload): share/2. */
export function qaSlopePerPayloadT(loadShareHeaviestPosition: number): number {
  return loadShareHeaviestPosition / 2;
}

/** Vm — kecepatan kerja RATA-RATA (km/jam), termasuk waktu berhenti/loading (§C.1). */
export function workAverageSpeedKmh(distancePerShiftKm: number, workHoursPerShift: number): number {
  return workHoursPerShift > 0 ? distancePerShiftKm / workHoursPerShift : 0;
}

/** TKPH aktual site = Qa × Vm (§C.1). Basis kerja-rata-rata (sama dgn Vm). */
export function tkphSite(qaT: number, vmKmh: number): number {
  return qaT * vmKmh;
}

/** TKPH maksimum ban = katalog × koreksi suhu × koreksi situs (§C.2). */
export function tkphTire(
  catalogTkph: number,
  tempCorrectionFactor: number,
  siteCorrectionFactor: number,
): number {
  return catalogTkph * tempCorrectionFactor * siteCorrectionFactor;
}

/**
 * Vmax aman pada basis KERJA-RATA-RATA (Vm) (§C.3): TKPH_ban / Qa_current.
 * Qa_current naik bila overload ⇒ Vmax_safe turun (AC#1). Satuan: km/jam.
 */
export function vmaxSafeWorkKmh(tkphTireValue: number, qaCurrentT: number): number {
  return qaCurrentT > 0 ? tkphTireValue / qaCurrentT : Infinity;
}
