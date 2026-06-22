// Revisi F3 — peta bahaya jalan LiDAR (prototipe). Strip rute KM33→Jetty bersegmen (warna kondisi)
// + penanda bahaya per posisi km (warna per tipe) dgn penataan lane anti-tumpang-tindih + legenda.
// Data SIMULASI mewakili keluaran LiDAR (truk pemeta lead/last) — BUKAN feed live.
import { conditionColor, hazardColor, hazardLabel, type HazardType, type SpeedActualStatus } from "@muatcerdas/shared";
import type { RoadMapData, RoadMapLivePosition } from "../api/roadmap";

// Warna penanda truk live menurut status kecepatan aktual vs batas aman.
const ACTUAL_COLOR: Record<SpeedActualStatus, string> = {
  ok: "#059669",
  near: "#d97706",
  over: "#dc2626",
  none: "#0E4D92",
};

const W = 760;
const PAD = 14;
const INNER_W = W - PAD * 2;
const Y_KM = 14; // baris label KM / Jetty
const Y_MAPPER = 28; // baris truk pemeta
const LANE_TOP = 48; // lane penanda teratas
const LANE_STEP = 13;
const MAX_LANES = 5;
const GAP = 15; // jarak min horizontal antar penanda dalam satu lane
const BAR_H = 22;

