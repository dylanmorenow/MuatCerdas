import { describe, it, expect } from "vitest";
import {
  clampSpeedKmh,
  speedCeilingForCategory,
  HAUL_SPEED_CEILING_KMH,
  HD785_SPEED_CEILING_KMH,
} from "../speed/ceiling";

describe("clampSpeedKmh — batas atas absolut kecepatan", () => {
  it("di atas batas → dipotong ke batas (truk kosong 55 → 45)", () => {
    expect(clampSpeedKmh(55, HAUL_SPEED_CEILING_KMH)).toBe(45);
  });
  it("di bawah batas → apa adanya (muatan berat 28 → 28)", () => {
    expect(clampSpeedKmh(28, HAUL_SPEED_CEILING_KMH)).toBe(28);
  });
  it("tepat di batas → batas", () => {
    expect(clampSpeedKmh(45, HAUL_SPEED_CEILING_KMH)).toBe(45);
  });
  it("HD785: di atas 50 → 50, di bawah → apa adanya", () => {
    expect(clampSpeedKmh(58, HD785_SPEED_CEILING_KMH)).toBe(50);
    expect(clampSpeedKmh(33, HD785_SPEED_CEILING_KMH)).toBe(33);
  });
  it("tak hingga / NaN → batas (tahan-banting)", () => {
    expect(clampSpeedKmh(Infinity, HAUL_SPEED_CEILING_KMH)).toBe(45);
    expect(clampSpeedKmh(NaN, HD785_SPEED_CEILING_KMH)).toBe(50);
  });
});

describe("speedCeilingForCategory", () => {
  it("haul_truck → 45", () => expect(speedCeilingForCategory("haul_truck")).toBe(45));
  it("pit_dumper (HD785) → 50", () => expect(speedCeilingForCategory("pit_dumper")).toBe(50));
});
