// Seed data realistis & DETERMINISTIK (FR-0002-2 / SR-2, TECH_DESIGN §6).
// Pemetaan unit ditegakkan: ban = Scania/Volvo (haul_truck, Modul A); payload = HD785
// (pit_dumper, Modul B). JANGAN tertukar. Reproducible: PRNG seed tetap + SEED_TODAY tetap.
//
// Jalankan: npm run db:seed -w @muatcerdas/server  (atau via db:setup).

import {
  defaultCostParams,
  defaultSpeedParams,
  defaultTkphCatalog,
  defaultOpsParams,
  classifyPayload,
  conditionScoreFromHazards,
  hazardSeverityWeight,
  hazardLabel,
  HAZARD_TYPES,
  type HazardType,
  type HazardLike,
} from "@muatcerdas/shared";
import { prisma } from "./db";
import { Rng, daysBefore, clamp } from "./lib/random";

const SEED = 20_260_614;
const SEED_TODAY = new Date("2026-06-14T00:00:00.000Z");
const HD785_TARGET_KG = 91_000;
// Ban off-highway HD785 (Modul C panel ringkas) — harus cocok dgn kunci defaultTkphCatalog.
const HD785_TIRE_MODEL = "Bridgestone VRPS 27.00R49";

const rng = new Rng(SEED);

// — Master: model truk hauling (Modul A) —
const HAUL_MODELS = [
  { model: "Scania P410", brandBase: 0, tareKg: 9_000, ratedPayloadKg: 30_000, tireModel: "Michelin X Works Z" },
  { model: "Scania R580", brandBase: 2_000, tareKg: 9_500, ratedPayloadKg: 34_000, tireModel: "Bridgestone M840" },
  { model: "Volvo FH16 6x4T", brandBase: 6_000, tareKg: 9_800, ratedPayloadKg: 33_000, tireModel: "Michelin X Multi D" },
  { model: "Scania 620 XT", brandBase: 4_000, tareKg: 10_000, ratedPayloadKg: 35_000, tireModel: "Bridgestone L355" },
] as const;

const TIRE_POSITIONS = [
  "FL", "FR", "D1L-O", "D1L-I", "D1R-O", "D1R-I", "D2L-O", "D2L-I", "D2R-O", "D2R-I",
] as const;

const REMOVAL_REASONS = ["worn", "worn", "worn", "worn", "cut", "overload", "scheduled"] as const;

const OPERATOR_NAMES = [
  "Budi Santoso", "Agus Pratama", "Slamet Riyadi", "Eko Wibowo",
  "Dedi Kurniawan", "Joko Susilo", "Rudi Hartono", "Bambang Setiawan",
] as const;

// Zona operasi truk hauling (ADMIN-8): dekat CPP, tengah, dekat Jetty.
const ZONES = ["cpp", "tengah", "jetty"] as const;

// Katalog operator excavator (OPERATOR-2): nama + tipe excavator. Dipakai dropdown laporan HD785.
const EXCAVATOR_OPERATORS_SEED = [
  { name: "Yusuf", excavatorType: "PC2000" },
  { name: "Hendra", excavatorType: "PC2000" },
  { name: "Joko", excavatorType: "PC1250" },
  { name: "Rahmat", excavatorType: "PC1250" },
  { name: "Slamet", excavatorType: "PC850" },
  { name: "Wawan", excavatorType: "PC850" },
];

// Rute CPP KM33 → Jetty (~35 km), mayoritas laterit.
const SEGMENTS = [
  { id: "SEG-1", name: "CPP KM33 – Simpang", surface: "laterite", lengthKm: 8, conditionScore: 0.45, loaded: 25, empty: 40 },
  { id: "SEG-2", name: "Tanjakan Laterit", surface: "laterite", lengthKm: 6, conditionScore: 0.35, loaded: 18, empty: 35 },
  { id: "SEG-3", name: "Jalan Batu", surface: "rock", lengthKm: 7, conditionScore: 0.6, loaded: 28, empty: 45 },
  { id: "SEG-4", name: "Laterit Basah", surface: "laterite", lengthKm: 9, conditionScore: 0.4, loaded: 22, empty: 38 },
  { id: "SEG-5", name: "Aspal Jetty", surface: "sealed", lengthKm: 5, conditionScore: 0.85, loaded: 35, empty: 55 },
] as const;

