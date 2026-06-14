// Bar atribusi penyebab keausan (§12.2) — Recharts horizontal bar (km shortfall per faktor).
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatNumber } from "@muatcerdas/shared";
import type { FactorContribution } from "../api/tires";

export function FactorBarChart({ contributions }: { contributions: FactorContribution[] }) {
  const data = contributions.filter((c) => Math.abs(c.contribution) >= 1);
  if (data.length === 0) {
    return <p className="text-sm text-slate-500">Tidak ada shortfall berarti — unit mendekati best-practice.</p>;
  }
  return (
    <div style={{ width: "100%", height: Math.max(150, data.length * 46) }}>
      <ResponsiveContainer>
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 28, top: 4, bottom: 4 }}>
          <XAxis type="number" tickFormatter={(v: number) => formatNumber(v)} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="factor" width={104} tick={{ fontSize: 12 }} />
          <Tooltip
            formatter={(v) => [`${formatNumber(Number(v))} km`, "Kontribusi"]}
            labelStyle={{ fontWeight: 600 }}
          />
          <Bar dataKey="contribution" radius={[0, 4, 4, 0]}>
            {data.map((c) => (
              <Cell key={c.factor} fill={c.contribution >= 0 ? "#0E4D92" : "#10b981"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
