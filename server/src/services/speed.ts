// Modul C (Speed/TKPH) — assembly dari DB → engine §C.1–§C.6 (shared). Helper MURNI
// (computeSpeedModel & baris per-unit) dipisah dari orchestrator Prisma agar bisa diuji tanpa DB.
// SR-V3: rantai penuh hanya haul_truck; panel HD785 hanya pit_dumper. Satu sumber rumus = shared.

import {
  criticalTireLoadTonnes,
  qaAtZeroPayloadT,
  qaSlopePerPayloadT,
  workAverageSpeedKmh,
  tkphSite,
  tkphTire,
  vmaxSafeWorkKmh,
  productionSpeed,
  workAvgToTravel,
  decideSpeed,
  speedParamsSchema,
  defaultSpeedParams,
  DEFAULT_TKPH_FALLBACK,
  type SpeedParams,
  type TkphCatalogEntry,
  type SpeedDecision,
  type ProductionSpeedResult,
  latestMassPerUnit,
  roadOpsSpeedFactor,
  roadOpsConditionLabel,
  type RoadOpsCondition,
} from "@muatcerdas/shared";
import { prisma } from "../db";
import { zoneConditionMap } from "./zones";

// ——————————————————————————————————————————————————————————————
// Tipe keluaran
// ——————————————————————————————————————————————————————————————

export interface SpeedUnitRow {
  id: string;
  model: string;
  tireModel: string | null;
  payloadT: number;
  targetT: number;
  qaT: number;
  catalogTkph: number;
  tkphTire: number;
  tkphSite: number;
  vmaxSafeWorkKmh: number;
  /** Driver-facing (basis travel/spidometer). */
  vmaxSafeTravelKmh: number;
  overTarget: boolean;
  /** true bila unit tak sanggup ikut vRequiredWork fleet pada batas amannya. */
  exceedsRequired: boolean;
  /** Alasan singkat (Bahasa Indonesia) untuk panduan driver. */
  reason: string;
  /** Zona operasi & kondisi jalannya (ADMIN-8) — memengaruhi kecepatan aman. */
  zone: string | null;
  zoneCondition: string;
}

export interface Hd785SpeedRow {
  id: string;
  model: string;
  tireModel: string | null;
  payloadT: number;
  targetT: number;
  qaT: number;
  catalogTkph: number;
  tkphTire: number;
  vmaxSafeWorkKmh: number;
  vmaxSafeTravelKmh: number;
  overTarget: boolean;
  reason: string;
}

export interface SpeedOverview {
  params: SpeedParams;
  catalog: TkphCatalogEntry[];
  vmKmh: number;
  /** Agregat armada haul untuk recompute LIVE di client (pola Finance.derived). */
  fleetInputs: { unitCount: number; payloadPerUnitTon: number; avgTareKg: number; avgCatalogTkph: number };
  production: ProductionSpeedResult & { payloadPerUnitTon: number; unitCount: number };
  fleet: {
    representativeQaT: number;
    representativeTkphTire: number;
    vmaxSafeWorkKmh: number;
    vmaxSafeTravelKmh: number;
    decision: SpeedDecision;
  };
  units: SpeedUnitRow[];
  hd785: Hd785SpeedRow[];
}

export interface SpeedUnitInput {
  id: string;
  model: string;
  tireModel: string | null;
  tareKg: number;
  payloadKg: number;
  targetKg: number;
}

export interface SpeedModelInput {
  params: SpeedParams;
  catalog: Map<string, number>;
  haulUnits: SpeedUnitInput[];
  hd785Units: SpeedUnitInput[];
}

// ——————————————————————————————————————————————————————————————
// Helper MURNI
// ——————————————————————————————————————————————————————————————

const round1 = (n: number) => Math.round(n * 10) / 10;
const roundKmh = (n: number) => (Number.isFinite(n) ? Math.round(n * 10) / 10 : n);

function catalogFor(catalog: Map<string, number>, tireModel: string | null): number {
  return (tireModel && catalog.get(tireModel)) || DEFAULT_TKPH_FALLBACK;
}

function reasonText(payloadT: number, targetT: number, vTravel: number): string {
  const v = Number.isFinite(vTravel) ? `${roundKmh(vTravel)} km/jam` : "-";
  if (payloadT > targetT) {
    return `muatan ${round1(payloadT)} t lebih dari target ${round1(targetT)} t, jadi kecepatan maksimum ${v}`;
  }
  return `muatan ${round1(payloadT)} t masih di bawah target ${round1(targetT)} t, jadi kecepatan maksimum ${v}`;
}