// Rute in-pit site Indexim Coalindo (open-pit) untuk HD785 (~8 km): loading point → disposal.
const SITE_SEGMENTS = [
  { id: "SITE-1", name: "Loading Point (Pit)", surface: "rock", lengthKm: 1.5, conditionScore: 0.4, loaded: 12, empty: 20 },
  { id: "SITE-2", name: "Ramp Pit", surface: "rock", lengthKm: 1.5, conditionScore: 0.35, loaded: 10, empty: 18 },
  { id: "SITE-3", name: "Jalan In-Pit", surface: "laterite", lengthKm: 2, conditionScore: 0.45, loaded: 15, empty: 25 },
  { id: "SITE-4", name: "Simpang Disposal", surface: "laterite", lengthKm: 1.5, conditionScore: 0.4, loaded: 14, empty: 24 },
  { id: "SITE-5", name: "Area Disposal", surface: "rock", lengthKm: 1.5, conditionScore: 0.5, loaded: 12, empty: 22 },
] as const;

type SegDef = { id: string; name: string; surface: string; lengthKm: number; conditionScore: number; loaded: number; empty: number };
function segmentRow(s: SegDef) {
  return {
    id: s.id,
    name: s.name,
    surface: s.surface,
    lengthKm: s.lengthKm,
    conditionScore: s.conditionScore,
    avgSpeedLoadedKmh: s.loaded,
    avgSpeedEmptyKmh: s.empty,
  };
}

const ROUTE_KM = SEGMENTS.reduce((s, x) => s + x.lengthKm, 0);
// Keburukan jalan rute terbobot panjang: Σ len*(1-cond)/Σlen.
const ROUTE_BADNESS =
  SEGMENTS.reduce((s, x) => s + x.lengthKm * (1 - x.conditionScore), 0) / ROUTE_KM;

/**
 * Bagi-km per segmen untuk satu unit menurut kekasaran rute (M4): unit "kasar"
 * menaruh lebih banyak km di segmen laterit (badness tinggi), lebih sedikit di aspal.
 * Hasil bervariasi antar unit → fitur kondisi jalan §12.1 jadi terderivasi dari DB.
 */
