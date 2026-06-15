// Visualisasi skematik rute KM33 → Jetty (SVG) — segmen berwarna per kondisi + truk pemeta
// (lead/last). Prototipe atas data contoh (mewakili LIDAR), bukan feed live (MODULE_D §4).
import { conditionColor } from "@muatcerdas/shared";

interface Seg {
  id: string;
  name: string;
  lengthKm: number;
  conditionScore: number;
  condition: string;
}

export function RoadMapStrip({
  segments,
  mappers,
}: {
  segments: Seg[];
  mappers: { leadUnitId: string | null; lastUnitId: string | null };
}) {
  const total = segments.reduce((s, x) => s + x.lengthKm, 0) || 1;
  const W = 760;
  const innerW = W - 20;
  const y = 30;
  const barH = 24;
  let cx = 10;
  const rects = segments.map((s) => {
    const w = (s.lengthKm / total) * innerW;
    const r = { ...s, x: cx, w };
    cx += w;
    return r;
  });

  return (
    <svg viewBox={`0 0 ${W} 96`} className="w-full" role="img" aria-label="Peta kondisi jalan KM33 → Jetty">
      <text x="10" y="14" fontSize="11" fontWeight="bold" fill="#334155">KM 33 (CPP)</text>
      <text x={W - 10} y="14" fontSize="11" fontWeight="bold" fill="#334155" textAnchor="end">Jetty</text>

      {mappers.lastUnitId && (
        <text x="10" y="25" fontSize="9" fill="#0E4D92">🚛 {mappers.lastUnitId} · pemeta belakang</text>
      )}
      {mappers.leadUnitId && (
        <text x={W - 10} y="25" fontSize="9" fill="#0E4D92" textAnchor="end">pemeta depan · {mappers.leadUnitId} 🚛</text>
      )}

      {rects.map((r) => (
        <g key={r.id}>
          <rect x={r.x} y={y} width={Math.max(0, r.w - 2)} height={barH} rx="3" fill={conditionColor(r.conditionScore)} />
          <text x={r.x + r.w / 2} y={y + barH + 13} fontSize="9" textAnchor="middle" fill="#475569">{r.name}</text>
          <text x={r.x + r.w / 2} y={y + barH + 24} fontSize="8" textAnchor="middle" fill="#94a3b8">{r.condition} · {r.lengthKm} km</text>
        </g>
      ))}
    </svg>
  );
}