/** Baris kecepatan satu unit (haul) — basis work untuk keputusan, travel untuk driver. */
export function buildSpeedUnitRow(args: {
  unit: SpeedUnitInput;
  catalogTkph: number;
  params: SpeedParams;
  vmKmh: number;
  vRequiredWorkKmh: number;
  travelFraction: number;
}): SpeedUnitRow {
  const { unit, catalogTkph, params, vmKmh, vRequiredWorkKmh, travelFraction } = args;
  const { qaT } = criticalTireLoadTonnes({
    tareKg: unit.tareKg,
    payloadKg: unit.payloadKg,
    loadShareHeaviestPosition: params.loadShareHeaviestPosition,
  });
  const tphTire = tkphTire(catalogTkph, params.tempCorrectionFactor, params.siteCorrectionFactor);
  const tphSite = tkphSite(qaT, vmKmh);
  const vWork = vmaxSafeWorkKmh(tphTire, qaT);
  const vTravel = workAvgToTravel(vWork, travelFraction);
  const payloadT = unit.payloadKg / 1000;
  const targetT = unit.targetKg / 1000;
  return {
    id: unit.id,
    model: unit.model,
    tireModel: unit.tireModel,
    payloadT: round1(payloadT),
    targetT: round1(targetT),
    qaT: round1(qaT),
    catalogTkph: Math.round(catalogTkph),
    tkphTire: Math.round(tphTire),
    tkphSite: Math.round(tphSite),
    vmaxSafeWorkKmh: roundKmh(vWork),
    vmaxSafeTravelKmh: roundKmh(vTravel),
    overTarget: unit.payloadKg > unit.targetKg,
    exceedsRequired: Number.isFinite(vRequiredWorkKmh) && vRequiredWorkKmh > vWork,
    reason: reasonText(payloadT, targetT, vTravel),
    zone: null, // diisi getSpeedOverview dari Unit.zone + kondisi jalan (ADMIN-8)
    zoneCondition: "normal",
  };
}

/** Baris HD785 ringkas (panel Modul C) — payload aktual → Vmax_safe. */
export function buildHd785Row(args: {
  unit: SpeedUnitInput;
  catalogTkph: number;
  params: SpeedParams;
  travelFraction: number;
}): Hd785SpeedRow {
  const { unit, catalogTkph, params, travelFraction } = args;
  const { qaT } = criticalTireLoadTonnes({
    tareKg: unit.tareKg,
    payloadKg: unit.payloadKg,
    loadShareHeaviestPosition: params.loadShareHeaviestPosition,
  });
  const tphTire = tkphTire(catalogTkph, params.tempCorrectionFactor, params.siteCorrectionFactor);
  const vWork = vmaxSafeWorkKmh(tphTire, qaT);
  const vTravel = workAvgToTravel(vWork, travelFraction);
  const payloadT = unit.payloadKg / 1000;
  const targetT = unit.targetKg / 1000;
  return {
    id: unit.id,
    model: unit.model,
    tireModel: unit.tireModel,
    payloadT: round1(payloadT),
    targetT: round1(targetT),
    qaT: round1(qaT),
    catalogTkph: Math.round(catalogTkph),
    tkphTire: Math.round(tphTire),
    vmaxSafeWorkKmh: roundKmh(vWork),
    vmaxSafeTravelKmh: roundKmh(vTravel),
    overTarget: unit.payloadKg > unit.targetKg,
    reason: reasonText(payloadT, targetT, vTravel),
  };
}

function mean(xs: number[], fallback = 0): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : fallback;
}

/**
 * Model kecepatan lengkap (MURNI — uji tanpa DB). Keputusan fleet pada basis kerja-rata-rata
 * (representatif rata-rata armada); per-unit dibangun dgn muatan & ban masing-masing.
 */
