import { useState } from "react";
import {
  formatNumber,
  formatPersen,
  loadingPolicy,
  loadingStatusFromBuckets,
  bucketsTotal,
  EXCAVATOR_BUCKET_M3,
  MATERIAL_DENSITY_T_PER_M3,
} from "@muatcerdas/shared";
import { PageHeader, Card, Stat, InfoTip } from "../components/ui";
import { LoadingLight } from "../components/LoadingLight";

const EXCAVATORS = Object.keys(EXCAVATOR_BUCKET_M3);
const MATERIALS = Object.keys(MATERIAL_DENSITY_T_PER_M3);

export function LoadingGuidance() {
  const [excavator, setExcavator] = useState(EXCAVATORS[0] ?? "PC2000");
  const [material, setMaterial] = useState(MATERIALS[0] ?? "Batubara");
  const [targetT, setTargetT] = useState(91);
  const [buckets, setBuckets] = useState<number[]>([]); // kg per pass
  const [manualT, setManualT] = useState("");

  const targetKg = targetT * 1000;
  const bucketM3 = EXCAVATOR_BUCKET_M3[excavator] ?? 11;
  const density = MATERIAL_DENSITY_T_PER_M3[material] ?? 0.9;
  const policy = loadingPolicy({ targetKg, bucketCapacityM3: bucketM3, materialDensityTPerM3: density });

  const total = bucketsTotal(buckets);
  const status = buckets.length ? loadingStatusFromBuckets(buckets, targetKg) : "green";
  const pctTarget = total / targetKg;

  const addPass = () => setBuckets((b) => [...b, policy.perPassKg]);
  const addManual = () => {
    const t = Number(manualT);
    if (Number.isFinite(t) && t > 0) setBuckets((b) => [...b, t * 1000]);
    setManualT("");
  };

  return (
    <>
      <PageHeader
        title="Mass Monitoring"
        subtitle="Pemantauan massa muatan HD785 ke target 91 t: kebijakan pemuatan + indikator hijau/kuning/merah. (Laporan real-time per unit dari input operator — menyusul.)"
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Generator policy */}
        <Card>
          <h2 className="mb-1 font-semibold text-slate-800">
            Loading policy
            <InfoTip text="Generator jumlah pass & band target. Kapasitas bucket excavator & densitas material = ASUMSI, dapat dikoreksi." />
          </h2>
          <p className="mb-4 text-xs text-slate-400">Nilai bucket/densitas = asumsi (PRD §16).</p>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Excavator">
              <select value={excavator} onChange={(e) => setExcavator(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {EXCAVATORS.map((x) => (
                  <option key={x} value={x}>
                    {x}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Material">
              <select value={material} onChange={(e) => setMaterial(e.target.value)} className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm">
                {MATERIALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Target (t)">
              <input
                type="number"
                value={targetT}
                min={1}
                onChange={(e) => setTargetT(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
            </Field>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Stat label="Per pass" value={`${formatNumber(Math.round(policy.perPassKg / 100) / 10, 1)} t`} hint={`${formatNumber(bucketM3, 1)} m³ × ${formatNumber(density, 2)} t/m³`} />
            <Stat label="Pass disarankan" value={`${policy.suggestedPasses}×`} hint={`≈ ${formatNumber(Math.round(policy.effectivePayloadKg / 1000))} t`} />
            <Stat label="Band target" value={`${formatNumber(policy.targetBandKg[0] / 1000, 1)}–${formatNumber(policy.targetBandKg[1] / 1000, 1)} t`} hint="95–110%" />
          </div>
        </Card>

        {/* Kalkulator bucket */}
        <Card>
          <h2 className="mb-1 font-semibold text-slate-800">
            Simulasi pemuatan
            <InfoTip text="Tambah pass/bucket untuk melihat total berjalan & indikator. §12.5: <95% hijau, 95–110% kuning, >110% merah." />
          </h2>
          <p className="mb-4 text-xs text-slate-400">Tambah bucket → pantau indikator.</p>

          <LoadingLight status={status} />

          <div className="mt-4 flex items-baseline justify-between">
            <div>
              <span className="text-2xl font-bold text-slate-800">{formatNumber(total / 1000, 1)}</span>
              <span className="ml-1 text-sm text-slate-500">t / {formatNumber(targetKg / 1000, 0)} t</span>
            </div>
            <span className="text-sm font-medium text-slate-600">{formatPersen(pctTarget)} target</span>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full ${status === "red" ? "bg-red-500" : status === "amber" ? "bg-amber-400" : "bg-emerald-500"}`}
              style={{ width: `${Math.min(100, pctTarget * 100)}%` }}
            />
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <button onClick={addPass} className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90">
              + 1 pass (≈{formatNumber(policy.perPassKg / 1000, 1)} t)
            </button>
            <div className="flex items-end gap-1">
              <input
                type="number"
                value={manualT}
                placeholder="ton"
                onChange={(e) => setManualT(e.target.value)}
                className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button onClick={addManual} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                Tambah
              </button>
            </div>
            <button onClick={() => setBuckets([])} className="ml-auto rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100">
              Reset
            </button>
          </div>

          {buckets.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {buckets.map((b, i) => (
                <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                  {formatNumber(b / 1000, 1)} t
                </span>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
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
