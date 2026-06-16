import { describe, it, expect } from "vitest";
import { tireReplacementCostIdr, productionLossIdr, coalQuota, defaultOpsParams } from "../ops";
import { formatTon } from "../format";

describe("ops KPI (kerugian/risiko operasional)", () => {
  it("estimasi harga ban segera ganti", () => {
    expect(tireReplacementCostIdr(8, 10, 20_000_000)).toBe(1_600_000_000);
  });
  it("estimasi kerugian produksi (downtime × nilai/hari)", () => {
    expect(productionLossIdr(8, defaultOpsParams)).toBe(8 * 3 * 25_000_000);
  });
  it("kuota coal: target & progres", () => {
    const q = coalQuota(15_000, defaultOpsParams);
    expect(q.targetT).toBe(30_000);
    expect(q.pct).toBeCloseTo(0.5, 6);
  });
  it("0 unit kritis → 0", () => {
    expect(tireReplacementCostIdr(0, 10, 20_000_000)).toBe(0);
    expect(productionLossIdr(0, defaultOpsParams)).toBe(0);
  });
});

describe("formatTon", () => {
  it("kg → ton", () => expect(formatTon(91_000)).toBe("91 t"));
  it("satu desimal", () => expect(formatTon(93_539, 1)).toMatch(/93,5\s*t/));
});
