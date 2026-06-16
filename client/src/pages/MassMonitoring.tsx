// Revisi F2 — Mass Monitoring (surveyor). Laporan massa real-time per HD785 (massa + material
// coal/OB + nama operator excavator) dari input operator, plus alat panduan pemuatan excavator.
import { useState } from "react";
import {
  formatNumber,
  formatPersen,
  formatTon,
  materialLabel,
  loadingStatus,
  loadingPolicy,
  loadingStatusFromBuckets,
  bucketsTotal,
  EXCAVATOR_BUCKET_M3,
  MATERIAL_DENSITY_T_PER_M3,
} from "@muatcerdas/shared";
import { useMassMonitoring, useOperatorData, type MassInputRow } from "../api/mass";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";
import { LoadingLight } from "../components/LoadingLight";

const TARGET_KG = 91_000;
const STATUS_TONE: Record<string, { tone: "amber" | "green" | "red"; label: string }> = {
  amber: { tone: "amber", label: "kurang/over" },
  green: { tone: "green", label: "pas" },
  red: { tone: "red", label: "overload" },
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} mnt lalu`;
  const h = Math.floor(mins / 60);
  return `${h} jam ${mins % 60} mnt lalu`;
}

export function MassMonitoring() {
  const { data, isLoading, error, refetch } = useMassMonitoring();
  const { data: opData } = useOperatorData();

  return (
    <>
      <PageHeader
        title="Mass Monitoring"
        subtitle="Laporan massa muatan HD785 real-time dari input operator (massa, material, operator excavator) + panduan pemuatan. Data contoh/operator — bukan feed timbangan live."
      />

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Batubara hari ini" value={`${formatNumber(data.todayCoalT)} t`} hint="dari laporan operator" />
            <Stat label="Overburden hari ini" value={`${formatNumber(data.todayOverburdenT)} t`} />
            <Stat label="Laporan hari ini" value={formatNumber(data.reportsToday)} hint="event massa" />
            <Stat label="HD785 terlapor" value={formatNumber(data.hd785.length)} hint="unit dgn laporan" />
          </div>

          {/* Tabel real-time per HD785 */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-800">
                Real-time per HD785
                <InfoTip text="Muatan TERAKHIR yang dilaporkan tiap HD785. Warna: hijau pas (95–110% × 91 t), kuning kurang, merah overload. Auto-refresh tiap 15 dtk." />
              </h2>
              <span className="text-xs text-slate-400">target 91 t</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Unit</th>
                    <th className="px-4 py-2.5 font-medium">Material</th>
                    <th className="px-4 py-2.5 font-medium">Massa terakhir</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Operator excavator</th>
                    <th className="px-4 py-2.5 font-medium">Pelapor</th>
                    <th className="px-4 py-2.5 font-medium">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.hd785.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        Belum ada laporan massa. Operator HD785 mengirim dari Driver Dashboard.
                      </td>
                    </tr>
                  )}
                  {data.hd785.map((r) => {
                    const st = STATUS_TONE[loadingStatus(r.totalT * 1000, TARGET_KG)] ?? STATUS_TONE.amber!;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{r.unitId}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={r.material === "coal" ? "blue" : "slate"}>{materialLabel(r.material as "coal" | "overburden" | null)}</Badge>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{formatTon(r.totalT * 1000)}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{r.excavatorOperator ?? "—"}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.operatorName}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{timeAgo(r.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Data operator dikelompokkan per jenis */}
          {opData && opData.groups.length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {opData.groups.map((g) => (
                <Card key={g.key} className="overflow-hidden p-0">
                  <div className="border-b border-slate-200 px-5 py-3">
                    <h2 className="font-semibold text-slate-800">{g.label}</h2>
                    <p className="text-xs text-slate-400">{g.rows.length} laporan</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-slate-100">
                        {g.rows.slice(0, 20).map((r) => (
                          <OperatorRow key={r.id} r={r} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Panduan pemuatan excavator (policy + simulasi) */}
          <ExcavatorGuidance />
        </>
      )}
    </>
  );
}

function OperatorRow({ r }: { r: MassInputRow }) {
  const buckets = r.bucket1T != null || r.bucket2T != null;
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-2 font-medium text-slate-700">{r.unitId}</td>
      <td className="px-4 py-2 text-slate-600">{materialLabel(r.material as "coal" | "overburden" | null)}</td>
      <td className="px-4 py-2 text-slate-800">
        {formatTon(r.totalT * 1000)}
        {buckets && (
          <span className="ml-1 text-xs text-slate-400">
            ({formatNumber(r.bucket1T ?? 0, 1)} + {formatNumber(r.bucket2T ?? 0, 1)})
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-slate-500">{r.excavatorOperator ?? r.operatorName}</td>
    </tr>
  );
}

const EXCAVATORS = Object.keys(EXCAVATOR_BUCKET_M3);
const MATERIALS = Object.keys(MATERIAL_DENSITY_T_PER_M3);

/** Alat panduan pemuatan excavator (FR-0002-10/11): policy + simulasi bucket hijau/kuning/merah. */
function ExcavatorGuidance() {
  const [excavator, setExcavator] = useState(EXCAVATORS[0] ?? "PC2000");
  const [material, setMaterial] = useState(MATERIALS[0] ?? "Batubara");
  const [targetT, setTargetT] = useState(91);
  const [buckets, setBuckets] = useState<number[]>([]);

  const targetKg = targetT * 1000;
  const bucketM3 = EXCAVATOR_BUCKET_M3[excavator] ?? 11;
  const density = MATERIAL_DENSITY_T_PER_M3[material] ?? 0.9;
  const policy = loadingPolicy({ targetKg, bucketCapacityM3: bucketM3, materialDensityTPerM3: density });

  const total = bucketsTotal(buckets);
  const status = buckets.length ? loadingStatusFromBuckets(buckets, targetKg) : "green";
  const pctTarget = total / targetKg;

  return (
    <div className="mt-5">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-400">Panduan pemuatan excavator</h2>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <h3 className="mb-1 font-semibold text-slate-800">
            Loading policy
            <InfoTip text="Generator jumlah pass & band target. Kapasitas bucket & densitas = ASUMSI, dapat dikoreksi." />
          </h3>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <Field label="Excavator">
              <select value={excavator} onChange={(e) => setExcavator(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {EXCAVATORS.map((x) => (
                  <option key={x} value={x}>{x}</option>
                ))}
              </select>
            </Field>
            <Field label="Material">
              <select value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {MATERIALS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </Field>
            <Field label="Target (t)">
              <input type="number" value={targetT} min={1} onChange={(e) => setTargetT(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm" />
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Per pass" value={`${formatNumber(policy.perPassKg / 1000, 1)} t`} hint={`${formatNumber(bucketM3, 1)} m³ × ${formatNumber(density, 2)} t/m³`} />
            <Stat label="Pass disarankan" value={`${policy.suggestedPasses}×`} hint={`≈ ${formatNumber(Math.round(policy.effectivePayloadKg / 1000))} t`} />
            <Stat label="Band target" value={`${formatNumber(policy.targetBandKg[0] / 1000, 1)}–${formatNumber(policy.targetBandKg[1] / 1000, 1)} t`} hint="95–110%" />
          </div>
        </Card>

        <Card>
          <h3 className="mb-1 font-semibold text-slate-800">
            Simulasi pemuatan
            <InfoTip text="Tambah pass untuk melihat total berjalan & indikator. §12.5: <95% kuning, 95–110% hijau, >110% merah." />
          </h3>
          <LoadingLight status={status} />
          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-800">{formatNumber(total / 1000, 1)}</span>
              <span className="ml-1 text-sm text-slate-500">t / {formatNumber(targetKg / 1000, 0)} t</span>
            </div>
            <span className="text-sm font-medium text-slate-600">{formatPersen(pctTarget)} target</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div className={`h-full ${status === "red" ? "bg-red-500" : status === "amber" ? "bg-amber-400" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, pctTarget * 100)}%` }} />
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button onClick={() => setBuckets((b) => [...b, policy.perPassKg])} className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90">
              + 1 pass (≈{formatNumber(policy.perPassKg / 1000, 1)} t)
            </button>
            <button onClick={() => setBuckets([])} className="ml-auto rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
              Reset
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-slate-500">{label}</span>
      {children}
    </label>
  );
}
