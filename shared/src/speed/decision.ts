// §C.6 — Logika keputusan AMAN/KONFLIK + opsi solusi terukur. Sumber: docs/MODULE_C_SPEED.md §C.6.
// Fungsi MURNI & deterministik. Membandingkan HANYA pada basis KERJA-RATA-RATA (Vm) — §C.5.
//
// Penting (kejujuran model): mengurangi waktu tetap TIDAK mengubah vRequiredWork (cycle budget
// tetap); ia hanya memperbaiki kelayakan TRAVEL. Maka tiap opsi ditandai basisnya & opsi yang
// menyelesaikan konflik TKPH (work) dipisah dari opsi kelayakan travel.

export type SpeedDecisionStatus = "safe" | "conflict";

export interface SpeedSolutionOption {
  kind: "add_units" | "lower_target" | "reduce_overload" | "reduce_fixed_time";
  /** "work" = menyelesaikan konflik TKPH; "travel" = memperbaiki kelayakan travel. */
  basis: "work" | "travel";
  /** Label siap-tampil (Bahasa Indonesia). */
  label: string;
  /** Nilai terukur (lihat `unit`). */
  value: number;
  unit: string;
}

export interface SpeedDecisionContext {
  /** Jumlah unit kini → kuantifikasi "tambah unit". */
  unitCount?: number;
  /** Target harian kini (ton/hari) → kuantifikasi "turunkan target". */
  dailyTargetTon?: number;
  /** Relasi Qa(payload) linear utk "kurangi overload" (semua tonne). */
  overload?: {
    /** TKPH_ban (tonne·km/jam). */
    tkphTireValue: number;
    /** Payload kini (tonne). */
    currentPayloadT: number;
    /** Qa pada payload = 0 (tonne). */
    qaAtZeroPayloadT: number;
    /** dQa/dPayload (tonne Qa per tonne payload). */
    qaSlopePerPayloadT: number;
  };
  /** Konteks kelayakan travel utk "kurangi waktu tetap" (basis travel). */
  travel?: {
    cycleTimeAvailableHours: number;
    currentFixedTimeHours: number;
    roundTripKm: number;
    /** Vmax_safe pada basis TRAVEL (km/jam) — sasaran kelayakan. */
    vmaxSafeTravelKmh: number;
  };
}

export interface SpeedDecisionInput {
  /** Basis KERJA-RATA-RATA (km/jam). */
  vRequiredWorkKmh: number;
  vmaxSafeWorkKmh: number;
  context?: SpeedDecisionContext;
}

export interface SpeedDecision {
  status: SpeedDecisionStatus;
  vRequiredWorkKmh: number;
  vmaxSafeWorkKmh: number;
  /** vmaxSafe − vRequired (basis work). Negatif = konflik. */
  marginKmh: number;
  /** Rekomendasi kecepatan kerja (basis work) bila AMAN; null bila KONFLIK. */
  recommendedWorkKmh: number | null;
  options: SpeedSolutionOption[];
}

/**
 * Keputusan §C.6. AMAN bila vRequiredWork ≤ vmaxSafeWork (basis sama).
 * KONFLIK → JANGAN sarankan ngebut; kembalikan opsi terukur.
 */
