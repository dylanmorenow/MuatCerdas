import { describe, it, expect } from "vitest";
import { loadingStatus, loadingStatusFromBuckets, bucketsTotal } from "../payload/guidance";

const T = 91_000;

// §12.5 — <95% green · 95–110% amber · >110% red.
describe("loadingStatus §12.5 (batas)", () => {
  it("<95% → green (masih boleh muat)", () => expect(loadingStatus(0.94 * T, T)).toBe("green"));
  it("=95% → amber", () => expect(loadingStatus(0.95 * T, T)).toBe("amber"));
  it("100% → amber", () => expect(loadingStatus(T, T)).toBe("amber"));
  it("=110% → amber (inklusif)", () => expect(loadingStatus(1.1 * T, T)).toBe("amber"));
  it(">110% → red (STOP)", () => expect(loadingStatus(1.101 * T, T)).toBe("red"));
  it("target ≤ 0 → error", () => expect(() => loadingStatus(1, 0)).toThrow());
});

describe("loadingStatusFromBuckets", () => {
  it("menjumlah bucket lalu menilai", () => {
    expect(bucketsTotal([30_000, 30_000, 32_000])).toBe(92_000);
    expect(loadingStatusFromBuckets([30_000, 30_000, 32_000], T)).toBe("amber"); // 92t ≈ 101%
    expect(loadingStatusFromBuckets([30_000, 30_000, 45_000], T)).toBe("red"); // 105t > 110%
  });
});
