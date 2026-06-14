// §12.4 — Kaitan overload → keausan (Modul B, Rupiah). Sumber kebenaran: PRD §12.4.

import type { CostParams, PayloadEvent } from "../types";
import { classifyPayload } from "./analytics";

export interface UnitOverloadWear {
  unitId: string;
  events: number;
  overEvents: number;
  /** #over / #events. */
  overloadRate: number;
  /** overloadRate * overloadWearCostFactorIdr. */
  costIdr: number;
}

export interface OverloadWearResult {
  byUnit: UnitOverloadWear[];
  total: number;
}

/**
 * Biaya keausan akibat overload per unit HD785 (§12.4).
 * Status overload ditentukan via classifyPayload (SR-V1), bukan event.status.
 *
 * Catatan: `overloadWearCostFactorIdr` default = 0 (placeholder, PRD §16 #2) →
 * semua costIdr = 0 sampai data KPP tersedia (tidak membesar-besarkan).
 */
export function overloadWearCost(
  events: PayloadEvent[],
  p: CostParams,
): OverloadWearResult {
  const agg = new Map<string, { events: number; over: number }>();
  for (const e of events) {
    const status = classifyPayload(e.measuredPayloadKg, e.targetPayloadKg);
    const cur = agg.get(e.unitId) ?? { events: 0, over: 0 };
    cur.events++;
    if (status === "over") cur.over++;
    agg.set(e.unitId, cur);
  }

  const byUnit: UnitOverloadWear[] = [];
  let total = 0;
  for (const [unitId, cur] of agg) {
    const overloadRate = cur.events > 0 ? cur.over / cur.events : 0;
    const costIdr = overloadRate * p.overloadWearCostFactorIdr;
    total += costIdr;
    byUnit.push({ unitId, events: cur.events, overEvents: cur.over, overloadRate, costIdr });
  }
  byUnit.sort((a, b) => b.costIdr - a.costIdr || a.unitId.localeCompare(b.unitId));

  return { byUnit, total };
}