export function HazardMap({
  data,
  live,
  selfUnitId = null,
  selfStatus = "none",
}: {
  data: RoadMapData;
  /** Penanda truk live (GPS). Default: data.livePositions. Driver kirim hanya unitnya. */
  live?: RoadMapLivePosition[];
  selfUnitId?: string | null;
  selfStatus?: SpeedActualStatus;
}) {
  const { segments, hazards, mappers } = data;
  const trucks = live ?? data.livePositions ?? [];
  const total = data.routeLengthKm || segments.reduce((s, x) => s + x.lengthKm, 0) || 1;
  const xOf = (km: number) => PAD + (Math.min(Math.max(km, 0), total) / total) * INNER_W;

  // Penataan lane: urut posisi, taruh tiap penanda di lane terendah yang masih cukup jarak.
  const laneLastX: number[] = [];
  const placed = [...hazards]
    .map((h) => ({ ...h, x: xOf(h.positionKm) }))
    .sort((a, b) => a.x - b.x)
    .map((h) => {
      let lane = laneLastX.findIndex((lx) => h.x - lx >= GAP);
      if (lane === -1) {
        if (laneLastX.length < MAX_LANES) {
          lane = laneLastX.length;
          laneLastX.push(h.x);
        } else {
          // semua lane penuh → pakai lane dgn ruang terbanyak (lastX terkecil)
          lane = laneLastX.indexOf(Math.min(...laneLastX));
          laneLastX[lane] = h.x;
        }
      } else {
        laneLastX[lane] = h.x;
      }
      return { ...h, lane };
    });
  const lanesUsed = Math.max(1, laneLastX.length);
  const stripY = LANE_TOP + lanesUsed * LANE_STEP + 4;
  const totalH = stripY + BAR_H + 30;

  // strip segmen
  let acc = 0;
  const rects = segments.map((s) => {
    const x = PAD + (acc / total) * INNER_W;
    const w = (s.lengthKm / total) * INNER_W;
    acc += s.lengthKm;
    return { ...s, x, w };
  });

  // legenda
  const counts = new Map<HazardType, number>();
  for (const h of hazards) counts.set(h.type, (counts.get(h.type) ?? 0) + 1);
  const legend = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const urgentCount = hazards.filter((h) => h.urgent).length;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${totalH}`} className="w-full" role="img" aria-label="Peta bahaya jalan kamera AI">
        <text x={PAD} y={Y_KM} fontSize="11" fontWeight="bold" fill="#334155">{data.startLabel}</text>
        <text x={W - PAD} y={Y_KM} fontSize="11" fontWeight="bold" fill="#334155" textAnchor="end">{data.endLabel}</text>

        {/* truk pemeta — glyph rect (emoji tak konsisten render di SVG) */}
        {mappers.lastUnitId && (
          <g>
            <rect x={PAD} y={Y_MAPPER - 7} width="12" height="6" rx="1.5" fill="#0E4D92" />
            <text x={PAD + 16} y={Y_MAPPER} fontSize="9" fill="#0E4D92">Pemeta belakang · {mappers.lastUnitId}</text>
          </g>
        )}
        {mappers.leadUnitId && (
          <g>
            <text x={W - PAD - 16} y={Y_MAPPER} fontSize="9" fill="#0E4D92" textAnchor="end">Pemeta depan (kamera AI) · {mappers.leadUnitId}</text>
            <rect x={W - PAD - 12} y={Y_MAPPER - 7} width="12" height="6" rx="1.5" fill="#0E4D92" />
          </g>
        )}

        {/* strip segmen + label */}
        {rects.map((r) => (
          <g key={r.id}>
            <rect x={r.x} y={stripY} width={Math.max(0, r.w - 2)} height={BAR_H} rx="4" fill={conditionColor(r.conditionScore)} opacity={0.9} />
            <text x={r.x + r.w / 2} y={stripY + BAR_H + 13} fontSize="8.5" textAnchor="middle" fill="#475569">{r.name}</text>
            <text x={r.x + r.w / 2} y={stripY + BAR_H + 23} fontSize="8" textAnchor="middle" fill="#94a3b8">{r.condition} · {r.hazardCount} bahaya</text>
          </g>
        ))}

        {/* penanda bahaya: stalk tipis ke strip + bulatan (biasa) atau segitiga (mendesak) */}
        {placed.map((m) => {
          const my = LANE_TOP + m.lane * LANE_STEP;
          const r = 3.4 + m.severity * 1.4;
          const title = (
            <title>
              {hazardLabel(m.type)} · KM {m.positionKm.toFixed(1)} · tingkat keparahan {(m.severity * 100).toFixed(0)}%
              {m.urgent ? " · perlu tindakan segera" : ""}
            </title>
          );
          return (
            <g key={m.id}>
              <line x1={m.x} y1={my} x2={m.x} y2={stripY} stroke="#e2e8f0" strokeWidth="0.8" />
              {m.urgent ? (
                <polygon
                  points={`${m.x},${my - r - 1.5} ${m.x - r - 1},${my + r} ${m.x + r + 1},${my + r}`}
                  fill={hazardColor(m.type)}
                  stroke="#7f1d1d"
                  strokeWidth="1.4"
                >
                  {title}
                </polygon>
              ) : (
                <circle cx={m.x} cy={my} r={r} fill={hazardColor(m.type)} stroke="#fff" strokeWidth="1.3">
                  {title}
                </circle>
              )}
            </g>
          );
        })}

        {/* Truk live (GPS simulasi) — penanda bergerak pada strip; truk sendiri (driver) disorot per status */}
        {trucks.map((t) => {
          const isSelf = selfUnitId != null && t.unitId === selfUnitId;
          const tcx = xOf(t.progressKm);
          const tcy = stripY + BAR_H / 2;
          const color = isSelf ? ACTUAL_COLOR[selfStatus] : "#1e3a8a";
          const tr = isSelf ? 6 : 3.4;
          return (
            <g key={`truck-${t.unitId}`}>
              <circle cx={tcx} cy={tcy} r={tr} fill={color} stroke="#fff" strokeWidth={isSelf ? 2 : 1.2} opacity={isSelf ? 1 : 0.85}>
                <title>{t.unitId} · {t.groundSpeedKmh.toFixed(0)} km/jam (GPS) · KM {t.progressKm.toFixed(1)}</title>
              </circle>
              {isSelf && (
                <text x={tcx} y={tcy - tr - 4} fontSize="9" fontWeight="bold" textAnchor="middle" fill={color}>
                  {t.unitId} · {t.groundSpeedKmh.toFixed(0)} km/jam
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* legenda */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {legend.map(([type, n]) => (
          <span key={type} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hazardColor(type) }} />
            {hazardLabel(type)} <span className="text-slate-400">({n})</span>
          </span>
        ))}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
        <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
          <polygon points="6,1 11,11 1,11" fill="#94a3b8" stroke="#7f1d1d" strokeWidth="1" />
        </svg>
        Bentuk segitiga = perlu tindakan segera <span className="text-slate-400">({urgentCount})</span>
      </div>
      {trucks.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-900" />
          Posisi truk live dari GPS <span className="text-slate-400">({trucks.length})</span>
        </div>
      )}
    </div>
  );
}
