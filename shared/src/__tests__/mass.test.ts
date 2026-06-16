import { describe, it, expect } from "vitest";
import {
  latestMassPerUnit,
  summarizeMassByMaterial,
  materialLabel,
  isSameDay,
  materialDensityTPerM3,
  type MassInputLike,
} from "../mass";

const m = (unitId: string, totalT: number, material: string | null, timestamp: string): MassInputLike => ({
  unitId,
  category: "pit_dumper",
  material,
  totalT,
  timestamp,
});

describe("latestMassPerUnit", () => {
  it("ambil laporan terbaru per unit (by timestamp)", () => {
    const inputs = [
      m("HD-01", 90, "coal", "2026-06-16T08:00:00Z"),
      m("HD-01", 95, "coal", "2026-06-16T10:00:00Z"), // terbaru
      m("HD-02", 88, "overburden", "2026-06-16T09:00:00Z"),
    ];
    const latest = latestMassPerUnit(inputs);
    expect(latest["HD-01"]?.totalT).toBe(95);
    expect(latest["HD-02"]?.totalT).toBe(88);
  });
});

describe("summarizeMassByMaterial", () => {
  it("jumlahkan per material & total", () => {
    const inputs = [
      m("HD-01", 90, "coal", "t"),
      m("HD-02", 100, "coal", "t"),
      m("HD-03", 200, "overburden", "t"),
      m("HD-04", 50, null, "t"),
    ];
    const s = summarizeMassByMaterial(inputs);
    expect(s.coalT).toBe(190);
    expect(s.overburdenT).toBe(200);
    expect(s.totalT).toBe(440);
    expect(s.count).toBe(4);
  });
});

describe("materialLabel & densitas", () => {
  it("label Indonesia", () => {
    expect(materialLabel("coal")).toBe("Batubara");
    expect(materialLabel("overburden")).toBe("Overburden");
    expect(materialLabel(null)).toBe("—");
  });
  it("overburden lebih padat dari batubara (ASUMSI)", () => {
    expect(materialDensityTPerM3("overburden")).toBeGreaterThan(materialDensityTPerM3("coal"));
  });
});

describe("isSameDay", () => {
  it("benar utk hari sama, salah utk beda hari", () => {
    const ref = new Date("2026-06-16T12:00:00");
    expect(isSameDay(new Date("2026-06-16T23:30:00"), ref)).toBe(true);
    expect(isSameDay(new Date("2026-06-15T23:30:00"), ref)).toBe(false);
  });
});
