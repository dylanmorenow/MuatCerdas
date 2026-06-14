// §12.6 — Calibration drift HD785 (Modul B). Sumber kebenaran: PRD §12.6.

import type { CalibrationRecord } from "../types";

/** Ambang offset (%) — di ATAS ini perlu kalibrasi (strict). */
export const CALIBRATION_MAX_OFFSET_PCT = 5;
/** Ambang usia kalibrasi (hari) — di ATAS ini perlu kalibrasi (strict). */
export const CALIBRATION_MAX_AGE_DAYS = 90;

const MS_PER_DAY = 86_400_000;

function toMs(d: Date | string): number {
  return typeof d === "string" ? new Date(d).getTime() : d.getTime();
}

/** Usia kalibrasi dalam hari penuh (today - lastCalibrationDate). */
export function calibrationAgeDays(
  rec: CalibrationRecord,
  today: Date | string = new Date(),
): number {
  return Math.floor((toMs(today) - toMs(rec.lastCalibrationDate)) / MS_PER_DAY);
}

/**
 * Perlu kalibrasi bila |offset| > 5% ATAU usia > 90 hari (§12.6, kedua ambang strict).
 */
export function needsCalibration(
  rec: CalibrationRecord,
  today: Date | string = new Date(),
): boolean {
  return (
    Math.abs(rec.scaleStudyOffsetPct) > CALIBRATION_MAX_OFFSET_PCT ||
    calibrationAgeDays(rec, today) > CALIBRATION_MAX_AGE_DAYS
  );
}
