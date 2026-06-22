import { describe, it, expect } from "vitest";
import { payloadTrend, payloadHistogram, deriveUnitShiftOperators } from "../services/payload";
import type { PayloadEvent } from "@muatcerdas/shared";

const T = 91_000;
const ev = (id: string, unitId: string, kg: number, ts: string): PayloadEvent => ({
  id,
  unitId,
  operatorId: "OP",
  timestamp: ts,
  measuredPayloadKg: kg,
  targetPayloadKg: T,
  status: "ok",
});

describe("payloadTrend (helper murni)", () => {
  const events = [
    ev("1", "HD-1", 86_000, "2026-06-01T08:00:00Z"), // ok (94,5%)
    ev("2", "HD-1", 90_000, "2026-06-01T10:00:00Z"), // ok (98,9%)
    ev("3", "HD-2", 70_000, "2026-06-02T09:00:00Z"), // under (76,9%)
    ev("4", "HD-2", 100_000, "2026-06-02T11:00:00Z"), // over (109,9%)
  ];
  const t = payloadTrend(events);

  it("kelompokkan per tanggal & terurut", () => {
    expect(t.length).toBe(2);
    expect(t[0]?.date).toBe("2026-06-01");
    expect(t[1]?.date).toBe("2026-06-02");
  });

  it("mean & komposisi status per hari", () => {
    expect(t[0]?.count).toBe(2);
    expect(t[0]?.mean).toBe(88_000);
    expect(t[0]?.okPct).toBeCloseTo(1, 6);
    expect(t[1]?.underPct).toBeCloseTo(0.5, 6);
    expect(t[1]?.overPct).toBeCloseTo(0.5, 6);
  });
});

describe("payloadHistogram (helper murni)", () => {
  const events = [
    ev("1", "HD-1", 56_000, "t"), // 55–60
    ev("2", "HD-1", 91_000, "t"), // 90–95
    ev("3", "HD-1", 92_000, "t"), // 90–95
    ev("4", "HD-1", 130_000, "t"), // di atas → clamp bin terakhir
  ];
  const h = payloadHistogram(events, 5_000, 55_000, 120_000);

  it("hitung per bin & clamp di luar rentang", () => {
    const find = (label: string) => h.find((b) => b.label === label)?.count ?? 0;
    expect(find("55–60")).toBe(1);
    expect(find("90–95")).toBe(2);
    expect(h[h.length - 1]?.count).toBe(1); // 130 t clamp
  });

  it("total bin = jumlah event", () => {
    expect(h.reduce((s, b) => s + b.count, 0)).toBe(events.length);
  });
});

describe("deriveUnitShiftOperators (operator per unit per shift)", () => {
  const operators = [
    { id: "OP-1", name: "Andi", shift: "day" },
    { id: "OP-2", name: "Budi", shift: "night" },
    { id: "OP-3", name: "Citra", shift: "day" },
  ];
  it("ambil operator dominan per shift per unit", () => {
    const events = [
      { unitId: "HD-1", operatorId: "OP-1" },
      { unitId: "HD-1", operatorId: "OP-1" },
      { unitId: "HD-1", operatorId: "OP-3" }, // day minor
      { unitId: "HD-1", operatorId: "OP-2" }, // night
    ];
    const r = deriveUnitShiftOperators(events, operators);
    expect(r["HD-1"]).toEqual({ day: "Andi", night: "Budi" });
  });
  it("shift tanpa operator → null", () => {
    const r = deriveUnitShiftOperators([{ unitId: "HD-2", operatorId: "OP-1" }], operators);
    expect(r["HD-2"]).toEqual({ day: "Andi", night: null });
  });
});
