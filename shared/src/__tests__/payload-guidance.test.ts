import { describe, it, expect } from "vitest";
import { loadingStatus, loadingStatusFromBuckets, bucketsTotal } from "../payload/guidance";

const T = 91_000;

// §12.5 — <85% green · 85–100% amber · >100% red.
describe("loadingStatus §12.5 (batas)", () => {
  it("<85% → green (masih boleh muat)", () => expect(loadingStatus(0.84 * T, T)).toBe("green"));
  it("=85% → amber", () => expect(loadingStatus(0.85 * T, T)).toBe("amber"));
  it("=100% → amber (inklusif)", () => expect(loadingStatus(T, T)).toBe("amber"));
  it(">100% → red (STOP)", () => expect(loadingStatus(1.01 * T, T)).toBe("red"));
  it("target ≤ 0 → error", () => expect(() => loadingStatus(1, 0)).toThrow());
});

describe("loadingStatusFromBuckets", () => {
  it("menjumlah bucket lalu menilai", () => {
    expect(bucketsTotal([28_000, 28_000, 30_000])).toBe(86_000);
    expect(loadingStatusFromBuckets([28_000, 28_000, 30_000], T)).toBe("amber"); // 86t ≈ 94,5%
    expect(loadingStatusFromBuckets([30_000, 30_000, 45_000], T)).toBe("red"); // 105t > 100%
  });
});
