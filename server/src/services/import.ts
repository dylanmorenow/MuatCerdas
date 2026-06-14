// Lapisan ingest MURNI (tanpa Prisma) — FR-0002-1 / SR-1 / SR-V2 / SR-V3.
// parseFile: CSV (papaparse) / XLSX (SheetJS) → baris mentah.
// validateRows: koersi + validasi Zod per-baris (error per-baris), penegakan pemetaan unit (SR-V3).
// Dipisah dari route agar dapat di-unit-test tanpa database (TECH_DESIGN §7/§9).

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";
import {
  unitCategorySchema,
  operatorShiftSchema,
  roadSurfaceSchema,
  tireRemovalReasonSchema,
  classifyPayload,
  type UnitCategory,
} from "@muatcerdas/shared";

export type RawRow = Record<string, unknown>;

export const IMPORT_ENTITIES = [
  "units",
  "operators",
  "segments",
  "tires",
  "payload",
  "calibration",
] as const;
export type ImportEntity = (typeof IMPORT_ENTITIES)[number];

export function isImportEntity(x: string): x is ImportEntity {
  return (IMPORT_ENTITIES as readonly string[]).includes(x);
}

export interface RowError {
  /** Nomor baris DATA (1-based, tanpa header). */
  row: number;
  message: string;
}
export interface ValidationResult {
  valid: RawRow[];
  errors: RowError[];
}

export interface ValidateCtx {
  /** Peta unitId → kategori (untuk SR-V3). Dibangun dari DB di route; di-inject di test. */
  unitCategory: Map<string, UnitCategory>;
}

// — Helper koersi (CSV semua string; sel kosong → undefined agar opsional benar) —
const emptyToUndef = (v: unknown): unknown =>
  v === "" || v === null || v === undefined ? undefined : v;

// Angka WAJIB: sel kosong/undefined HARUS gagal (bukan jadi 0). Catatan: z.coerce.number("")
// menghasilkan 0, jadi sel kosong dipaksa undefined dulu → NaN → gagal cek finite.
function reqNumber(check: (n: number) => boolean, message: string) {
  return z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number().refine((n) => Number.isFinite(n) && check(n), { message }),
  );
}
const reqNum = reqNumber(() => true, "wajib & harus angka");
const reqNumNonNeg = reqNumber((n) => n >= 0, "wajib angka ≥ 0");
const reqNumPos = reqNumber((n) => n > 0, "wajib angka > 0");
const reqIntPos = reqNumber((n) => Number.isInteger(n) && n > 0, "wajib bilangan bulat > 0");
const fraction01 = reqNumber((n) => n >= 0 && n <= 1, "wajib 0..1");
const reqStr = z.string().min(1, { message: "wajib diisi" });
const optNum = z.preprocess(emptyToUndef, z.coerce.number().optional());
const optNumNonNeg = z.preprocess(
  emptyToUndef,
  z.coerce.number().refine((n) => n >= 0, { message: "harus ≥ 0" }).optional(),
);
const optStr = z.preprocess(emptyToUndef, z.string().min(1).optional());
const reqDate = z.coerce.date().refine((d) => !Number.isNaN(d.getTime()), {
  message: "tanggal tak valid",
});
const optDate = z.preprocess(
  emptyToUndef,
  z.coerce
    .date()
    .refine((d) => !Number.isNaN(d.getTime()), { message: "tanggal tak valid" })
    .optional(),
);

// — Skema baris per-entity (output = bentuk siap Prisma create) —
const unitsRow = z.object({
  id: reqStr,
  category: unitCategorySchema,
  model: reqStr,
  tareKg: reqNumNonNeg,
  ratedPayloadKg: reqNumNonNeg,
  tiresCount: reqIntPos,
  tireModel: optStr,
  tirePriceIdr: optNumNonNeg,
  kmPerYear: optNumNonNeg,
});

