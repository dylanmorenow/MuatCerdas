// Lapisan TELEMETRI GPS REAL-TIME (Teltonika FMB-class) — DIASUMSIKAN sudah terintegrasi di tiap
// unit. Memberi posisi & KECEPATAN AKTUAL tiap unit dari "perpindahan koordinat" — sumber kebenaran
// kecepatan yang dibaca SELURUH sistem (driver & admin), MENGGANTIKAN angka spidometer bawaan yang
// sering melenceng karena keausan/tekanan ban. Kecepatan aktual wajar ≤ 45 km/jam.
//
// Adapter `TelemetrySource` memisahkan sumber data dari domain: di sini generator deterministik
// mewakili aliran fix GNSS real-time dari perangkat Teltonika FMB yang terpasang; bila kelak
// disambung ke feed perangkat/FMS lain, cukup ganti adapter tanpa mengubah Modul A/B/C.

import { groundSpeedFromFixes, type GpsFix } from "@muatcerdas/shared";
import { prisma } from "../db";

export interface UnitTelemetry {
  unitId: string;
  area: "haul" | "site";
  /** Posisi sepanjang rute (km dari titik awal) — untuk penanda gerak di peta skematik. */
  progressKm: number;
  routeLengthKm: number;
  /** Kecepatan aktual GPS (km/jam) dari perpindahan koordinat (shared.groundSpeedFromFixes). */
  groundSpeedKmh: number;
  lat: number;
  lng: number;
  capturedAt: string;
}

export interface TelemetrySource {
  read(nowMs?: number): Promise<UnitTelemetry[]>;
}

// Koordinat rute = PLACEHOLDER simulasi di sekitar site Indexim Coalindo (Kalimantan Timur).
// Diganti geometri rute nyata saat feed GNSS/FMS tersambung.
const AREA_GEO: Record<"haul" | "site", { start: { lat: number; lng: number }; end: { lat: number; lng: number } }> = {
  haul: { start: { lat: 0.512, lng: 117.62 }, end: { lat: 0.74, lng: 117.49 } }, // KM 33 (CPP) → Jetty
  site: { start: { lat: 0.49, lng: 117.66 }, end: { lat: 0.515, lng: 117.64 } }, // loading point → disposal in-pit
};

const DT_MS = 5_000; // jarak antar fix untuk hitung kecepatan (mewakili sampling GNSS)

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619;
  return Math.abs(h >>> 0);
}

/** Posisi (km) = integral eksak dari v(t)=vmid+amp·sin(ωt+φ), lalu dipantulkan jadi pulang-pergi. */
function posKmAt(tHours: number, vmid: number, amp: number, wPerHour: number, phase: number): number {
  return vmid * tHours - (amp / wPerHour) * Math.cos(wPerHour * tHours + phase);
}
function reflect(x: number, L: number): number {
  const period = 2 * L;
  const m = ((x % period) + period) % period;
  return m <= L ? m : period - m;
}
function geoAt(area: "haul" | "site", frac: number): { lat: number; lng: number } {
  const f = Math.min(1, Math.max(0, frac));
  const g = AREA_GEO[area];
  return { lat: g.start.lat + (g.end.lat - g.start.lat) * f, lng: g.start.lng + (g.end.lng - g.start.lng) * f };
}

/** Simulasikan satu unit pada waktu now (deterministik per unitId + waktu). MURNI-ish (hanya math). */
function simulateUnit(unitId: string, area: "haul" | "site", routeLengthKm: number, nowMs: number): UnitTelemetry {
  const seed = hash(unitId);
  const phase = ((seed % 1000) / 1000) * 2 * Math.PI;
  const vmid = 24 + (seed % 7); // 24..30 km/jam — kecepatan jelajah realistis
  const amp = 6 + (seed % 4); // 6..9 km/jam ayunan (naik-turun terbaca); puncak ≤ 39 km/jam
  const periodHours = 300 / 3600; // ayunan ~5 menit
  const wPerHour = (2 * Math.PI) / periodHours;
  const L = Math.max(1, routeLengthKm);

  const tH = nowMs / 3_600_000;
  const prevH = (nowMs - DT_MS) / 3_600_000;
  const progNow = reflect(posKmAt(tH, vmid, amp, wPerHour, phase), L);
  const progPrev = reflect(posKmAt(prevH, vmid, amp, wPerHour, phase), L);

  const fixNow: GpsFix = { ...geoAt(area, progNow / L), atMs: nowMs };
  const fixPrev: GpsFix = { ...geoAt(area, progPrev / L), atMs: nowMs - DT_MS };
  // Kecepatan aktual dari perpindahan koordinat (metode GNSS sebenarnya). Batas wajar 45 km/jam.
  const speed = Math.min(45, groundSpeedFromFixes(fixPrev, fixNow));

  return {
    unitId,
    area,
    progressKm: Math.round(progNow * 100) / 100,
    routeLengthKm: Math.round(L * 10) / 10,
    groundSpeedKmh: Math.round(speed * 10) / 10,
    lat: fixNow.lat,
    lng: fixNow.lng,
    capturedAt: new Date(nowMs).toISOString(),
  };
}

async function routeLengthByArea(): Promise<Record<"haul" | "site", number>> {
  const rows = await prisma.roadSegment.groupBy({ by: ["area"], _sum: { lengthKm: true } });
  const out: Record<"haul" | "site", number> = { haul: 35, site: 8 };
  for (const r of rows) {
    if (r.area === "haul" || r.area === "site") out[r.area] = r._sum.lengthKm ?? out[r.area];
  }
  return out;
}

/** Sumber telemetri default: SIMULASI GNSS deterministik. Ganti dengan adapter feed nyata kelak. */
export const simulatedTelemetrySource: TelemetrySource = {
  async read(nowMs = Date.now()): Promise<UnitTelemetry[]> {
    const [units, lenByArea] = await Promise.all([
      prisma.unit.findMany({ select: { id: true, category: true } }),
      routeLengthByArea(),
    ]);
    return units.map((u) => {
      const area: "haul" | "site" = u.category === "pit_dumper" ? "site" : "haul";
      return simulateUnit(u.id, area, lenByArea[area], nowMs);
    });
  },
};

let activeSource: TelemetrySource = simulatedTelemetrySource;

/** Peta telemetri terkini per unitId. Dipakai service speed/driver/roadmap (satu sumber kebenaran). */
export async function getFleetTelemetry(nowMs = Date.now()): Promise<Map<string, UnitTelemetry>> {
  const list = await activeSource.read(nowMs);
  return new Map(list.map((t) => [t.unitId, t]));
}
