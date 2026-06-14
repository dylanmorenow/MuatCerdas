import { describe, it, expect } from "vitest";
import { defaultCostParams } from "../assumptions";
import { formatNumber, formatRupiah, formatPersen } from "../format";
import { unitSchema, costParamsSchema } from "../schemas";

// Smoke + LOCK sanity fondasi. Engine §12.7/§12.9 dibangun di M2 (tire/finance.ts,
// finance/roi.ts) dan WAJIB mencocokkan angka yang dikunci di sini.

describe("defaultCostParams (ASUMSI §12 — dikunci pemilik)", () => {
  it("memakai nilai ban yang disetujui", () => {
    expect(defaultCostParams.tirePriceIdr).toBe(20_000_000);
    expect(defaultCostParams.tiresPerUnit).toBe(10);
    expect(defaultCostParams.kmPerYear).toBe(100_000);
    expect(defaultCostParams.tireLifeActualKm).toBe(65_000);
    expect(defaultCostParams.tireLifeBestKm).toBe(100_000);
    expect(defaultCostParams.captureRate).toBe(0.5);
    expect(defaultCostParams.fleetSize).toBe(30);
    expect(defaultCostParams.capexIdr).toBe(500_000_000);
    expect(defaultCostParams.opexAnnualIdr).toBe(100_000_000);
  });

  it("lever payload = placeholder netral (tak membesar-besarkan)", () => {
    expect(defaultCostParams.underloadPct).toBe(0.03);
    expect(defaultCostParams.tripsPerYear).toBe(0);
    expect(defaultCostParams.fuelCostPerTripIdr).toBe(0);
    expect(defaultCostParams.overloadWearCostFactorIdr).toBe(0);
  });

  it("lolos validasi costParamsSchema", () => {
    expect(costParamsSchema.safeParse(defaultCostParams).success).toBe(true);
  });
});

describe("sanity finansial §12.7/§12.9 (LOCK — engine M2 wajib cocok)", () => {
  const p = defaultCostParams;
  // §12.7
  const tiresActualPerYear = (p.tiresPerUnit * p.kmPerYear) / p.tireLifeActualKm;
  const tiresBestPerYear = (p.tiresPerUnit * p.kmPerYear) / p.tireLifeBestKm;
  const avoidableTires = tiresActualPerYear - tiresBestPerYear;
  const avoidableCostPerUnit = avoidableTires * p.tirePriceIdr;
  const capturedPerUnit = avoidableCostPerUnit * p.captureRate;
  const fleetCaptured = capturedPerUnit * p.fleetSize;
  // §12.9 (lever payload = 0 → annualSavings = fleetCaptured)
  const annualSavings = fleetCaptured;
  const paybackMonths = p.capexIdr / (annualSavings / 12);

  it("avoidableTires ≈ 5,38 /unit", () => {
    expect(avoidableTires).toBeCloseTo(5.3846, 3);
  });
  it("avoidableCostPerUnit ≈ Rp107,69 jt", () => {
    expect(Math.round(avoidableCostPerUnit)).toBe(107_692_308);
  });
  it("capturedPerUnit ≈ Rp53,85 jt", () => {
    expect(Math.round(capturedPerUnit)).toBe(53_846_154);
  });
  it("fleetCaptured (armada 30) ≈ Rp1,615 M", () => {
    expect(Math.round(fleetCaptured)).toBe(1_615_384_615);
  });
  it("paybackMonths ≈ 3,71 bln", () => {
    expect(paybackMonths).toBeCloseTo(3.7143, 3);
  });
});

describe("format angka Indonesia (NFR-0002-8)", () => {
  it("ribuan titik & desimal koma", () => {
    expect(formatNumber(1234567.89)).toBe("1.234.567,89");
    expect(formatRupiah(20_000_000)).toContain("20.000.000");
    expect(formatPersen(0.03)).toMatch(/3\s*%/);
  });
});

describe("schema unit (penegak kategori)", () => {
  it("menolak kategori unit di luar enum", () => {
    const bad = unitSchema.safeParse({
      id: "X",
      category: "excavator",
      model: "PC2000",
      tareKg: 1,
      ratedPayloadKg: 1,
      tiresCount: 6,
    });
    expect(bad.success).toBe(false);
  });

  it("menerima haul_truck yang valid", () => {
    const ok = unitSchema.safeParse({
      id: "HT-01",
      category: "haul_truck",
      model: "Scania R580",
      tareKg: 18000,
      ratedPayloadKg: 60000,
      tiresCount: 10,
    });
    expect(ok.success).toBe(true);
  });
});
