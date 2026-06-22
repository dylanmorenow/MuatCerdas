import { describe, it, expect } from "vitest";
import { loadingPolicy, EXCAVATOR_BUCKET_M3, MATERIAL_DENSITY_T_PER_M3 } from "../payload/policy";

const T = 91_000; // target 91 t

describe("loadingPolicy §FR-0002-11", () => {
  it("PC2000 + batubara: perPass & jumlah pass", () => {
    const p = loadingPolicy({
      targetKg: T,
      bucketCapacityM3: EXCAVATOR_BUCKET_M3.PC2000!,
      materialDensityTPerM3: MATERIAL_DENSITY_T_PER_M3.Batubara!,
      fillFactor: 0.9,
    });
    // 11 × 0,9 × 1000 × 0,9 = 8.910 kg/pass
    expect(p.perPassKg).toBeCloseTo(8_910, 6);
    expect(p.suggestedPasses).toBe(10); // round(91000/8910)=round(10,2)
    expect(p.effectivePayloadKg).toBeCloseTo(89_100, 6);
  });

  it("band target = [85% .. 100%]", () => {
    const p = loadingPolicy({ targetKg: T, bucketCapacityM3: 11, materialDensityTPerM3: 0.9 });
    expect(p.targetBandKg[0]).toBeCloseTo(77_350, 6); // 0,85
    expect(p.targetBandKg[1]).toBeCloseTo(91_000, 6); // 1,00
  });

  it("koreksi densitas: material lebih padat → pass lebih sedikit", () => {
    const coal = loadingPolicy({ targetKg: T, bucketCapacityM3: 11, materialDensityTPerM3: 0.9 });
    const ob = loadingPolicy({ targetKg: T, bucketCapacityM3: 11, materialDensityTPerM3: 1.8 });
    expect(ob.suggestedPasses).toBeLessThan(coal.suggestedPasses);
    expect(ob.perPassKg).toBeGreaterThan(coal.perPassKg);
  });

  it("fillFactor default 0,9 saat tak diberikan", () => {
    const a = loadingPolicy({ targetKg: T, bucketCapacityM3: 11, materialDensityTPerM3: 0.9 });
    const b = loadingPolicy({ targetKg: T, bucketCapacityM3: 11, materialDensityTPerM3: 0.9, fillFactor: 0.9 });
    expect(a.perPassKg).toBe(b.perPassKg);
  });

  it("minimal 1 pass; target/densitas tak valid → error", () => {
    const big = loadingPolicy({ targetKg: 1_000, bucketCapacityM3: 11, materialDensityTPerM3: 0.9 });
    expect(big.suggestedPasses).toBeGreaterThanOrEqual(1);
    expect(() => loadingPolicy({ targetKg: 0, bucketCapacityM3: 11, materialDensityTPerM3: 0.9 })).toThrow();
    expect(() => loadingPolicy({ targetKg: T, bucketCapacityM3: 0, materialDensityTPerM3: 0.9 })).toThrow();
  });
});