export function computeSpeedModel(input: SpeedModelInput): SpeedOverview {
  const { params, catalog, haulUnits, hd785Units } = input;
  const vmKmh = workAverageSpeedKmh(params.distancePerShiftKm, params.workHoursPerShift);

  // Representatif armada (haul) untuk rantai produksi.
  const unitCount = haulUnits.length;
  const payloadPerUnitTon = mean(haulUnits.map((u) => u.payloadKg / 1000), 0);
  const avgTareKg = mean(haulUnits.map((u) => u.tareKg), 0);
  const avgCatalog = mean(haulUnits.map((u) => catalogFor(catalog, u.tireModel)), DEFAULT_TKPH_FALLBACK);

  const prod = productionSpeed({
    dailyTargetTon: params.dailyTargetTon,
    payloadPerUnitTon,
    unitCount,
    effectiveWorkHoursPerDay: params.effectiveWorkHoursPerDay,
    fixedTimeHours: params.fixedTimeHours,
    oneWayKm: params.oneWayKm,
  });

  const representativeQaT = criticalTireLoadTonnes({
    tareKg: avgTareKg,
    payloadKg: payloadPerUnitTon * 1000,
    loadShareHeaviestPosition: params.loadShareHeaviestPosition,
  }).qaT;
  const representativeTkphTire = tkphTire(avgCatalog, params.tempCorrectionFactor, params.siteCorrectionFactor);
  const fleetVmaxWork = vmaxSafeWorkKmh(representativeTkphTire, representativeQaT);
  const fleetVmaxTravel = workAvgToTravel(fleetVmaxWork, prod.travelFraction);

  const decision = decideSpeed({
    vRequiredWorkKmh: prod.vRequiredWorkKmh,
    vmaxSafeWorkKmh: fleetVmaxWork,
    context: {
      unitCount,
      dailyTargetTon: params.dailyTargetTon,
      overload: {
        tkphTireValue: representativeTkphTire,
        currentPayloadT: payloadPerUnitTon,
        qaAtZeroPayloadT: qaAtZeroPayloadT(avgTareKg, params.loadShareHeaviestPosition),
        qaSlopePerPayloadT: qaSlopePerPayloadT(params.loadShareHeaviestPosition),
      },
      travel: {
        cycleTimeAvailableHours: prod.cycleTimeAvailableHours,
        currentFixedTimeHours: params.fixedTimeHours,
        roundTripKm: 2 * params.oneWayKm,
        vmaxSafeTravelKmh: fleetVmaxTravel,
      },
    },
  });

  const units = haulUnits
    .map((u) =>
      buildSpeedUnitRow({
        unit: u,
        catalogTkph: catalogFor(catalog, u.tireModel),
        params,
        vmKmh,
        vRequiredWorkKmh: prod.vRequiredWorkKmh,
        travelFraction: prod.travelFraction,
      }),
    )
    .sort((a, b) => a.vmaxSafeWorkKmh - b.vmaxSafeWorkKmh);

  const hd785 = hd785Units
    .map((u) =>
      buildHd785Row({
        unit: u,
        catalogTkph: catalogFor(catalog, u.tireModel),
        params,
        travelFraction: prod.travelFraction,
      }),
    )
    .sort((a, b) => a.vmaxSafeWorkKmh - b.vmaxSafeWorkKmh);

  return {
    params,
    catalog: [...catalog.entries()].map(([tireModel, catalogTkph]) => ({ tireModel, catalogTkph })),
    vmKmh: roundKmh(vmKmh),
    fleetInputs: { unitCount, payloadPerUnitTon, avgTareKg, avgCatalogTkph: avgCatalog },
    production: { ...prod, payloadPerUnitTon, unitCount },
    fleet: {
      representativeQaT: round1(representativeQaT),
      representativeTkphTire: Math.round(representativeTkphTire),
      vmaxSafeWorkKmh: roundKmh(fleetVmaxWork),
      vmaxSafeTravelKmh: roundKmh(fleetVmaxTravel),
      decision,
    },
    units,
    hd785,
  };
}

// ——————————————————————————————————————————————————————————————
// Orchestrator (Prisma)
// ——————————————————————————————————————————————————————————————

async function loadSpeedParams(): Promise<SpeedParams> {
  const row = await prisma.speedParams.findUnique({ where: { id: 1 } });
  if (!row) throw new Error("SpeedParams belum di-seed (jalankan db:seed)");
  const { id: _id, ...params } = row;
  return params;
}

async function loadCatalog(): Promise<Map<string, number>> {
  const rows = await prisma.tkphCatalog.findMany();
  return new Map(rows.map((r) => [r.tireModel, r.catalogTkph]));
}

/**
 * Massa terkini dilaporkan operator (MassInput) per unit, dalam KG. F2: menutup loop —
 * "dengan muatan X (lapor operator), kecepatan maks Y". Kosong bila belum ada laporan
 * (pemanggil fallback ke sumber lama). Mengubah SUMBER input saja, bukan rumus TKPH teruji.
 */
async function operatorMassKgByUnit(): Promise<Map<string, number>> {
  const recs = await prisma.massInput.findMany({ orderBy: { timestamp: "desc" }, take: 1000 });
  const latest = latestMassPerUnit(
    recs.map((r) => ({ unitId: r.unitId, category: r.category, totalT: r.totalT, timestamp: r.timestamp })),
  );
  return new Map(Object.values(latest).map((r) => [r.unitId, r.totalT * 1000]));
}

