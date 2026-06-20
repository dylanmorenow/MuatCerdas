// Modul D + revisi F3 — peta kondisi jalan dari "device LiDAR" (SIMULASI, FR-0004-5/6/7).
// Bahaya (RoadHazard) mewakili keluaran LiDAR; conditionScore segmen DITURUNKAN dari bahaya
// (shared/hazard.ts) lalu dipersist ke RoadSegment → dipakai Modul A (eksposur ban) & Modul C.
// BUKAN feed live. Batas integrasi: adapter `RoadMapSource`.

import {
  conditionLabel,
  conditionScoreFromHazards,
  type RoadCondition,
  type HazardType,
  type HazardLike,
} from "@muatcerdas/shared";
import { prisma } from "../db";

/** Stempel "terakhir diperbarui" = SIMULASI (bukan waktu nyata feed live). */
const MAP_LAST_UPDATED = "2026-06-14T05:30:00.000Z";

export interface RoadMapHazard {
  id: string;
  type: HazardType;
  segmentId: string;
  positionKm: number;
  severity: number;
  coveragePct: number;
  urgent: boolean;
}

export interface RoadMapSegment {
  id: string;
  name: string;
  surface: string;
  lengthKm: number;
  conditionScore: number;
  condition: RoadCondition;
  hazardCount: number;
}

export interface RoadMapData {
  segments: RoadMapSegment[];
  hazards: RoadMapHazard[];
  routeLengthKm: number;
  /** Truk ber-kamera (asumsi: lead + last). */
  mappers: { leadUnitId: string | null; lastUnitId: string | null };
  lastUpdated: string;
  source: string; // "simulasi"
  /** Label ujung rute untuk peta (berbeda per area). */
  startLabel: string;
  endLabel: string;
}

/** Pilih truk pemeta (murni). Kamera AI hanya di SATU unit terdepan; tak ada pemeta belakang. */
export function pickMappers(haulUnitIds: string[]): { leadUnitId: string | null; lastUnitId: string | null } {
  return { leadUnitId: haulUnitIds[0] ?? null, lastUnitId: null };
}

/**
 * Batas integrasi (FR-0004-7): adapter sumber peta. Implementasi membaca RoadSegment + RoadHazard
 * (mewakili keluaran LiDAR). Adapter LiDAR nyata dapat menggantikan tanpa mengubah Modul A/C.
 */
export type MapArea = "haul" | "site";

export interface RoadMapSource {
  read(area: MapArea): Promise<RoadMapData>;
}

export const seededRoadMapSource: RoadMapSource = {
  async read(area: MapArea) {
    // Truk pemeta kamera AI: rute hauling dipetakan truk hauling; rute site dipetakan HD785.
    const mapperCategory = area === "site" ? "pit_dumper" : "haul_truck";
    const [segments, mapperUnits] = await Promise.all([
      prisma.roadSegment.findMany({ where: { area }, orderBy: { id: "asc" } }),
      prisma.unit.findMany({ where: { category: mapperCategory }, select: { id: true }, orderBy: { id: "asc" } }),
    ]);
    const segIds = segments.map((s) => s.id);
    const hazards = await prisma.roadHazard.findMany({
      where: { segmentId: { in: segIds } },
      orderBy: { positionKm: "asc" },
    });
    const countBySeg = new Map<string, number>();
    for (const h of hazards) countBySeg.set(h.segmentId, (countBySeg.get(h.segmentId) ?? 0) + 1);

    return {
      segments: segments.map((s) => ({
        id: s.id,
        name: s.name,
        surface: s.surface,
        lengthKm: s.lengthKm,
        conditionScore: s.conditionScore,
        condition: conditionLabel(s.conditionScore),
        hazardCount: countBySeg.get(s.id) ?? 0,
      })),
      hazards: hazards.map((h) => ({
        id: h.id,
        type: h.type as HazardType,
        segmentId: h.segmentId,
        positionKm: h.positionKm,
        severity: h.severity,
        coveragePct: h.coveragePct,
        urgent: h.urgent,
      })),
      routeLengthKm: segments.reduce((s, x) => s + x.lengthKm, 0),
      mappers: pickMappers(mapperUnits.map((u) => u.id)),
      lastUpdated: MAP_LAST_UPDATED,
      source: "simulasi",
      startLabel: area === "site" ? "Loading Point" : "KM 33 (CPP)",
      endLabel: area === "site" ? "Disposal · Site Indexim Coalindo" : "Jetty · PT Indexim Coalindo",
    };
  },
};

export async function getRoadMap(area: MapArea = "haul"): Promise<RoadMapData> {
  return seededRoadMapSource.read(area);
}

/**
 * Derivasi & persist conditionScore tiap segmen DARI bahaya LiDAR (FR-0004-6). Nilai ini LANGSUNG
 * dipakai service tire (Modul A) untuk eksposur jalan → prediksi umur ban ikut berubah (AC#5).
 * Mengganti input manual M10: kini bersumber dari "peta LiDAR", bukan slider.
 */
export async function recomputeConditionFromHazards(): Promise<RoadMapData> {
  const [segments, hazards] = await Promise.all([
    prisma.roadSegment.findMany(),
    prisma.roadHazard.findMany(),
  ]);
  const bySeg = new Map<string, HazardLike[]>();
  for (const h of hazards) {
    const arr = bySeg.get(h.segmentId) ?? [];
    arr.push({ type: h.type as HazardType, segmentId: h.segmentId, severity: h.severity });
    bySeg.set(h.segmentId, arr);
  }
  await Promise.all(
    segments.map((s) =>
      prisma.roadSegment.update({
        where: { id: s.id },
        data: { conditionScore: conditionScoreFromHazards(bySeg.get(s.id) ?? [], s.lengthKm) },
      }),
    ),
  );
  return getRoadMap();
}
