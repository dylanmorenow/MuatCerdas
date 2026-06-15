// Modul D — peta kondisi jalan (prototipe konsep LIDAR, FR-0004-5/6/7). Sumber = data contoh
// (RoadSegment) yang MEWAKILI keluaran LIDAR; BUKAN feed live. conditionScore di sini nyata
// dipakai Modul A (eksposur jalan ban). Batas integrasi: adapter `RoadMapSource`.

import { conditionLabel, type RoadCondition } from "@muatcerdas/shared";
import { prisma } from "../db";

/** Stempel "terakhir diperbarui" = SIMULASI (bukan waktu nyata feed live). */
const MAP_LAST_UPDATED = "2026-06-14T05:30:00.000Z";

export interface RoadMapSegment {
  id: string;
  name: string;
  surface: string;
  lengthKm: number;
  conditionScore: number;
  condition: RoadCondition;
}

export interface RoadMapData {
  segments: RoadMapSegment[];
  /** Truk ber-LIDAR (asumsi: lead + last). */
  mappers: { leadUnitId: string | null; lastUnitId: string | null };
  lastUpdated: string;
  source: string; // "simulasi"
}

/** Pilih truk pemeta lead/last (murni). */
export function pickMappers(haulUnitIds: string[]): { leadUnitId: string | null; lastUnitId: string | null } {
  if (haulUnitIds.length === 0) return { leadUnitId: null, lastUnitId: null };
  return { leadUnitId: haulUnitIds[0] ?? null, lastUnitId: haulUnitIds[haulUnitIds.length - 1] ?? null };
}

/**
 * Batas integrasi (FR-0004-7): adapter sumber peta. Implementasi saat ini membaca `RoadSegment`
 * dari DB (mewakili keluaran LIDAR). Adapter LIDAR nyata dapat menggantikan tanpa mengubah Modul A/C.
 */
export interface RoadMapSource {
  read(): Promise<RoadMapData>;
}

export const seededRoadMapSource: RoadMapSource = {
  async read() {
    const [segments, haulUnits] = await Promise.all([
      prisma.roadSegment.findMany({ orderBy: { id: "asc" } }),
      prisma.unit.findMany({ where: { category: "haul_truck" }, select: { id: true }, orderBy: { id: "asc" } }),
    ]);
    return {
      segments: segments.map((s) => ({
        id: s.id,
        name: s.name,
        surface: s.surface,
        lengthKm: s.lengthKm,
        conditionScore: s.conditionScore,
        condition: conditionLabel(s.conditionScore),
      })),
      mappers: pickMappers(haulUnits.map((u) => u.id)),
      lastUpdated: MAP_LAST_UPDATED,
      source: "simulasi",
    };
  },
};

export async function getRoadMap(): Promise<RoadMapData> {
  return seededRoadMapSource.read();
}

/**
 * Update conditionScore segmen (admin). Nilai ini LANGSUNG dipakai service tire (Modul A)
 * untuk eksposur jalan → prediksi umur ban ikut berubah (FR-0004-6/AC#5).
 */
export async function updateSegmentCondition(segmentId: string, conditionScore: number): Promise<RoadMapSegment> {
  if (!Number.isFinite(conditionScore) || conditionScore < 0 || conditionScore > 1) {
    throw new Error("conditionScore harus 0..1");
  }
  const s = await prisma.roadSegment.update({ where: { id: segmentId }, data: { conditionScore } });
  return {
    id: s.id,
    name: s.name,
    surface: s.surface,
    lengthKm: s.lengthKm,
    conditionScore: s.conditionScore,
    condition: conditionLabel(s.conditionScore),
  };
}
