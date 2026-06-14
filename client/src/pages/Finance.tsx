import { useEffect, useState, type ReactNode } from "react";
import {
  formatNumber,
  formatRupiah,
  formatPersen,
  financialSummary,
  tireAvoidableCost,
  type CostParams,
} from "@muatcerdas/shared";
import { useFinance, useSaveParams, useResetParams } from "../api/finance";
import { PageHeader, Card, Loading, ErrorState, InfoTip, cx } from "../components/ui";

const SCENARIO_FLEETS = [20, 30, 40, 54];

export function Finance() {
  const { data, isLoading, error, refetch } = useFinance();
  const save = useSaveParams();
  const reset = useResetParams();

  const [form, setForm] = useState<CostParams | null>(null);
  const [useModelLife, setUseModelLife] = useState(false);

  useEffect(() => {
    if (data) setForm(data.params);
  }, [data]);

  if (isLoading || !form) {
    return (
      <>
        <PageHeader title="Finansial & ROI" />
        {error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : <Loading />}
      </>
    );
  }

  const derived = data!.derived;
  const dirty = JSON.stringify(form) !== JSON.stringify(data!.params);
  const set = (k: keyof CostParams, v: number) => setForm((f) => (f ? { ...f, [k]: v } : f));

  // Perhitungan LIVE lokal via shared (SR-V5; <300 ms).
  const effective: CostParams = {
    ...form,
    tireLifeActualKm: useModelLife ? derived.modelTireLifeKm : form.tireLifeActualKm,
  };
  const overloadCost = effective.overloadWearCostFactorIdr * derived.overloadRateSum;
  const summary = financialSummary(effective, { overloadCost });
  const tac = tireAvoidableCost(effective);

  return (
    <>
      <PageHeader
        title="Finansial & ROI"
        subtitle="Asumsi editable (tersimpan di DB) — hasil dihitung langsung. Semua nilai bertanda ASUMSI."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Reset ke default
            </button>
            <button
              onClick={() => save.mutate(form)}
              disabled={!dirty || save.isPending}
              className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-40"
            >
              {save.isPending ? "Menyimpan…" : dirty ? "Simpan" : "Tersimpan"}
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Form asumsi */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Modul A — Ban</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField label="Harga ban" unit="Rp" value={form.tirePriceIdr} onChange={(v) => set("tirePriceIdr", v)} hint={formatRupiah(form.tirePriceIdr)} />
              <NumberField label="Ban / unit" value={form.tiresPerUnit} onChange={(v) => set("tiresPerUnit", v)} />
              <NumberField label="Km / tahun" unit="km" value={form.kmPerYear} onChange={(v) => set("kmPerYear", v)} />
              <NumberField
                label="Umur aktual"
                unit="km"
                value={form.tireLifeActualKm}
                onChange={(v) => set("tireLifeActualKm", v)}
                disabled={useModelLife}
                hint={useModelLife ? `pakai model: ${formatNumber(derived.modelTireLifeKm)}` : undefined}
              />
              <NumberField label="Umur best-practice" unit="km" value={form.tireLifeBestKm} onChange={(v) => set("tireLifeBestKm", v)} />
              <NumberField label="Capture rate" unit="0–1" step={0.05} value={form.captureRate} onChange={(v) => set("captureRate", v)} hint={formatPersen(form.captureRate)} />
              <NumberField label="Ukuran armada" value={form.fleetSize} onChange={(v) => set("fleetSize", v)} />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={useModelLife} onChange={(e) => setUseModelLife(e.target.checked)} />
              Pakai umur ban aktual dari model §12.1 ({formatNumber(derived.modelTireLifeKm)} km)
              <InfoTip text="What-if: ganti 'umur aktual' dengan rata-rata prediksi model M4. Tidak ikut tersimpan; default mati agar angka sanity terjaga." />
            </label>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Inti — Platform</h2>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="CapEx" unit="Rp" value={form.capexIdr} onChange={(v) => set("capexIdr", v)} hint={formatRupiah(form.capexIdr)} />
              <NumberField label="OpEx / tahun" unit="Rp" value={form.opexAnnualIdr} onChange={(v) => set("opexAnnualIdr", v)} hint={formatRupiah(form.opexAnnualIdr)} />
            </div>
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold text-slate-800">
              Modul B — Payload
              <InfoTip text="Lever payload. Default 0 (placeholder) — isi untuk mengaktifkan biaya underload/overload." />
            </h2>
            <p className="mb-3 text-xs text-slate-400">Σ overloadRate armada = {formatNumber(derived.overloadRateSum, 2)} (dari data).</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Biaya BBM / trip" unit="Rp" value={form.fuelCostPerTripIdr} onChange={(v) => set("fuelCostPerTripIdr", v)} hint={formatRupiah(form.fuelCostPerTripIdr)} />
              <NumberField label="Trip / tahun" value={form.tripsPerYear} onChange={(v) => set("tripsPerYear", v)} />
              <NumberField label="Underload %" unit="0–1" step={0.01} value={form.underloadPct} onChange={(v) => set("underloadPct", v)} hint={formatPersen(form.underloadPct)} />
              <NumberField label="Faktor keausan overload" unit="Rp" value={form.overloadWearCostFactorIdr} onChange={(v) => set("overloadWearCostFactorIdr", v)} hint={formatRupiah(form.overloadWearCostFactorIdr)} />
            </div>
          </Card>
        </div>

        {/* Hasil live */}
        <div className="space-y-4">
          <Card className="bg-kpp-green text-white">
            <div className="text-xs uppercase tracking-wide text-white/70">Total penghematan / tahun</div>
            <div className="mt-1 text-2xl font-bold">{formatRupiah(summary.annualSavings)}</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-white/70">Payback</div>
                <div className="text-lg font-semibold">
                  {Number.isFinite(summary.paybackMonths) ? `${formatNumber(summary.paybackMonths, 1)} bln` : "—"}
                </div>
              </div>
              <div>
                <div className="text-xs text-white/70">ROI tahun-1</div>
                <div className="text-lg font-semibold">{formatPersen(summary.roiYear1)}</div>
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Rincian (§12.7–§12.9)</h2>
            <dl className="space-y-2 text-sm">
              <ResultRow label="Ban dapat-dihindari / unit" value={`${formatNumber(tac.avoidableTires, 2)} ban`} />
              <ResultRow label="Biaya ban terhindarkan / unit" value={formatRupiah(tac.avoidableCostPerUnit)} />
              <ResultRow label="Tertangkap / unit" value={formatRupiah(tac.capturedPerUnit)} />
              <ResultRow label="Biaya ban terhindarkan / armada" value={formatRupiah(summary.fleetCaptured)} strong />
              <ResultRow label="Biaya underload / th" value={formatRupiah(summary.underloadExtraCost)} />
              <ResultRow label="Biaya overload / th" value={formatRupiah(summary.overloadCost)} />
            </dl>
          </Card>
        </div>
      </div>

      {/* Skenario armada */}
      <Card className="mt-5 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-800">
            Skenario armada
            <InfoTip text="KPI pada beberapa ukuran armada (asumsi lain tetap)." />
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Armada</th>
              <th className="px-4 py-2.5 font-medium">Biaya ban terhindarkan / th</th>
              <th className="px-4 py-2.5 font-medium">Penghematan / th</th>
              <th className="px-4 py-2.5 font-medium">Payback</th>
              <th className="px-4 py-2.5 font-medium">ROI thn-1</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SCENARIO_FLEETS.map((fs) => {
              const s = financialSummary({ ...effective, fleetSize: fs }, { overloadCost });
              return (
                <tr key={fs} className={cx(fs === form.fleetSize && "bg-emerald-50/50")}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{fs} unit{fs === form.fleetSize ? " (kini)" : ""}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatRupiah(s.fleetCaptured)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatRupiah(s.annualSavings)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{Number.isFinite(s.paybackMonths) ? `${formatNumber(s.paybackMonths, 1)} bln` : "—"}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatPersen(s.roiYear1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  step,
  hint,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  hint?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        {unit && <span className="text-slate-400">{unit}</span>}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cx(
          "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm",
          disabled && "bg-slate-100 text-slate-400",
        )}
      />
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}

function ResultRow({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className={cx("font-medium", strong ? "text-base font-bold text-kpp-green" : "text-slate-800")}>{value}</dd>
    </div>
  );
}
