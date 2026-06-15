// §C.4–§C.5 — Kecepatan yang dibutuhkan untuk target produksi + REKONSILIASI satuan.
// Sumber kebenaran: docs/MODULE_C_SPEED.md §C.4–§C.5. Fungsi MURNI & deterministik.
//
// §C.5 (WAJIB benar): Vm/§C.1 = kecepatan KERJA-RATA-RATA (termasuk berhenti);
// V_required/§C.4 = kecepatan TRAVEL (saat bergerak). Keduanya TIDAK boleh dibandingkan
// mentah. Basis kanonik untuk keputusan §C.6 = KERJA-RATA-RATA. Konversi eksplisit di bawah.

export interface ProductionSpeedInput {
  /** Target produksi harian armada (ton/hari). */
  dailyTargetTon: number;
  /** Payload per unit (ton). */
  payloadPerUnitTon: number;
  /** Jumlah unit yang melayani target. */
  unitCount: number;
  /** Jam kerja efektif per hari (jam). */
  effectiveWorkHoursPerDay: number;
  /** Waktu tetap per siklus: loading+dumping+manuver+antri (jam). */
  fixedTimeHours: number;
  /** Jarak satu arah (km). */
  oneWayKm: number;
}

export interface ProductionSpeedResult {
  tripsPerDay: number;
  tripsPerUnitPerDay: number;
  cycleTimeAvailableHours: number;
  travelTimeAvailableHours: number;
  /** §C.4 mentah — basis TRAVEL (saat bergerak). */
  vRequiredTravelKmh: number;
  /** §C.5 — basis KERJA-RATA-RATA (dibandingkan ke Vmax_safe_work di §C.6). */
  vRequiredWorkKmh: number;
  /** travelTime / cycleTime (0..1). */
  travelFraction: number;
  /** false bila waktu tetap ≥ waktu siklus → siklus mustahil pada target ini. */
  feasibleCycle: boolean;
}

/**
 * Hitung kebutuhan kecepatan dari target produksi (§C.4) + rekonsiliasi basis (§C.5).
 *
 * Identitas kunci (diuji AC#5): vRequiredWork = vRequiredTravel × travelFraction
 *   = (2·oneWay / travelTime) × (travelTime / cycleTime) = 2·oneWay / cycleTime.
 */
export function productionSpeed(input: ProductionSpeedInput): ProductionSpeedResult {
  const {
    dailyTargetTon,
    payloadPerUnitTon,
    unitCount,
    effectiveWorkHoursPerDay,
    fixedTimeHours,
    oneWayKm,
  } = input;
  const roundTripKm = 2 * oneWayKm;

  const tripsPerDay = payloadPerUnitTon > 0 ? dailyTargetTon / payloadPerUnitTon : 0;
  const tripsPerUnitPerDay = unitCount > 0 ? tripsPerDay / unitCount : 0;
  const cycleTimeAvailableHours =
    tripsPerUnitPerDay > 0 ? effectiveWorkHoursPerDay / tripsPerUnitPerDay : Infinity;
  const travelTimeAvailableHours = cycleTimeAvailableHours - fixedTimeHours;
  const cycleFinite = Number.isFinite(cycleTimeAvailableHours) && cycleTimeAvailableHours > 0;
  const feasibleCycle = cycleFinite && travelTimeAvailableHours > 0;

  const vRequiredTravelKmh = feasibleCycle ? roundTripKm / travelTimeAvailableHours : Infinity;
  const vRequiredWorkKmh = cycleFinite ? roundTripKm / cycleTimeAvailableHours : Infinity;
  const travelFraction = cycleFinite ? travelTimeAvailableHours / cycleTimeAvailableHours : 0;

  return {
    tripsPerDay,
    tripsPerUnitPerDay,
    cycleTimeAvailableHours,
    travelTimeAvailableHours,
    vRequiredTravelKmh,
    vRequiredWorkKmh,
    travelFraction,
    feasibleCycle,
  };
}

/** Konversi basis TRAVEL → KERJA-RATA-RATA (§C.5): v_work = v_travel × travelFraction. */
export function travelToWorkAvg(vTravelKmh: number, travelFraction: number): number {
  return vTravelKmh * travelFraction;
}

/** Konversi basis KERJA-RATA-RATA → TRAVEL (§C.5): v_travel = v_work / travelFraction. */
export function workAvgToTravel(vWorkKmh: number, travelFraction: number): number {
  return travelFraction > 0 ? vWorkKmh / travelFraction : Infinity;
}
