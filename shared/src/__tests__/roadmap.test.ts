import { describe, it, expect } from "vitest";
import { conditionLabel, conditionColor } from "../roadmap";

describe("conditionLabel (ambang kondisi jalan)", () => {
  it("memetakan skor ke kategori", () => {
    expect(conditionLabel(0.8)).toBe("baik");
    expect(conditionLabel(0.65)).toBe("baik"); // batas
    expect(conditionLabel(0.55)).toBe("berlubang");
    expect(conditionLabel(0.5)).toBe("berlubang"); // batas
    expect(conditionLabel(0.4)).toBe("berlumpur");
    expect(conditionLabel(0.35)).toBe("berlumpur"); // batas
    expect(conditionLabel(0.2)).toBe("batu tajam");
  });
  it("warna berbeda per kategori", () => {
    expect(conditionColor(0.8)).not.toBe(conditionColor(0.2));
    expect(conditionColor(0.2)).toBe("#ef4444");
  });
});
