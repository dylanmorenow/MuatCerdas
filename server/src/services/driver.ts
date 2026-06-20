// Modul D — bundle data driver (FR-0004-4). REUSE service Modul A/B/C (tanpa duplikasi logika §9):
// kecepatan (speed), status ban (tire), payload+kalibrasi (payload), target produksi, peta jalan.

import { classifyPayload, type PayloadStatus } from "@muatcerdas/shared";
import { prisma } from "../db";
import { getSpeedOverview } from "./speed";
import { getTireUnitDetail } from "./tire";
import { getCalibrationHealth } from "./payload";
import { getRoadMap, type RoadMapData } from "./roadmap";

export interface DriverBundle {
  unit: { id: string; model: string; category: string };
  speed: {
    vmaxSafeTravelKmh: number;
    reason: string;
    overTarget: boolean;
    payloadT: number;
    targetT: number;
  } | null;
  tire: {
    status: "ok" | "warn" | "critical";
    remainingLifeKm: number;
    predictedLifeKm: number;
    confidence: number;
    usedFallback: boolean;
  } | null;
  payload: {
    meanKg: number;
    targetKg: number;
    status: PayloadStatus;
    pctOfTarget: number;
    events: number;
  } | null;
  calibration: { needsCalibration: boolean; ageDays: number; scaleStudyOffsetPct: number } | null;
  production: { dailyTargetTon: number; unitShareTon: number; perTripPayloadT: number };
  roadMap: RoadMapData;
}

export async function getDriverBundle(unitId: string): Promise<DriverBundle> {
  const unit = await prisma.unit.findUnique({ where: { id: unitId } });
  if (!unit) throw new Error(`Unit '${unitId}' tak ditemukan`);

  const isHaul = unit.category === "haul_truck";
  // HD785 berada di rute in-pit (site), bukan rute hauling KM33→Jetty.
  const [speedOverview, roadMap] = await Promise.all([getSpeedOverview(), getRoadMap(isHaul ? "haul" : "site")]);

  const speedRow = isHaul
    ? speedOverview.units.find((u) => u.id === unitId)
    : speedOverview.hd785.find((u) => u.id === unitId);

  let tire: DriverBundle["tire"] = null;
  let payload: DriverBundle["payload"] = null;
  let calibration: DriverBundle["calibration"] = null;

  if (isHaul) {
    const detail = await getTireUnitDetail(unitId);
    if (detail) {
      tire = {
        status: detail.status,
        remainingLifeKm: detail.remainingLifeKm,
        predictedLifeKm: detail.predictedLifeKm,
        confidence: detail.confidence,
        usedFallback: detail.usedFallback,
      };
    }
  } else {
    const agg = await prisma.payloadEvent.aggregate({
      where: { unitId },
      _avg: { measuredPayloadKg: true },
      _count: { _all: true },
    });
    const meanKg = Math.round(agg._avg.measuredPayloadKg ?? 0);
    const targetKg = unit.ratedPayloadKg;
    payload = {
      meanKg,
      targetKg,
      status: meanKg > 0 ? classifyPayload(meanKg, targetKg) : "under",
      pctOfTarget: targetKg > 0 ? meanKg / targetKg : 0,
      events: agg._count._all,
    };
    const calib = (await getCalibrationHealth()).find((c) => c.unitId === unitId);
    if (calib) {
      calibration = {
        needsCalibration: calib.needsCalibration,
        ageDays: calib.ageDays,
        scaleStudyOffsetPct: calib.scaleStudyOffsetPct,
      };
    }
  }

  const params = speedOverview.params;
  const fleetUnitCount = speedOverview.fleetInputs.unitCount || 1;
  const production = {
    dailyTargetTon: params.dailyTargetTon,
    unitShareTon: Math.round(params.dailyTargetTon / fleetUnitCount),
    perTripPayloadT: speedRow?.payloadT ?? 0,
  };

  return {
    unit: { id: unit.id, model: unit.model, category: unit.category },
    speed: speedRow
      ? {
          vmaxSafeTravelKmh: speedRow.vmaxSafeTravelKmh,
          reason: speedRow.reason,
          overTarget: speedRow.overTarget,
          payloadT: speedRow.payloadT,
          targetT: speedRow.targetT,
        }
      : null,
    tire,
    payload,
    calibration,
    production,
    roadMap,
  };
}
