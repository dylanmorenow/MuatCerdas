import { describe, it, expect } from "vitest";
import {
  haversineKm,
  groundSpeedFromFixes,
  actualVsSafeStatus,
  hazardProximity,
} from "../speed/groundSpeed";

describe("groundSpeed — kecepatan aktual dari koordinat GPS", () => {
  it("haversine: ~1.11 km per 0.01° lintang", () => {
    const d = haversineKm({ lat: 0, lng: 0, atMs: 0 }, { lat: 0.01, lng: 0, atMs: 0 });
    expect(d).toBeCloseTo(1.1119, 2);
  });

  it("kecepatan = jarak ÷ waktu (30 km/jam dari 0,5 km dalam 60 dtk)", () => {
    const prev = { lat: 0, lng: 0, atMs: 0 };
    // 0.5 km ke utara ≈ 0.004497° lintang
    const next = { lat: 0.5 / 111.195, lng: 0, atMs: 60_000 };
    expect(groundSpeedFromFixes(prev, next)).toBeCloseTo(30, 0);
  });

  it("selisih waktu tak valid → 0 (tahan-banting)", () => {
    expect(groundSpeedFromFixes({ lat: 0, lng: 0, atMs: 1000 }, { lat: 1, lng: 1, atMs: 1000 })).toBe(0);
  });

  it("status aktual vs batas aman: ok / near / over / none", () => {
    expect(actualVsSafeStatus(20, 30)).toBe("ok"); // 67%
    expect(actualVsSafeStatus(28, 30)).toBe("near"); // 93% ≥ 90%
    expect(actualVsSafeStatus(33, 30)).toBe("over"); // 110%
    expect(actualVsSafeStatus(25, 0)).toBe("none"); // batas tak valid
  });

  it("kedekatan hazard: clear / approaching / in_zone berdasarkan posisi GPS", () => {
    const hazards = [
      { positionKm: 12, type: "pothole" as const, urgent: false },
      { positionKm: 20, type: "sharp_rock" as const, urgent: true },
    ];
    expect(hazardProximity(5, hazards).status).toBe("clear");
    expect(hazardProximity(11.7, hazards).status).toBe("approaching"); // 0.3 km
    const inZone = hazardProximity(20.05, hazards);
    expect(inZone.status).toBe("in_zone"); // 0.05 km ≤ 0.12
    expect(inZone.urgent).toBe(true);
    expect(inZone.type).toBe("sharp_rock");
  });

  it("rute tanpa hazard → clear, jarak null", () => {
    const p = hazardProximity(5, []);
    expect(p.status).toBe("clear");
    expect(p.distanceKm).toBeNull();
  });
});
