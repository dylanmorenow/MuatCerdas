// Metrik operasional (Dashboard reframe — kerugian/risiko, bukan biaya terhindarkan).
// Parameter ASUMSI baru, TERPISAH dari CostParams (sanity finansial §8 tak tersentuh). Fungsi murni.

export interface OpsParams {
  /** Hari unit non-operasi bila ban kritis dibiarkan gagal (ASUMSI). */
  downtimeDaysPerCriticalUnit: number;
  /** Nilai produksi yang hilang per unit per hari non-operasi (ASUMSI). */
  productionValuePerUnitPerDayIdr: number;
  /** Target produksi batubara harian dari HD785 coal (ASUMSI). */
  dailyCoalTargetT: number;
  /** Jumlah unit HD785 (armada, editable). */
  hd785UnitCount: number;
}

export const defaultOpsParams: OpsParams = {
  downtimeDaysPerCriticalUnit: 3,
  productionValuePerUnitPerDayIdr: 25_000_000,
  dailyCoalTargetT: 30_000,
  hd785UnitCount: 12,
};

/** Estimasi total harga ban yang akan segera diganti (unit kritis × ban/unit × harga). */
export function tireReplacementCostIdr(criticalUnits: number, tiresPerUnit: number, tirePriceIdr: number): number {
  return Math.max(0, criticalUnits) * tiresPerUnit * tirePriceIdr;
}

/** Estimasi kerugian produksi bila ban kritis tak ditangani (downtime × nilai produksi/hari). */
export function productionLossIdr(criticalUnits: number, p: OpsParams): number {
  return Math.max(0, criticalUnits) * p.downtimeDaysPerCriticalUnit * p.productionValuePerUnitPerDayIdr;
}

export interface CoalQuota {
  targetT: number;
  loadedT: number;
  pct: number;
}

/** Kuota target produksi harian (HD785 coal) + progres dari massa coal dimuat. */
export function coalQuota(loadedT: number, p: OpsParams): CoalQuota {
  const targetT = p.dailyCoalTargetT;
  return { targetT, loadedT, pct: targetT > 0 ? loadedT / targetT : 0 };
}
