import { describe, it, expect } from "vitest";
import {
  tireRiskGrade,
  gradeCounts,
  estimateExtraWearKm,
  worstGrade,
  cyclesRemaining,
  GRADE_WEAR_KM,
} from "../grading";
import {
  roadOpsSpeedFactor,
  roadOpsConditionLabel,
  roadOpsRiskCause,
  ROAD_OPS_CONDITIONS,
} from "../roadcondition";

describe("tireRiskGrade", () => {
  it("klasifikasi penyebab ke grade benar", () => {
    expect(tireRiskGrade("sharp_rock")).toBe("A");
    expect(tireRiskGrade("overload")).toBe("A");
    expect(tireRiskGrade("overspeed")).toBe("A");
    expect(tireRiskGrade("pothole")).toBe("A");
    expect(tireRiskGrade("edge_break")).toBe("A");
    expect(tireRiskGrade("spillage")).toBe("B");
    expect(tireRiskGrade("hard_braking")).toBe("B");
    expect(tireRiskGrade("standing_water")).toBe("B");
    expect(tireRiskGrade("mud")).toBe("C");
    expect(tireRiskGrade("dust")).toBe("C");
    expect(tireRiskGrade("tidak_dikenal")).toBeNull();
  });
});

describe("gradeCounts & estimateExtraWearKm", () => {
  it("hitung jumlah per grade & total km hilang", () => {
    const counts = gradeCounts(["sharp_rock", "overspeed", "rutting", "mud", "xxx"]);
    expect(counts).toEqual({ A: 2, B: 1, C: 1 });
    expect(estimateExtraWearKm(counts)).toBe(2 * GRADE_WEAR_KM.A + GRADE_WEAR_KM.B + GRADE_WEAR_KM.C);
  });
  it("grade A lebih berat daripada C", () => {
    expect(GRADE_WEAR_KM.A).toBeGreaterThan(GRADE_WEAR_KM.C);
  });
});

describe("worstGrade", () => {
  it("ambil grade terburuk yang muncul", () => {
    expect(worstGrade({ A: 0, B: 0, C: 3 })).toBe("C");
    expect(worstGrade({ A: 0, B: 2, C: 3 })).toBe("B");
    expect(worstGrade({ A: 1, B: 2, C: 3 })).toBe("A");
    expect(worstGrade({ A: 0, B: 0, C: 0 })).toBeNull();
  });
});

describe("cyclesRemaining", () => {
  it("perkiraan jumlah cycle dari sisa km", () => {
    expect(cyclesRemaining(700, 70)).toBe(10);
    expect(cyclesRemaining(65, 70)).toBe(0);
    expect(cyclesRemaining(700, 0)).toBe(0);
  });
});

describe("roadOpsSpeedFactor", () => {
  it("makin buruk jalan, faktor makin kecil; slippery hampir berhenti", () => {
    expect(roadOpsSpeedFactor("normal")).toBe(1);
    expect(roadOpsSpeedFactor("dusty")).toBeLessThan(roadOpsSpeedFactor("normal"));
    expect(roadOpsSpeedFactor("muddy")).toBeLessThan(roadOpsSpeedFactor("wet"));
    expect(roadOpsSpeedFactor("slippery")).toBeLessThan(0.2);
  });
  it("semua kondisi punya label", () => {
    expect(ROAD_OPS_CONDITIONS).toHaveLength(5);
    for (const c of ROAD_OPS_CONDITIONS) expect(roadOpsConditionLabel(c).length).toBeGreaterThan(0);
  });
  it("kondisi memetakan ke penyebab risiko ban", () => {
    expect(roadOpsRiskCause("dusty")).toBe("dust");
    expect(roadOpsRiskCause("muddy")).toBe("mud");
    expect(roadOpsRiskCause("normal")).toBeNull();
  });
});
