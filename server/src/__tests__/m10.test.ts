import { describe, it, expect } from "vitest";
import { pickMappers } from "../services/roadmap";

describe("pickMappers (truk pemeta lead/last, FR-0004-5)", () => {
  it("ambil unit pertama & terakhir", () => {
    expect(pickMappers(["HT-01", "HT-02", "HT-30"])).toEqual({ leadUnitId: "HT-01", lastUnitId: "HT-30" });
  });
  it("satu unit → lead = last", () => {
    expect(pickMappers(["HT-01"])).toEqual({ leadUnitId: "HT-01", lastUnitId: "HT-01" });
  });
  it("kosong → null", () => {
    expect(pickMappers([])).toEqual({ leadUnitId: null, lastUnitId: null });
  });
});
