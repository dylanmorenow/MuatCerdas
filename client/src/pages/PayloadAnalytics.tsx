import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { formatNumber, formatPersen, formatRupiah } from "@muatcerdas/shared";
import { usePayloadAnalytics, type PayloadFilter, type PayloadStats, type GroupStat } from "../api/payload";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";

const TARGET_KG = 91_000;
const C_UNDER = "#f59e0b";
const C_OK = "#10b981";
const C_OVER = "#ef4444";

function bandColor(midpointKg: number): string {
  const r = midpointKg / TARGET_KG;
  if (r < 0.95) return C_UNDER;
  if (r > 1.1) return C_OVER;
  return C_OK;
}

export function PayloadAnalytics() {
  const [filter, setFilter] = useState<PayloadFilter>({});
  const { data, isLoading, error, refetch } = usePayloadAnalytics(filter);

  return (
    <>
      <PageHeader
        title="Payload — Analitik"
        subtitle="Distribusi payload HD785 terhadap target 91 t: % under / ok / over, statistik, tren, dan kaitan overload."
      />

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          {/* Filter */}
          <div className="mb-5 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Unit (HD785)</span>
              <select
                value={filter.unitId ?? ""}
                onChange={(e) => setFilter((f) => ({ ...f, unitId: e.target.value || undefined }))}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Semua unit</option>
                {data.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Operator</span>
              <select
                value={filter.operatorId ?? ""}
                onChange={(e) => setFilter((f) => ({ ...f, operatorId: e.target.value || undefined }))}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Semua operator</option>
                {data.operators.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </label>
            {(filter.unitId || filter.operatorId) && (
              <button
                onClick={() => setFilter({})}
                className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                Reset filter
              </button>
            )}
          </div>

          {/* KPI */}
          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Event payload" value={formatNumber(data.overall.count)} hint={`rata-rata ${formatNumber(Math.round(data.overall.mean))} kg`} />
            <Stat label="Under (<95%)" value={<span className="text-amber-600">{formatPersen(data.overall.underPct)}</span>} hint={`${formatNumber(data.overall.underCount)} event`} />
            <Stat label="OK (95–110%)" value={<span className="text-emerald-600">{formatPersen(data.overall.okPct)}</span>} hint={`${formatNumber(data.overall.okCount)} event`} />
            <Stat label="Over (>110%)" value={<span className="text-red-600">{formatPersen(data.overall.overPct)}</span>} hint={`${formatNumber(data.overall.overCount)} event`} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Histogram */}
            <Card>
              <h2 className="mb-3 font-semibold text-slate-800">
                Distribusi payload (vs 91 t)
                <InfoTip text="Sebaran payload terukur. Bar dwarna: kuning <95%, hijau 95–110%, merah >110% target." />
              </h2>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <BarChart data={data.histogram} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} interval={1} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => [`${formatNumber(Number(v))} event`, "Jumlah"]} labelFormatter={(l) => `${l} t`} />
                    <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                      {data.histogram.map((b) => (
                        <Cell key={b.label} fill={bandColor((b.from + b.to) / 2)} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-1 text-center text-xs text-slate-400">payload (ton)</p>
            </Card>

            {/* Tren */}
            <Card>
              <h2 className="mb-3 font-semibold text-slate-800">Tren rata-rata payload</h2>
              <div style={{ width: "100%", height: 240 }}>
                <ResponsiveContainer>
                  <LineChart data={data.trend} margin={{ top: 4, right: 8, left: -8, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 9 }} tickFormatter={(d: string) => d.slice(5)} minTickGap={24} />
                    <YAxis domain={["dataMin - 3000", "dataMax + 3000"]} tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v / 1000)}t`} />
                    <Tooltip formatter={(v) => [`${formatNumber(Number(v))} kg`, "Rata-rata"]} />
                    <ReferenceLine y={TARGET_KG} stroke="#0E4D92" strokeDasharray="4 4" label={{ value: "91 t", fontSize: 10, fill: "#0E4D92" }} />
                    <Line type="monotone" dataKey="mean" stroke="#0E4D92" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          {/* Breakdown + overload */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <BreakdownTable title="Per unit (HD785)" rows={data.byUnit} />
            <BreakdownTable title="Per operator" rows={data.byOperator} />
          </div>

          {/* Overload → keausan */}
          <Card className="mt-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">
                Kaitan overload → keausan
                <InfoTip text="overloadRate = #over / #event per unit (§12.4). Biaya = rate × faktor keausan." />
              </h2>
              <Badge tone="slate">Faktor keausan = Rp0 (asumsi)</Badge>
            </div>
            <p className="mb-3 text-xs text-slate-400">
              Biaya Rupiah masih 0 hingga faktor keausan disetel di Finansial (M6). overloadRate adalah sinyal nyata per unit.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-2 py-2 font-medium">Unit</th>
                    <th className="px-2 py-2 font-medium">Event</th>
                    <th className="px-2 py-2 font-medium">Over</th>
                    <th className="px-2 py-2 font-medium">Overload rate</th>
                    <th className="px-2 py-2 text-right font-medium">Biaya keausan/th</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.overloadWear.byUnit.map((u) => (
                    <tr key={u.unitId}>
                      <td className="px-2 py-2 font-medium text-slate-700">{u.unitId}</td>
                      <td className="px-2 py-2 text-slate-500">{formatNumber(u.events)}</td>
                      <td className="px-2 py-2 text-slate-500">{formatNumber(u.overEvents)}</td>
                      <td className="px-2 py-2">
                        <span className={u.overloadRate > 0.1 ? "font-medium text-red-600" : "text-slate-700"}>
                          {formatPersen(u.overloadRate)}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-right text-slate-400">{formatRupiah(u.costIdr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}

function BreakdownTable({ title, rows }: { title: string; rows: GroupStat[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-slate-200 px-5 py-3">
        <h2 className="font-semibold text-slate-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">{title.includes("operator") ? "Operator" : "Unit"}</th>
              <th className="px-4 py-2.5 font-medium">Event</th>
              <th className="px-4 py-2.5 font-medium">Mean</th>
              <th className="px-4 py-2.5 font-medium">Under</th>
              <th className="px-4 py-2.5 font-medium">OK</th>
              <th className="px-4 py-2.5 font-medium">Over</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-700">{r.label}</td>
                <td className="px-4 py-2.5 text-slate-500">{formatNumber(r.stats.count)}</td>
                <td className="px-4 py-2.5 text-slate-600">{formatNumber(Math.round(r.stats.mean))}</td>
                <td className="px-4 py-2.5 text-amber-600">{formatPersen(r.stats.underPct)}</td>
                <td className="px-4 py-2.5 text-emerald-600">{formatPersen(r.stats.okPct)}</td>
                <td className="px-4 py-2.5 text-red-600">{formatPersen(r.stats.overPct)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
