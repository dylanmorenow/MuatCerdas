import { describe, it, expect } from "vitest";
import { classifyPayload, payloadStats } from "../payload/analytics";
import type { PayloadEvent } from "../types";

const T = 91_000; // target 91 t

const ev = (
  id: string,
  unitId: string,
  operatorId: string,
  kg: number,
): PayloadEvent => ({
  id,
  unitId,
  operatorId,
  timestamp: "2026-06-01T00:00:00Z",
  measuredPayloadKg: kg,
  targetPayloadKg: T,
  status: "ok", // sengaja salah/diabaikan — analitik menghitung dari measured/target
});

// SR-V1: <85% under · 85–100% ok · >100% over.
describe("classifyPayload SR-V1 (batas)", () => {
  it("<85% → under", () => expect(classifyPayload(76_000, T)).toBe("under")); // 83,5%
  it("=85% → ok (inklusif)", () => expect(classifyPayload(0.85 * T, T)).toBe("ok"));
  it("=100% → ok (inklusif)", () => expect(classifyPayload(T, T)).toBe("ok"));
  it(">100% → over", () => expect(classifyPayload(91_100, T)).toBe("over"));
  it("target ≤ 0 → error", () => expect(() => classifyPayload(1000, 0)).toThrow());
});

describe("payloadStats §12.3", () => {
  const events = [
    ev("1", "HD-1", "OP-1", 70_000), // under (76,9%)
    ev("2", "HD-1", "OP-1", 90_000), // ok (98,9%)
    ev("3", "HD-2", "OP-2", 86_000), // ok (94,5%)
    ev("4", "HD-2", "OP-2", 98_000), // over (107,7%)
  ];
  const s = payloadStats(events);

  it("hitung jumlah & % under/ok/over", () => {
    expect(s.count).toBe(4);
    expect(s.underCount).toBe(1);
    expect(s.okCount).toBe(2);
    expect(s.overCount).toBe(1);
    expect(s.underPct).toBeCloseTo(0.25, 6);
    expect(s.okPct).toBeCloseTo(0.5, 6);
    expect(s.overPct).toBeCloseTo(0.25, 6);
  });
  it("mean payload (kg) & stdev > 0", () => {
    expect(s.mean).toBe(86_000);
    expect(s.stdev).toBeGreaterThan(0);
  });
  it("mengabaikan event.status tersimpan", () => {
    const wrong = payloadStats([ev("9", "HD-9", "OP-9", 60_000)]); // 0,66 → under
    expect(wrong.underCount).toBe(1);
    expect(wrong.overCount).toBe(0);
  });
  it("groupBy unit menghitung ulang per irisan", () => {
    const g = payloadStats(events, "unit");
    expect(g.byGroup?.["HD-1"]?.count).toBe(2);
    expect(g.byGroup?.["HD-1"]?.underCount).toBe(1);
    expect(g.byGroup?.["HD-2"]?.overCount).toBe(1);
  });
  it("groupBy operator", () => {
    const g = payloadStats(events, "operator");
    expect(g.byGroup?.["OP-2"]?.overCount).toBe(1);
  });
  it("kosong → nol aman (tak crash)", () => {
    const e = payloadStats([]);
    expect(e.count).toBe(0);
    expect(e.mean).toBe(0);
    expect(e.underPct).toBe(0);
  });
});
