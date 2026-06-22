// Kecepatan AKTUAL dari GPS (bukan spidometer). Fungsi MURNI & deterministik — tidak menyentuh
// DB/UI/perangkat. Dipakai Modul C (kecepatan aman) & surface driver: "seluruh sistem membaca
// kecepatan aktual berbasis perpindahan koordinat GPS, bukan angka spidometer yang bisa melenceng
// karena keausan/tekanan ban". Sumber data = adapter telemetri (simulasi sekarang, GNSS/FMS nanti).
import type { HazardType } from "../hazard";

/** Satu titik GPS bertimestamp (lintang/bujur derajat, waktu epoch ms). */
export interface GpsFix {
  lat: number;
  lng: number;
  atMs: number;
}

const EARTH_R_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Jarak haversine antar dua titik GPS (km). Murni & teruji. */
export function haversineKm(a: GpsFix, b: GpsFix): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * Kecepatan ground (km/jam) DARI perpindahan koordinat: jarak haversine ÷ selisih waktu.
 * Inilah "kecepatan aktual" yang dipakai sistem — sama prinsipnya dengan yang dihitung
 * unit GNSS di truk. Mengembalikan 0 bila selisih waktu tak valid (≤ 0).
 */
export function groundSpeedFromFixes(prev: GpsFix, next: GpsFix): number {
  const dtHours = (next.atMs - prev.atMs) / 3_600_000;
  if (dtHours <= 0) return 0;
  return haversineKm(prev, next) / dtHours;
}

export type SpeedActualStatus = "ok" | "near" | "over" | "none";

/** Ambang "mendekati batas" — ASUMSI editable. ≥90% batas aman = waspada, >100% = melanggar. */
export const NEAR_SAFE_RATIO = 0.9;

/**
 * Status kecepatan AKTUAL terhadap batas aman ban (Vmax_safe basis travel/spidometer).
 * Membandingkan apel-ke-apel: kecepatan aktual GPS sesaat vs batas aman sesaat. (§C.6)
 */
export function actualVsSafeStatus(actualKmh: number, vmaxSafeKmh: number): SpeedActualStatus {
  if (!Number.isFinite(actualKmh) || !Number.isFinite(vmaxSafeKmh) || vmaxSafeKmh <= 0) return "none";
  const ratio = actualKmh / vmaxSafeKmh;
  if (ratio > 1) return "over";
  if (ratio >= NEAR_SAFE_RATIO) return "near";
  return "ok";
}

export type ProximityStatus = "clear" | "approaching" | "in_zone";

export interface ProximityHazard {
  positionKm: number;
  type?: HazardType;
  urgent?: boolean;
}

export interface HazardProximity {
  status: ProximityStatus;
  /** Jarak ke bahaya terdekat (km). null bila tak ada bahaya di rute. */
  distanceKm: number | null;
  type: HazardType | null;
  urgent: boolean;
}

/** Default jarak deteksi (km) — ASUMSI editable. */
export const HAZARD_APPROACH_KM = 0.6;
export const HAZARD_IN_ZONE_KM = 0.12;

/**
 * Kedekatan truk (posisi sepanjang rute, km) ke bahaya peta jalan — dipakai untuk peringatan
 * "mendekati hazard" / "masuk zona hazard" di layar driver, digerakkan oleh posisi GPS.
 */
export function hazardProximity(
  progressKm: number,
  hazards: ProximityHazard[],
  opts: { approachKm?: number; inZoneKm?: number } = {},
): HazardProximity {
  const approachKm = opts.approachKm ?? HAZARD_APPROACH_KM;
  const inZoneKm = opts.inZoneKm ?? HAZARD_IN_ZONE_KM;
  let nearest: ProximityHazard | null = null;
  let nearestDist = Infinity;
  for (const h of hazards) {
    const d = Math.abs(h.positionKm - progressKm);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = h;
    }
  }
  if (!nearest) return { status: "clear", distanceKm: null, type: null, urgent: false };
  const status: ProximityStatus =
    nearestDist <= inZoneKm ? "in_zone" : nearestDist <= approachKm ? "approaching" : "clear";
  return {
    status,
    distanceKm: Math.round(nearestDist * 1000) / 1000,
    type: nearest.type ?? null,
    urgent: nearest.urgent ?? false,
  };
}