/** Muatan terkini per unit haul = lapor operator bila ada; jika tidak, payloadIdx × ratedPayloadKg. */
async function haulUnitInputs(massByUnit: Map<string, number>): Promise<SpeedUnitInput[]> {
  const [units, tripAvg] = await Promise.all([
    prisma.unit.findMany({ where: { category: "haul_truck" } }),
    prisma.tripLog.groupBy({ by: ["unitId"], _avg: { payloadIdx: true } }),
  ]);
  const idxByUnit = new Map(tripAvg.map((g) => [g.unitId, g._avg.payloadIdx ?? 1]));
  return units.map((u) => ({
    id: u.id,
    model: u.model,
    tireModel: u.tireModel,
    tareKg: u.tareKg,
    payloadKg: massByUnit.get(u.id) ?? (idxByUnit.get(u.id) ?? 1) * u.ratedPayloadKg,
    targetKg: u.ratedPayloadKg,
  }));
}

/** Muatan terkini per HD785 = lapor operator bila ada; jika tidak, rata-rata PayloadEvent. */
async function hd785UnitInputs(massByUnit: Map<string, number>): Promise<SpeedUnitInput[]> {
  const [units, payloadAvg] = await Promise.all([
    prisma.unit.findMany({ where: { category: "pit_dumper" } }),
    prisma.payloadEvent.groupBy({ by: ["unitId"], _avg: { measuredPayloadKg: true } }),
  ]);
  const kgByUnit = new Map(payloadAvg.map((g) => [g.unitId, g._avg.measuredPayloadKg ?? 0]));
  return units.map((u) => ({
    id: u.id,
    model: u.model,
    tireModel: u.tireModel,
    tareKg: u.tareKg,
    payloadKg: massByUnit.get(u.id) ?? (kgByUnit.get(u.id) || u.ratedPayloadKg),
    targetKg: u.ratedPayloadKg,
  }));
}

/** Zona operasi tiap truk hauling (Unit.zone). */
async function haulZoneByUnit(): Promise<Map<string, string | null>> {
  const units = await prisma.unit.findMany({ where: { category: "haul_truck" }, select: { id: true, zone: true } });
  return new Map(units.map((u) => [u.id, u.zone]));
}

/** Terapkan kondisi jalan zona → turunkan kecepatan aman unit (ADMIN-8). Tak menyentuh rumus TKPH. */
function applyZoneCondition(
  u: SpeedUnitRow,
  zoneByUnit: Map<string, string | null>,
  zoneCond: Record<string, RoadOpsCondition>,
): SpeedUnitRow {
  const zone = zoneByUnit.get(u.id) ?? null;
  const condition = (zone ? zoneCond[zone] : "normal") ?? "normal";
  const factor = roadOpsSpeedFactor(condition);
  if (factor >= 1) return { ...u, zone, zoneCondition: condition };
  const vWork = roundKmh(u.vmaxSafeWorkKmh * factor);
  const vTravel = roundKmh(u.vmaxSafeTravelKmh * factor);
  return {
    ...u,
    vmaxSafeWorkKmh: vWork,
    vmaxSafeTravelKmh: vTravel,
    zone,
    zoneCondition: condition,
    reason: `${u.reason}. Jalan ${roadOpsConditionLabel(condition).toLowerCase()}, kecepatan diturunkan.`,
  };
}

export async function getSpeedOverview(): Promise<SpeedOverview> {
  const [massByUnit, zoneCond, zoneByUnit] = await Promise.all([
    operatorMassKgByUnit(),
    zoneConditionMap(),
    haulZoneByUnit(),
  ]);
  const [params, catalog, haulUnits, hd785Units] = await Promise.all([
    loadSpeedParams(),
    loadCatalog(),
    haulUnitInputs(massByUnit),
    hd785UnitInputs(massByUnit),
  ]);
  const overview = computeSpeedModel({ params, catalog, haulUnits, hd785Units });
  // Kondisi jalan per zona menyetir kecepatan aman tiap unit (selain muatan).
  overview.units = overview.units.map((u) => applyZoneCondition(u, zoneByUnit, zoneCond));
  return overview;
}

export async function getSpeedParams(): Promise<{ params: SpeedParams; catalog: TkphCatalogEntry[] }> {
  const [params, catalog] = await Promise.all([loadSpeedParams(), loadCatalog()]);
  return { params, catalog: [...catalog.entries()].map(([tireModel, catalogTkph]) => ({ tireModel, catalogTkph })) };
}

/** Validasi (speedParamsSchema) → upsert id=1. */
export async function saveSpeedParams(input: unknown): Promise<SpeedParams> {
  const parsed = speedParamsSchema.parse(input); // ZodError → route 400
  const saved = await prisma.speedParams.upsert({
    where: { id: 1 },
    create: { id: 1, ...parsed },
    update: parsed,
  });
  const { id: _id, ...rest } = saved;
  return rest;
}

/** Kembalikan SpeedParams ke asumsi default. */
export async function resetSpeedParams(): Promise<SpeedParams> {
  return saveSpeedParams(defaultSpeedParams);
}
