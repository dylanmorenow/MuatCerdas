import { describe, it, expect } from "vitest";
import { pickMappers } from "../services/roadmap";

describe("pickMappers (kamera AI hanya di satu unit terdepan)", () => {
  it("ambil unit pertama saja; tak ada pemeta belakang", () => {
    expect(pickMappers(["HT-01", "HT-02", "HT-30"])).toEqual({ leadUnitId: "HT-01", lastUnitId: null });
  });
  it("satu unit → lead saja", () => {
    expect(pickMappers(["HT-01"])).toEqual({ leadUnitId: "HT-01", lastUnitId: null });
  });
  it("kosong → null", () => {
    expect(pickMappers([])).toEqual({ leadUnitId: null, lastUnitId: null });
  });
});
