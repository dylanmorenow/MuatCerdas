// Revisi F3 — peta bahaya jalan LiDAR (prototipe). Strip rute KM33→Jetty bersegmen (warna kondisi)
// + penanda bahaya per posisi km (warna per tipe) + legenda. Data SIMULASI mewakili keluaran LiDAR
// (device di truk pemeta lead/last) — BUKAN feed live.
import { conditionColor, hazardColor, hazardLabel, type HazardType } from "@muatcerdas/shared";
import type { RoadMapData } from "../api/roadmap";

export function HazardMap({ data, height = 150 }: { data: RoadMapData; height?: number }) {
  const { segments, hazards, mappers } = data;
  const total = data.routeLengthKm || segments.reduce((s, x) => s + x.lengthKm, 0) || 1;
  const W = 760;
  const pad = 12;
  const innerW = W - pad * 2;
  const stripY = 60;
  const barH = 22;

  // posisi awal km tiap segmen (untuk strip)
  let acc = 0;
  const rects = segments.map((s) => {
    const x = pad + (acc / total) * innerW;
    const w = (s.lengthKm / total) * innerW;
    acc += s.lengthKm;
    return { ...s, x, w };
  });

  // penanda bahaya: x dari positionKm; y jitter di atas strip agar tak menumpuk
  const marks = hazards.map((h, i) => ({
    ...h,
    x: pad + (Math.min(h.positionKm, total) / total) * innerW,
    y: 30 + ((i % 3) - 1) * 9,
    r: 3 + Math.round(h.severity * 3),
  }));

  // legenda: tipe yang muncul + jumlah
  const counts = new Map<HazardType, number>();
  for (const h of hazards) counts.set(h.type, (counts.get(h.type) ?? 0) + 1);
  const legend = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label="Peta bahaya jalan LiDAR KM33 → Jetty">
        <text x={pad} y="14" fontSize="11" fontWeight="bold" fill="#334155">KM 33 (CPP)</text>
        <text x={W - pad} y="14" fontSize="11" fontWeight="bold" fill="#334155" textAnchor="end">Jetty · PT Indexim Coalindo</text>
        {mappers.leadUnitId && (
          <text x={W - pad} y="26" fontSize="9" fill="#0E4D92" textAnchor="end">🚛 pemeta depan (LiDAR): {mappers.leadUnitId}</text>
        )}
        {mappers.lastUnitId && (
          <text x={pad} y="26" fontSize="9" fill="#0E4D92">🚛 pemeta belakang: {mappers.lastUnitId}</text>
        )}

        {/* strip segmen */}
        {rects.map((r) => (
          <g key={r.id}>
            <rect x={r.x} y={stripY} width={Math.max(0, r.w - 2)} height={barH} rx="3" fill={conditionColor(r.conditionScore)} opacity={0.85} />
            <text x={r.x + r.w / 2} y={stripY + barH + 13} fontSize="8.5" textAnchor="middle" fill="#475569">{r.name}</text>
            <text x={r.x + r.w / 2} y={stripY + barH + 23} fontSize="8" textAnchor="middle" fill="#94a3b8">{r.condition} · {r.hazardCount} bahaya</text>
          </g>
        ))}

        {/* garis penghubung penanda → strip + penanda bahaya */}
        {marks.map((m) => (
          <g key={m.id}>
            <line x1={m.x} y1={m.y + m.r} x2={m.x} y2={stripY} stroke="#cbd5e1" strokeWidth="0.8" />
            <circle cx={m.x} cy={m.y} r={m.r} fill={hazardColor(m.type)} stroke="#fff" strokeWidth="1">
              <title>{hazardLabel(m.type)} · KM {m.positionKm.toFixed(1)} · severity {(m.severity * 100).toFixed(0)}%</title>
            </circle>
          </g>
        ))}
      </svg>

      {/* legenda */}
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {legend.map(([type, n]) => (
          <span key={type} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: hazardColor(type) }} />
            {hazardLabel(type)} <span className="text-slate-400">({n})</span>
          </span>
        ))}
      </div>
    </div>
  );
}