export function decideSpeed(input: SpeedDecisionInput): SpeedDecision {
  const { vRequiredWorkKmh, vmaxSafeWorkKmh } = input;
  const marginKmh = vmaxSafeWorkKmh - vRequiredWorkKmh;
  const safe = Number.isFinite(vRequiredWorkKmh) && vRequiredWorkKmh <= vmaxSafeWorkKmh;

  if (safe) {
    return {
      status: "safe",
      vRequiredWorkKmh,
      vmaxSafeWorkKmh,
      marginKmh,
      // Jalankan pada V_required (≤ Vmax_safe). Target tercapai & ban awet.
      recommendedWorkKmh: vRequiredWorkKmh,
      options: [],
    };
  }

  const options: SpeedSolutionOption[] = [];
  const ctx = input.context ?? {};
  // Rasio over-kecepatan (≥1 saat konflik). vRequiredWork ∝ tripsPerUnit ∝ target ∝ 1/unitCount.
  const ratio = vmaxSafeWorkKmh > 0 ? vRequiredWorkKmh / vmaxSafeWorkKmh : Infinity;

  // (a) Tambah unit (basis WORK): vRequiredWork ∝ 1/unitCount.
  if (ctx.unitCount && ctx.unitCount > 0 && Number.isFinite(ratio)) {
    const needed = Math.ceil(ctx.unitCount * ratio);
    const extra = Math.max(0, needed - ctx.unitCount);
    if (extra > 0) {
      options.push({
        kind: "add_units",
        basis: "work",
        label: `Tambah ${extra} unit (total ${needed}) agar kecepatan turun ke batas aman`,
        value: extra,
        unit: "unit",
      });
    }
  }

  // (b) Turunkan target (basis WORK): vRequiredWork ∝ dailyTargetTon.
  if (ctx.dailyTargetTon && ctx.dailyTargetTon > 0 && Number.isFinite(ratio) && ratio > 0) {
    const safeTargetTon = Math.floor(ctx.dailyTargetTon / ratio);
    options.push({
      kind: "lower_target",
      basis: "work",
      label: `Turunkan target ke ${safeTargetTon.toLocaleString("id-ID")} t/hari (dari ${ctx.dailyTargetTon.toLocaleString("id-ID")})`,
      value: safeTargetTon,
      unit: "t/hari",
    });
  }

  // (c) Kurangi overload (basis WORK): Qa' ≤ TKPH_ban / vRequiredWork → payload maks.
  if (ctx.overload && Number.isFinite(vRequiredWorkKmh) && vRequiredWorkKmh > 0) {
    const { tkphTireValue, currentPayloadT, qaAtZeroPayloadT, qaSlopePerPayloadT } = ctx.overload;
    const qaMaxT = tkphTireValue / vRequiredWorkKmh;
    const maxPayloadT = qaSlopePerPayloadT > 0 ? (qaMaxT - qaAtZeroPayloadT) / qaSlopePerPayloadT : NaN;
    if (Number.isFinite(maxPayloadT) && maxPayloadT >= 0 && maxPayloadT < currentPayloadT) {
      const reduceT = currentPayloadT - maxPayloadT;
      options.push({
        kind: "reduce_overload",
        basis: "work",
        label: `Batasi muatan ke ${maxPayloadT.toFixed(1)} t (−${reduceT.toFixed(1)} t dari ${currentPayloadT.toFixed(1)} t)`,
        value: Number(maxPayloadT.toFixed(1)),
        unit: "t",
      });
    }
  }

  // (d) Kurangi waktu tetap (basis TRAVEL — kelayakan, BUKAN penyelesai konflik TKPH).
  // Waktu tetap maks agar kecepatan TRAVEL yang dibutuhkan ≤ Vmax_safe (basis travel).
  if (ctx.travel && ctx.travel.vmaxSafeTravelKmh > 0 && Number.isFinite(ctx.travel.cycleTimeAvailableHours)) {
    const { cycleTimeAvailableHours, currentFixedTimeHours, roundTripKm, vmaxSafeTravelKmh } = ctx.travel;
    const neededTravelTimeH = roundTripKm / vmaxSafeTravelKmh;
    const maxFixedTimeH = cycleTimeAvailableHours - neededTravelTimeH;
    if (Number.isFinite(maxFixedTimeH) && maxFixedTimeH >= 0 && maxFixedTimeH < currentFixedTimeHours) {
      const reduceMin = (currentFixedTimeHours - maxFixedTimeH) * 60;
      options.push({
        kind: "reduce_fixed_time",
        basis: "travel",
        label: `Pangkas waktu tetap ${reduceMin.toFixed(0)} mnt/siklus (perbaiki jalan/antrian) agar kecepatan travel layak`,
        value: Number(maxFixedTimeH.toFixed(2)),
        unit: "jam",
      });
    }
  }

  return {
    status: "conflict",
    vRequiredWorkKmh,
    vmaxSafeWorkKmh,
    marginKmh,
    recommendedWorkKmh: null,
    options,
  };
}

/**
 * FR-0003-6 — Umpan ke Modul A (TIDAK mengubah tire/predict.ts). Bila duty melampaui
 * batas TKPH (TKPH_site > TKPH_ban), kelebihan panas memperpendek umur ban. Mengembalikan
 * ESTIMASI pengurangan umur (fraksi 0..1) sebagai overlay transparan & terpisah.
 */
export function tkphLifeAdjustmentPct(
  tkphSiteValue: number,
  tkphTireValue: number,
  sensitivity = 1,
): number {
  if (tkphTireValue <= 0) return 0;
  const over = tkphSiteValue / tkphTireValue - 1;
  return over > 0 ? Math.min(0.5, over * sensitivity) : 0; // cap −50%
}
