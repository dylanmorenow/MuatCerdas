// Revisi akhir (ADMIN-8) — kondisi jalan per zona operasi. Memengaruhi kecepatan aman unit
// di zona itu (selain muatan). Settings: satu baris per zona (cpp/tengah/jetty).

import { ROAD_OPS_CONDITIONS, type RoadOpsCondition } from "@muatcerdas/shared";
import { prisma } from "../db";

// cpp/tengah/jetty = rute hauling (truk hauling). site = rute in-pit (HD785).
export const ZONES = ["cpp", "tengah", "jetty", "site"] as const;
export type Zone = (typeof ZONES)[number];

export const ZONE_LABEL: Record<string, string> = {
  cpp: "Hauling — dekat CPP (KM 33)",
  tengah: "Hauling — tengah rute",
  jetty: "Hauling — dekat Jetty",
  site: "Site in-pit Indexim (HD785)",
};

export interface ZoneConditionRow {
  zone: string;
  condition: string;
}

export async function getZoneConditions(): Promise<ZoneConditionRow[]> {
  const rows = await prisma.zoneCondition.findMany();
  const byZone = new Map(rows.map((r) => [r.zone, r.condition]));
  // Pastikan ketiga zona selalu ada (default normal).
  return ZONES.map((zone) => ({ zone, condition: byZone.get(zone) ?? "normal" }));
}

/** Map zona → kondisi (untuk dipakai service speed). */
export async function zoneConditionMap(): Promise<Record<string, RoadOpsCondition>> {
  const rows = await getZoneConditions();
  const out: Record<string, RoadOpsCondition> = {};
  for (const r of rows) out[r.zone] = r.condition as RoadOpsCondition;
  return out;
}

export async function setZoneCondition(zone: string, condition: string): Promise<ZoneConditionRow> {
  if (!ZONES.includes(zone as Zone)) throw new Error(`Zona '${zone}' tak dikenal`);
  if (!ROAD_OPS_CONDITIONS.includes(condition as RoadOpsCondition)) {
    throw new Error(`Kondisi '${condition}' tak dikenal`);
  }
  return prisma.zoneCondition.upsert({
    where: { zone },
    create: { zone, condition },
    update: { condition },
  });
}