function segmentSharesFor(roughness: number): number[] {
  const k = 12;
  const raw = SEGMENTS.map((s) => {
    const badness = 1 - s.conditionScore;
    const emphasis = Math.max(
      0.05,
      1 + (roughness - ROUTE_BADNESS) * k * (badness - ROUTE_BADNESS),
    );
    return s.lengthKm * emphasis;
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((w) => w / sum);
}

/** Keburukan jalan terbobot per-km dari share segmen (== nilai yang nanti diturunkan service). */
function weightedBadness(shares: number[]): number {
  return SEGMENTS.reduce((acc, s, i) => acc + (shares[i] ?? 0) * (1 - s.conditionScore), 0);
}

/** "Umur sebenarnya" ban (km) sebagai fungsi kondisi — generator data latih §12.1. */
function trueLifeKm(
  brandBase: number,
  pressureDev: number,
  roadBadness: number,
  loadIdx: number,
  operatorFactor: number,
): number {
  return (
    118_000 -
    1_200 * pressureDev -
    30_000 * roadBadness -
    20_000 * Math.max(0, loadIdx - 0.9) -
    22_000 * operatorFactor +
    brandBase
  );
}

type Row = Record<string, unknown>;

async function insertChunked<T extends Row>(
  rows: T[],
  fn: (chunk: T[]) => Promise<unknown>,
  size = 500,
): Promise<void> {
  for (let i = 0; i < rows.length; i += size) {
    await fn(rows.slice(i, i + size));
  }
}

async function resetTables(): Promise<void> {
  // Urutan: anak → induk (hormati FK).
  await prisma.tripSegmentExposure.deleteMany();
  await prisma.tripLog.deleteMany();
  await prisma.tireRecord.deleteMany();
  await prisma.payloadEvent.deleteMany();
  await prisma.calibrationRecord.deleteMany();
  await prisma.massInput.deleteMany();
  await prisma.driverEvent.deleteMany();
  await prisma.roadHazard.deleteMany();
  await prisma.resolvedAction.deleteMany();
  await prisma.excavatorOperator.deleteMany();
  await prisma.zoneCondition.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.operator.deleteMany();
  await prisma.roadSegment.deleteMany();
  await prisma.costParams.deleteMany();
  await prisma.speedParams.deleteMany();
  await prisma.tkphCatalog.deleteMany();
  await prisma.user.deleteMany();
  await prisma.opsParams.deleteMany();
}

async function main(): Promise<void> {
  await resetTables();

  // — Operator — aggressiveness tersebar DETERMINISTIK 0,12..0,85. Latent (tak disimpan),
  //   tapi terderivasi lewat kecenderungan overload HD785 (bias payload di bawah) →
  //   jadi sumber faktor operator §12.1 yang independen dari tekanan/muatan.
  const operators = OPERATOR_NAMES.map((name, i) => ({
    id: `OP-${String(i + 1).padStart(2, "0")}`,
    name,
    shift: i % 2 === 0 ? "day" : "night",
    aggr: Number((0.12 + 0.73 * (i / (OPERATOR_NAMES.length - 1))).toFixed(3)),
  }));
  await prisma.operator.createMany({
    data: operators.map((o) => ({ id: o.id, name: o.name, shift: o.shift })),
  });

  // — RoadSegment — dua rute: "haul" (KM33→Jetty) & "site" (in-pit Indexim untuk HD785).
  await prisma.roadSegment.createMany({
    data: [
      ...SEGMENTS.map((s) => ({ ...segmentRow(s), area: "haul" })),
      ...SITE_SEGMENTS.map((s) => ({ ...segmentRow(s), area: "site" })),
    ],
  });

  // — RoadHazard (F3): bahaya "device LiDAR" (SIMULASI) sepanjang rute. Jumlah/severity dikalibrasi
  //   agar conditionScore TURUNAN (shared/hazard.ts) ≈ kondisi tiap segmen (laterit buruk → banyak
  //   pothole/lumpur; batu → batu tajam; aspal → minim). Lalu conditionScore DB diturunkan dari sini
  //   → menyetir Modul A/C (FR-0004-6). Bukan feed LiDAR live.
  const HAZARD_BY_SURFACE: Record<string, HazardType[]> = {
    laterite: ["pothole", "rutting", "mud", "standing_water", "edge_break"],
    rock: ["sharp_rock", "pothole", "washboard"],
    sealed: ["washboard", "spillage"],
  };
  const hazardRows: Row[] = [];
  const routes: readonly (readonly SegDef[])[] = [SEGMENTS, SITE_SEGMENTS];
  for (const route of routes) {
    let segStartKm = 0;
    for (const s of route) {
      const pool = HAZARD_BY_SURFACE[s.surface] ?? HAZARD_TYPES;
      const targetSum = ((0.98 - s.conditionScore) / 0.85) * s.lengthKm; // utk dekati cond asli
      let sum = 0;
      let n = 0;
      const segHazards: HazardLike[] = [];
      while (sum < targetSum && n < 14) {
        const type = rng.pick(pool);
        const severity = Number(clamp(rng.gaussian(0.7, 0.15), 0.3, 1).toFixed(2));
        // Perkiraan lebar jalan yang tertutup bahaya (0..1). Mendesak bila parah & menutupi
        // sebagian besar jalan → perlu tindakan segera (ADMIN-2).
        const coveragePct = Number(clamp(rng.gaussian(0.4, 0.22), 0.05, 1).toFixed(2));
        const urgent = severity >= 0.8 && coveragePct >= 0.6;
        segHazards.push({ type, segmentId: s.id, severity });
        hazardRows.push({
          id: `HZ-${s.id}-${String(n + 1).padStart(2, "0")}`,
          type,
          segmentId: s.id,
          positionKm: Number((segStartKm + rng.range(0.3, Math.max(0.4, s.lengthKm - 0.3))).toFixed(1)),
          severity,
          coveragePct,
          urgent,
          detectedAt: daysBefore(SEED_TODAY, rng.int(0, 6)),
          source: "camera_ai",
        });
        sum += hazardSeverityWeight(type) * severity;
        n++;
      }
      // conditionScore DB = turunan dari bahaya (bukan konstanta/slider manual).
      await prisma.roadSegment.update({
        where: { id: s.id },
        data: { conditionScore: conditionScoreFromHazards(segHazards, s.lengthKm) },
      });
      segStartKm += s.lengthKm;
    }
  }
  await insertChunked(hazardRows, (c) => prisma.roadHazard.createMany({ data: c as never }));

  // — Unit: 30 haul_truck (Modul A) + 12 HD785 (Modul B) —
  const HAUL_COUNT = 30;
  const HD785_COUNT = 12;

  interface HaulTruck {
    id: string;
    model: (typeof HAUL_MODELS)[number];
    pressureBase: number;
    loadIndex: number;
    primaryOperatorId: string;
    operatorFactor: number; // = aggr operator utama (penggerak "benar" keausan)
    roadBadness: number; // keburukan jalan terbobot unit (== terderivasi dari exposure)
    segShares: number[]; // share km per indeks SEGMENTS
    currentSetAgeDays: number; // usia set ban terpasang → currentKm bervariasi (sebagian dekat habis)
    tirePriceIdr: number;
  }

  const haulTrucks: HaulTruck[] = [];
  const unitRows: Row[] = [];

  for (let i = 0; i < HAUL_COUNT; i++) {
    const model = HAUL_MODELS[i % HAUL_MODELS.length]!;
    const id = `HT-${String(i + 1).padStart(2, "0")}`;
    const pressureBase = clamp(rng.range(1, 16), 0, 30); // truk terawat vs buruk
    const loadIndex = clamp(rng.gaussian(0.95, 0.08), 0.78, 1.18);
    const primaryOp = operators[i % operators.length]!; // sebar operator utama ke armada
    const segShares = segmentSharesFor(rng.range(0.3, 0.7)); // profil rute per unit
    const roadBadness = weightedBadness(segShares);
    // Usia set ban terpasang (hari) — sebar merata dalam jendela clamp currentTireKm
    // agar sisa umur tersebar mulus (sebagian unit due/critical, sebagian masih ok).
    const currentSetAgeDays = rng.int(40, 310);
    const tirePriceIdr = 20_000_000;
    haulTrucks.push({
      id,
      model,
      pressureBase,
      loadIndex,
      primaryOperatorId: primaryOp.id,
      operatorFactor: primaryOp.aggr,
      roadBadness,
      segShares,
      currentSetAgeDays,
      tirePriceIdr,
    });
    unitRows.push({
      id,
      category: "haul_truck",
      model: model.model,
      tareKg: model.tareKg,
      ratedPayloadKg: model.ratedPayloadKg,
      tiresCount: 10,
      tireModel: model.tireModel,
      tirePriceIdr,
      kmPerYear: 100_000,
      zone: ZONES[i % ZONES.length], // bagi merata ke 3 zona operasi (ADMIN-8)
    });
  }

  interface Dumper {
    id: string;
    meanFactor: number;
    stdevKg: number;
  }
  const dumpers: Dumper[] = [];
  for (let i = 0; i < HD785_COUNT; i++) {
    const id = `HD-${String(i + 1).padStart(2, "0")}`;
    dumpers.push({
      id,
      meanFactor: rng.range(0.97, 1.06), // sebagian cenderung under, sebagian over
      stdevKg: rng.range(4_000, 7_000),
    });
    unitRows.push({
      id,
      category: "pit_dumper",
      model: "Komatsu HD785-7",
      tareKg: 75_000,
      ratedPayloadKg: HD785_TARGET_KG,
      tiresCount: 6,
      tireModel: HD785_TIRE_MODEL,
      tirePriceIdr: null,
      kmPerYear: null,
      // Modul B/Dashboard: HD-01..08 angkut batubara, HD-09..12 overburden.
      material: i < 8 ? "coal" : "overburden",
    });
  }
  await insertChunked(unitRows, (c) => prisma.unit.createMany({ data: c as never }));

  // — TireRecord (Modul A): ban yang sudah dilepas (registry lifecycle) —
  const tireRows: Row[] = [];
  for (const t of haulTrucks) {
    const count = rng.int(8, 12);
    for (let n = 0; n < count; n++) {
      const pressureDev = clamp(rng.gaussian(t.pressureBase, 3), 0, 30);
      const loadIdx = clamp(rng.gaussian(t.loadIndex, 0.05), 0.7, 1.3);
      // Suku jalan & operator memakai nilai unit yang DB-derivable → regresi §12.1 bisa
      // memulihkan koefisien keempat faktor.
      const life = clamp(
        trueLifeKm(t.model.brandBase, pressureDev, t.roadBadness, loadIdx, t.operatorFactor) +
          rng.gaussian(0, 5_000),
        58_000,
        122_000,
      );
      // Pelepasan TERBARU per unit ≈ usia set sekarang (currentSetAgeDays); sisanya lebih lama.
      const removalDate = daysBefore(SEED_TODAY, t.currentSetAgeDays + rng.int(0, 480));
      const installDate = daysBefore(removalDate, rng.int(150, 420));
      tireRows.push({
        id: `TR-${t.id}-${String(n + 1).padStart(2, "0")}`,
        unitId: t.id,
        position: rng.pick(TIRE_POSITIONS),
        installDate,
        removalDate,
        kmAtRemoval: Math.round(life),
        avgPressureDeviationPct: Number(pressureDev.toFixed(1)),
        loadIndex: Number(loadIdx.toFixed(3)),
        removalReason: rng.pick(REMOVAL_REASONS),
        costIdr: t.tirePriceIdr,
      });
    }
  }
  await insertChunked(tireRows, (c) => prisma.tireRecord.createMany({ data: c as never }));

  // — TripLog + TripSegmentExposure (Modul A): eksposur fitur untuk §12.1 —
  const tripRows: Row[] = [];
  const exposureRows: Row[] = [];
  for (const t of haulTrucks) {
    const trips = rng.int(16, 24);
    for (let n = 0; n < trips; n++) {
      const tripId = `TL-${t.id}-${String(n + 1).padStart(2, "0")}`;
      const roundTrips = rng.int(4, 8);
      const km = roundTrips * ROUTE_KM * 2; // PP
      // ~70% trip oleh operator utama → faktor operator unit terderivasi dari mix operator.
      const operatorId = rng.bool(0.7) ? t.primaryOperatorId : rng.pick(operators).id;
      tripRows.push({
        id: tripId,
        unitId: t.id,
        operatorId,
        date: daysBefore(SEED_TODAY, rng.int(0, 120)),
        km,
        avgPressureDeviationPct: Number(clamp(rng.gaussian(t.pressureBase, 2.5), 0, 30).toFixed(1)),
        payloadIdx: Number(clamp(rng.gaussian(t.loadIndex, 0.04), 0.7, 1.3).toFixed(3)),
      });
      // Eksposur km mengikuti profil rute unit (bukan proporsi panjang seragam).
      SEGMENTS.forEach((s, si) => {
        exposureRows.push({
          id: `EX-${tripId}-${s.id}`,
          tripLogId: tripId,
          segmentId: s.id,
          km: Number((km * (t.segShares[si] ?? 0)).toFixed(1)),
        });
      });
    }
  }
  await insertChunked(tripRows, (c) => prisma.tripLog.createMany({ data: c as never }));
  await insertChunked(exposureRows, (c) => prisma.tripSegmentExposure.createMany({ data: c as never }));

  // — PayloadEvent (Modul B): ~4.000 event vs target 91 t —
  const payloadRows: Row[] = [];
  const EVENTS_PER_UNIT = Math.round(4_000 / HD785_COUNT);
  for (const d of dumpers) {
    for (let n = 0; n < EVENTS_PER_UNIT; n++) {
      const op = rng.pick(operators);
      // Operator agresif memuat lebih berat → overload-rate per operator bervariasi
      // (sumber faktor operator §12.1 yang independen dari fitur ban).
      const opBias = (op.aggr - 0.5) * 0.06;
      const measured = clamp(
        rng.gaussian(HD785_TARGET_KG * (d.meanFactor + opBias), d.stdevKg),
        55_000,
        118_000,
      );
      const measuredKg = Math.round(measured);
      payloadRows.push({
        id: `PE-${d.id}-${String(n + 1).padStart(4, "0")}`,
        unitId: d.id,
        operatorId: op.id,
        timestamp: new Date(
          daysBefore(SEED_TODAY, rng.int(0, 60)).getTime() + rng.int(0, 86_399) * 1_000,
        ),
        measuredPayloadKg: measuredKg,
        targetPayloadKg: HD785_TARGET_KG,
        status: classifyPayload(measuredKg, HD785_TARGET_KG),
      });
    }
  }
  await insertChunked(payloadRows, (c) => prisma.payloadEvent.createMany({ data: c as never }));

  // — MassInput (revisi F2): laporan massa operator HARI INI → Mass Monitoring + kuota coal.
  //   Timestamp NOW-relatif (beberapa jam terakhir) agar dihitung "hari ini" oleh server
  //   (SEED_TODAY dipakai data historis; laporan operasional bersifat real-time).
  //   SUMBER = input operator (disimulasikan). HD785: massa + material + nama operator excavator.
  //   Truk hauling: massa per 2 bucket (batubara).
  const NOW = new Date();
  const EXCAVATOR_OPERATORS = EXCAVATOR_OPERATORS_SEED.map((o) => `${o.name} (${o.excavatorType})`);
  const HD_DRIVERS = [
    "Andi Saputra",
    "Bambang Setiawan",
    "Citra Dewi",
    "Dedi Kurniawan",
    "Eko Wibowo",
    "Fajar Nugroho",
    "Gunawan",
    "Hadi Prasetyo",
  ];
  const massRows: Row[] = [];
  for (let i = 0; i < dumpers.length; i++) {
    const d = dumpers[i]!;
    const material = i < 8 ? "coal" : "overburden";
    const exc = EXCAVATOR_OPERATORS[i % EXCAVATOR_OPERATORS.length]!;
    const driver = HD_DRIVERS[i % HD_DRIVERS.length]!;
    const loads = rng.int(8, 12);
    for (let n = 0; n < loads; n++) {
      const totalKg = clamp(rng.gaussian(HD785_TARGET_KG * d.meanFactor, d.stdevKg), 60_000, 118_000);
      massRows.push({
        id: `MI-${d.id}-${String(n + 1).padStart(3, "0")}`,
        unitId: d.id,
        category: "pit_dumper",
        material,
        totalT: Number((totalKg / 1000).toFixed(1)),
        bucket1T: null,
        bucket2T: null,
        excavatorOperator: exc,
        operatorName: driver,
        timestamp: new Date(NOW.getTime() - rng.int(5, 600) * 60_000), // 5 mnt–10 jam lalu
        source: "operator",
      });
    }
  }
  // Truk hauling: sebagian unit melaporkan massa batubara per 2 bucket.
  for (let i = 0; i < Math.min(8, haulTrucks.length); i++) {
    const h = haulTrucks[i]!;
    const b1 = Number(rng.range(14, 18).toFixed(1));
    const b2 = Number(rng.range(14, 18).toFixed(1));
    massRows.push({
      id: `MI-${h.id}-001`,
      unitId: h.id,
      category: "haul_truck",
      material: "coal",
      totalT: Number((b1 + b2).toFixed(1)),
      bucket1T: b1,
      bucket2T: b2,
      excavatorOperator: null,
      operatorName: `Operator ${h.id}`,
      timestamp: new Date(NOW.getTime() - rng.int(5, 300) * 60_000),
      source: "operator",
    });
  }
  await insertChunked(massRows, (c) => prisma.massInput.createMany({ data: c as never }));

  // — DriverEvent (F3): overspeed & lewat zona bahaya per unit (SIMULASI) → rekomendasi Modul A.
  //   Unit dgn jalan lebih buruk cenderung lebih sering. Deterministik (SEED_TODAY).
  const eventRows: Row[] = [];
  for (const h of haulTrucks) {
    const overspeed = rng.int(0, h.roadBadness > ROUTE_BADNESS ? 4 : 2);
    for (let k = 0; k < overspeed; k++) {
      eventRows.push({
        id: `DE-${h.id}-OS-${k + 1}`,
        unitId: h.id,
        type: "overspeed",
        detail: "Melebihi Vmax aman saat bermuatan (batas TKPH)",
        atKm: Number(rng.range(2, 33).toFixed(1)),
        hazardType: null,
        timestamp: new Date(daysBefore(SEED_TODAY, rng.int(0, 7)).getTime() + rng.int(0, 86_399) * 1000),
        source: "sim",
      });
    }
    const hazards = rng.int(0, 3);
    for (let k = 0; k < hazards; k++) {
      const ht = rng.pick(HAZARD_TYPES);
      eventRows.push({
        id: `DE-${h.id}-HZ-${k + 1}`,
        unitId: h.id,
        type: "hazard",
        detail: `Melewati ${hazardLabel(ht)}`,
        atKm: Number(rng.range(2, 33).toFixed(1)),
        hazardType: ht,
        timestamp: new Date(daysBefore(SEED_TODAY, rng.int(0, 7)).getTime() + rng.int(0, 86_399) * 1000),
        source: "sim",
      });
    }
    // Rem mendadak (ADMIN-6): kecepatan turun drastis tiba-tiba.
    const hardBrake = rng.int(0, h.operatorFactor > 0.55 ? 3 : 1);
    for (let k = 0; k < hardBrake; k++) {
      eventRows.push({
        id: `DE-${h.id}-HB-${k + 1}`,
        unitId: h.id,
        type: "hard_braking",
        detail: "Rem mendadak, kecepatan turun drastis tiba-tiba",
        atKm: Number(rng.range(2, 33).toFixed(1)),
        hazardType: null,
        timestamp: new Date(daysBefore(SEED_TODAY, rng.int(0, 7)).getTime() + rng.int(0, 86_399) * 1000),
        source: "sim",
      });
    }
  }
  await insertChunked(eventRows, (c) => prisma.driverEvent.createMany({ data: c as never }));

  // — CalibrationRecord (Modul B): sebagian perlu kalibrasi (offset/usia) —
  const calibrationRows: Row[] = dumpers.map((d) => ({
    id: `CAL-${d.id}`,
    unitId: d.id,
    lastCalibrationDate: daysBefore(SEED_TODAY, rng.int(5, 170)),
    scaleStudyOffsetPct: Number(clamp(rng.gaussian(0, 4), -9, 9).toFixed(1)),
  }));
  await prisma.calibrationRecord.createMany({ data: calibrationRows as never });

  // — CostParams (settings id=1) dari ASUMSI default (§12) —
  await prisma.costParams.create({ data: { id: 1, ...defaultCostParams } });

  // — OpsParams (settings id=1) — metrik kerugian/risiko Dashboard (ASUMSI baru) —
  await prisma.opsParams.create({ data: { id: 1, ...defaultOpsParams } });

  // — Modul C (M9): SpeedParams (id=1) + katalog TKPH per model ban (WAJIB DICARI) —
  await prisma.speedParams.create({ data: { id: 1, ...defaultSpeedParams } });
  await prisma.tkphCatalog.createMany({
    data: Object.entries(defaultTkphCatalog).map(([tireModel, catalogTkph]) => ({ tireModel, catalogTkph })),
  });

  // — Modul D (M10): User & peran. Admin (kredensial M8) + driver contoh (campur HD785 & haul). —
  // Password = kredensial DEMO (plain) — lihat README. Aktif hanya bila AUTH_ENABLED=true.
  await prisma.user.createMany({
    data: [
      { username: "kpp", password: "muatcerdas", role: "admin", name: "Admin KPP", shift: null, unitId: null },
      { username: "andi", password: "andi123", role: "driver", name: "Andi Saputra", shift: "day", unitId: "HD-01" },
      { username: "budi", password: "budi123", role: "driver", name: "Budi Santoso", shift: "night", unitId: "HT-01" },
      { username: "citra", password: "citra123", role: "driver", name: "Citra Dewi", shift: "day", unitId: "HD-03" },
      { username: "dedi", password: "dedi123", role: "driver", name: "Dedi Kurniawan", shift: "night", unitId: "HT-07" },
    ],
  });

  // — Revisi akhir: katalog operator excavator (OPERATOR-2) + kondisi jalan per zona (ADMIN-8) —
  await prisma.excavatorOperator.createMany({ data: EXCAVATOR_OPERATORS_SEED });
  await prisma.zoneCondition.createMany({ data: [...ZONES, "site"].map((zone) => ({ zone, condition: "normal" })) });

  // — Ringkasan —
  const [units, haul, dump, tires, trips, exposures, payloads, calibrations, massInputs] = await Promise.all([
    prisma.unit.count(),
    prisma.unit.count({ where: { category: "haul_truck" } }),
    prisma.unit.count({ where: { category: "pit_dumper" } }),
    prisma.tireRecord.count(),
    prisma.tripLog.count(),
    prisma.tripSegmentExposure.count(),
    prisma.payloadEvent.count(),
    prisma.calibrationRecord.count(),
    prisma.massInput.count(),
  ]);
  const [hazards, driverEvents] = await Promise.all([prisma.roadHazard.count(), prisma.driverEvent.count()]);
  const [under, ok, over] = await Promise.all([
    prisma.payloadEvent.count({ where: { status: "under" } }),
    prisma.payloadEvent.count({ where: { status: "ok" } }),
    prisma.payloadEvent.count({ where: { status: "over" } }),
  ]);

  console.log("✓ Seed selesai (deterministik).");
  console.table({
    "Unit (total)": units,
    "  haul_truck (Scania/Volvo, ban)": haul,
    "  pit_dumper (HD785, payload)": dump,
    Operator: operators.length,
    "RoadSegment (haul + site)": SEGMENTS.length + SITE_SEGMENTS.length,
    TireRecord: tires,
    TripLog: trips,
    TripSegmentExposure: exposures,
    PayloadEvent: payloads,
    CalibrationRecord: calibrations,
    "MassInput (F2 operator)": massInputs,
    "RoadHazard (kamera AI sim)": hazards,
    "DriverEvent (F3 sim)": driverEvents,
  });
  console.log(`Payload status — under: ${under} · ok: ${ok} · over: ${over}`);
  if (haul !== 30 || dump !== 12) {
    throw new Error(`Pemetaan unit salah! haul_truck=${haul} (≠30), pit_dumper=${dump} (≠12)`);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("✗ Seed gagal:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
