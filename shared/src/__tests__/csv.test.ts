import { describe, it, expect } from "vitest";
import { toCsv } from "../csv";

describe("toCsv", () => {
  it("header + baris dasar", () => {
    expect(toCsv(["id", "km"], [["HT-01", 80000]])).toBe("id,km\nHT-01,80000");
  });

  it("escape koma, kutip, newline (RFC-4180)", () => {
    const csv = toCsv(["a", "b"], [["x,y", 'z"q']]);
    expect(csv).toBe('a,b\n"x,y","z""q"');
  });

  it("baris kosong → hanya header", () => {
    expect(toCsv(["a", "b"], [])).toBe("a,b");
  });
});
