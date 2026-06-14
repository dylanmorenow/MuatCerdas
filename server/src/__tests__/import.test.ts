import { describe, it, expect } from "vitest";
import { parseFile, validateRows, isImportEntity, type ValidateCtx } from "../services/import";
import type { UnitCategory } from "@muatcerdas/shared";

function ctxFrom(map: Record<string, UnitCategory>): ValidateCtx {
  return { unitCategory: new Map(Object.entries(map)) };
}
const noCtx = ctxFrom({});

const unitsCsv = `id,category,model,tareKg,ratedPayloadKg,tiresCount,tireModel,tirePriceIdr,kmPerYear
HT-01,haul_truck,Scania P410,9000,30000,10,Michelin,20000000,100000
HD-01,pit_dumper,Komatsu HD785-7,75000,91000,6,,,`;

describe("parseFile (CSV)", () => {
  it("parse header + baris data", () => {
    const rows = parseFile(Buffer.from(unitsCsv), "units.csv");
    expect(rows.length).toBe(2);
    expect(rows[0]?.["id"]).toBe("HT-01");
  });
  it("format tak didukung → throw", () => {
    expect(() => parseFile(Buffer.from("x"), "data.txt")).toThrow();
  });
});

describe("validateRows units — SR-V2 (error per-baris)", () => {
  it("semua valid", () => {
    const rows = parseFile(Buffer.from(unitsCsv), "units.csv");
    const r = validateRows("units", rows, noCtx);
    expect(r.valid.length).toBe(2);
    expect(r.errors.length).toBe(0);
  });

  it("baris rusak dilaporkan, baris valid tetap diproses", () => {
    const csv = `id,category,model,tareKg,ratedPayloadKg,tiresCount
U-OK,haul_truck,Scania P410,9000,30000,10
U-BADCAT,excavator,PC2000,30000,40000,4
U-BADNUM,haul_truck,Volvo,9800,33000,abc`;
    const rows = parseFile(Buffer.from(csv), "units.csv");
    const r = validateRows("units", rows, noCtx);
    expect(r.valid.length).toBe(1);
    expect(r.errors.length).toBe(2);
    expect(r.errors[0]?.row).toBe(2); // U-BADCAT
    expect(r.errors[1]?.row).toBe(3); // U-BADNUM
  });

  it("kolom wajib KOSONG ditolak (bukan diisi 0)", () => {
    const csv = `id,category,model,tareKg,ratedPayloadKg,tiresCount
U-OK,haul_truck,Scania P410,9000,30000,10
U-EMPTY,haul_truck,Scania R580,,34000,10`;
    const rows = parseFile(Buffer.from(csv), "units.csv");
    const r = validateRows("units", rows, noCtx);
    expect(r.valid.length).toBe(1);
    expect(r.errors.length).toBe(1);
    expect(r.errors[0]?.row).toBe(2);
    expect(r.errors[0]?.message).toMatch(/tareKg/);
  });
});

describe("validateRows — SR-V3 (penegakan pemetaan unit)", () => {
  const ctx = ctxFrom({ "HT-01": "haul_truck", "HD-01": "pit_dumper" });
  const tiresCsv = (unitId: string) =>
    `id,unitId,position,installDate,removalDate,kmAtRemoval,avgPressureDeviationPct,loadIndex,removalReason,costIdr
TR-1,${unitId},FL,2024-01-01,2024-09-01,80000,4,0.95,worn,20000000`;

  it("ban → unit haul_truck: valid", () => {
    const rows = parseFile(Buffer.from(tiresCsv("HT-01")), "tires.csv");
    const r = validateRows("tires", rows, ctx);
    expect(r.valid.length).toBe(1);
    expect(r.errors.length).toBe(0);
  });

  it("ban → unit HD785: ditolak (SR-V3)", () => {
    const rows = parseFile(Buffer.from(tiresCsv("HD-01")), "tires.csv");
    const r = validateRows("tires", rows, ctx);
    expect(r.valid.length).toBe(0);
    expect(r.errors[0]?.message).toMatch(/SR-V3/);
  });

  it("payload → unit truk jalan: ditolak (SR-V3)", () => {
    const csv = `id,unitId,operatorId,timestamp,measuredPayloadKg,targetPayloadKg
PE-1,HT-01,OP-01,2026-06-01T08:00:00Z,90000,91000`;
    const rows = parseFile(Buffer.from(csv), "payload.csv");
    const r = validateRows("payload", rows, ctx);
    expect(r.valid.length).toBe(0);
    expect(r.errors[0]?.message).toMatch(/SR-V3/);
  });

  it("unit tak dikenal: ditolak", () => {
    const rows = parseFile(Buffer.from(tiresCsv("NOPE")), "tires.csv");
    const r = validateRows("tires", rows, ctx);
    expect(r.errors[0]?.message).toMatch(/tak ditemukan/);
  });
});

describe("payload status dihitung (SR-V1), bukan dari file", () => {
  const ctx = ctxFrom({ "HD-01": "pit_dumper" });
  it("over dari measured/target", () => {
    const csv = `id,unitId,operatorId,timestamp,measuredPayloadKg,targetPayloadKg
PE-OVER,HD-01,OP-01,2026-06-01T08:00:00Z,105000,91000`;
    const rows = parseFile(Buffer.from(csv), "payload.csv");
    const r = validateRows("payload", rows, ctx);
    expect(r.valid.length).toBe(1);
    expect((r.valid[0] as Record<string, unknown>)["status"]).toBe("over");
  });
});

describe("isImportEntity", () => {
  it("guard entity dikenal", () => {
    expect(isImportEntity("units")).toBe(true);
    expect(isImportEntity("payload")).toBe(true);
    expect(isImportEntity("nope")).toBe(false);
  });
});