const operatorsRow = z.object({
  id: reqStr,
  name: reqStr,
  shift: operatorShiftSchema,
});

const segmentsRow = z.object({
  id: reqStr,
  name: reqStr,
  surface: roadSurfaceSchema,
  lengthKm: reqNumPos,
  conditionScore: fraction01,
  avgSpeedLoadedKmh: reqNumNonNeg,
  avgSpeedEmptyKmh: reqNumNonNeg,
});

const tiresRow = z.object({
  id: reqStr,
  unitId: reqStr,
  position: reqStr,
  installDate: reqDate,
  removalDate: optDate,
  kmAtRemoval: optNumNonNeg,
  avgPressureDeviationPct: optNum,
  loadIndex: optNum,
  removalReason: tireRemovalReasonSchema,
  costIdr: reqNumNonNeg,
});

// status TIDAK diminta di file → dihitung classifyPayload (konsisten M2/SR-V1).
const payloadRow = z
  .object({
    id: reqStr,
    unitId: reqStr,
    operatorId: reqStr,
    timestamp: reqDate,
    measuredPayloadKg: reqNumNonNeg,
    targetPayloadKg: reqNumPos,
  })
  .transform((r) => ({
    ...r,
    status: classifyPayload(r.measuredPayloadKg, r.targetPayloadKg),
  }));

const calibrationRow = z.object({
  id: reqStr,
  unitId: reqStr,
  lastCalibrationDate: reqDate,
  scaleStudyOffsetPct: reqNum,
});

const ROW_SCHEMAS: Record<ImportEntity, z.ZodTypeAny> = {
  units: unitsRow,
  operators: operatorsRow,
  segments: segmentsRow,
  tires: tiresRow,
  payload: payloadRow,
  calibration: calibrationRow,
};

/** Kategori unit yang diwajibkan saat impor (SR-V3). null = tak merujuk unit. */
const CATEGORY_RULE: Record<ImportEntity, UnitCategory | null> = {
  units: null,
  operators: null,
  segments: null,
  tires: "haul_truck",
  payload: "pit_dumper",
  calibration: "pit_dumper",
};

function formatZodError(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "(baris)"}: ${i.message}`)
    .join("; ");
}

/** Parse berkas CSV/XLSX → baris mentah (header sebagai kunci). */
export function parseFile(buf: Buffer, filename: string): RawRow[] {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv")) {
    const text = buf.toString("utf8");
    const res = Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
    });
    return res.data;
  }
  if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
    const wb = XLSX.read(buf, { type: "buffer" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const ws = wb.Sheets[sheetName];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json<RawRow>(ws, { defval: null, raw: true });
  }
  throw new Error(`Format tak didukung: ${filename} (gunakan .csv atau .xlsx)`);
}

/**
 * Validasi baris (SR-V2: error per-baris, baris valid tetap lolos) +
 * penegakan pemetaan unit (SR-V3: tolak unit salah-modul / tak dikenal).
 */
export function validateRows(
  entity: ImportEntity,
  rows: RawRow[],
  ctx: ValidateCtx,
): ValidationResult {
  const schema = ROW_SCHEMAS[entity];
  const rule = CATEGORY_RULE[entity];
  const valid: RawRow[] = [];
  const errors: RowError[] = [];

  rows.forEach((raw, i) => {
    const row = i + 1;
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ row, message: formatZodError(parsed.error) });
      return;
    }
    const data = parsed.data as RawRow;

    if (rule) {
      const unitId = String(data["unitId"] ?? "");
      const cat = ctx.unitCategory.get(unitId);
      if (!cat) {
        errors.push({ row, message: `unitId '${unitId}' tak ditemukan` });
        return;
      }
      if (cat !== rule) {
        errors.push({
          row,
          message: `unit '${unitId}' berkategori '${cat}', impor '${entity}' butuh '${rule}' (SR-V3)`,
        });
        return;
      }
    }

    valid.push(data);
  });

  return { valid, errors };
}
