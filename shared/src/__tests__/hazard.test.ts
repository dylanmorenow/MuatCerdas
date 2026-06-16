import { describe, it, expect } from "vitest";
import {
  conditionScoreFromHazards,
  hazardSeverityWeight,
  hazardLabel,
  hazardColor,
  HAZARD_TYPES,
  type HazardLike,
} from "../hazard";

const h = (type: HazardLike["type"], severity: number): HazardLike => ({ type, segmentId: "SEG-1", severity });

describe("conditionScoreFromHazards", () => {
  it("tanpa bahaya → skor mendekati maksimum (jalan baik)", () => {
    expect(conditionScoreFromHazards([], 7)).toBeGreaterThanOrEqual(0.95);
  });

  it("makin banyak/parah bahaya → skor makin rendah (monoton)", () => {
    const few = conditionScoreFromHazards([h("rutting", 0.5)], 7);
    const many = conditionScoreFromHazards(
      [h("sharp_rock", 0.9), h("pothole", 0.9), h("edge_break", 0.8)],
      7,
    );
    expect(many).toBeLessThan(few);
  });

  it("clamp pada [0.2, 0.98]", () => {
    const severe = conditionScoreFromHazards(
      Array.from({ length: 30 }, () => h("sharp_rock", 1)),
      1,
    );
    expect(severe).toBeGreaterThanOrEqual(0.2);
    expect(severe).toBeLessThanOrEqual(0.98);
  });

  it("batu tajam lebih merusak daripada genangan air", () => {
    expect(hazardSeverityWeight("sharp_rock")).toBeGreaterThan(hazardSeverityWeight("standing_water"));
  });
});

describe("label & warna bahaya", () => {
  it("semua tipe punya label & warna unik", () => {
    expect(HAZARD_TYPES).toHaveLength(8);
    const labels = HAZARD_TYPES.map(hazardLabel);
    const colors = HAZARD_TYPES.map(hazardColor);
    expect(new Set(labels).size).toBe(8);
    expect(new Set(colors).size).toBe(8);
  });
});
