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
        title="Finansial"
        subtitle="Semua asumsi bisa diubah dan langsung tersimpan, lalu hasilnya dihitung ulang seketika. Semua nilai di sini adalah asumsi."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Kembalikan ke awal
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
            <h2 className="mb-3 font-semibold text-slate-800">Ban truk hauling</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField label="Harga ban" unit="Rp" value={form.tirePriceIdr} onChange={(v) => set("tirePriceIdr", v)} hint={formatRupiah(form.tirePriceIdr)} />
              <NumberField label="Jumlah ban per unit" value={form.tiresPerUnit} onChange={(v) => set("tiresPerUnit", v)} />
              <NumberField label="Km per tahun" unit="km" value={form.kmPerYear} onChange={(v) => set("kmPerYear", v)} />
              <NumberField
                label="Umur ban sekarang"
                unit="km"
                value={form.tireLifeActualKm}
                onChange={(v) => set("tireLifeActualKm", v)}
                disabled={useModelLife}
                hint={useModelLife ? `pakai hasil hitung: ${formatNumber(derived.modelTireLifeKm)}` : undefined}
              />
              <NumberField label="Umur ban ideal" unit="km" value={form.tireLifeBestKm} onChange={(v) => set("tireLifeBestKm", v)} />
              <NumberField label="Porsi yang bisa dihemat" unit="0 sampai 1" step={0.05} value={form.captureRate} onChange={(v) => set("captureRate", v)} hint={formatPersen(form.captureRate)} />
              <NumberField label="Jumlah unit di armada" value={form.fleetSize} onChange={(v) => set("fleetSize", v)} />
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={useModelLife} onChange={(e) => setUseModelLife(e.target.checked)} />
              Pakai umur ban dari hasil perhitungan ({formatNumber(derived.modelTireLifeKm)} km)
              <InfoTip text="Coba ganti 'umur ban sekarang' dengan rata-rata hasil perhitungan. Pilihan ini tidak ikut tersimpan, dan awalnya mati supaya angka acuan tetap." />
            </label>
          </Card>

          <Card>
            <h2 className="mb-1 font-semibold text-slate-800">
              Muatan berlebih HD785
              <InfoTip text="Biaya keausan akibat muatan berlebih. Awalnya nol. Isi untuk mengaktifkan." />
            </h2>
            <p className="mb-3 text-xs text-slate-400">Total tingkat muatan berlebih armada {formatNumber(derived.overloadRateSum, 2)} (dari data).</p>
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Biaya keausan akibat muatan berlebih" unit="Rp" value={form.overloadWearCostFactorIdr} onChange={(v) => set("overloadWearCostFactorIdr", v)} hint={formatRupiah(form.overloadWearCostFactorIdr)} />
            </div>
          </Card>
        </div>

        {/* Hasil live */}
        <div className="space-y-4">
          {/* <div> (bukan Card) agar bg-kpp-green tak bertabrakan dgn bg-white bawaan Card → teks putih tetap terlihat. */}
          <div className="rounded-xl border border-emerald-800/30 bg-kpp-green p-5 text-white shadow-sm">
            <div className="text-xs uppercase tracking-wide text-emerald-100">Total penghematan per tahun</div>
            <div className="mt-1 text-2xl font-bold text-white">{formatRupiah(summary.annualSavings)}</div>
            <div className="mt-1 text-xs text-emerald-50">dari penghematan ban dan biaya muatan berlebih</div>
          </div>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">Rincian perhitungan</h2>
            <dl className="space-y-2 text-sm">
              <ResultRow label="Ban yang bisa dihemat per unit" value={`${formatNumber(tac.avoidableTires, 2)} ban`} />
              <ResultRow label="Nilai ban yang bisa dihemat per unit" value={formatRupiah(tac.avoidableCostPerUnit)} />
              <ResultRow label="Yang realistis tertangkap per unit" value={formatRupiah(tac.capturedPerUnit)} />
              <ResultRow label="Total penghematan ban se-armada" value={formatRupiah(summary.fleetCaptured)} strong />
              <ResultRow label="Biaya muatan berlebih per tahun" value={formatRupiah(summary.overloadCost)} />
            </dl>
          </Card>
        </div>
      </div>

      {/* Skenario armada */}
      <Card className="mt-5 overflow-hidden p-0">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-800">
            Skenario jumlah armada
            <InfoTip text="Hasil pada beberapa ukuran armada, dengan asumsi lain tetap sama." />
          </h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5 font-medium">Armada</th>
              <th className="px-4 py-2.5 font-medium">Penghematan ban per tahun</th>
              <th className="px-4 py-2.5 font-medium">Total penghematan per tahun</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SCENARIO_FLEETS.map((fs) => {
              const s = financialSummary({ ...effective, fleetSize: fs }, { overloadCost });
              return (
                <tr key={fs} className={cx(fs === form.fleetSize && "bg-emerald-50/50")}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">{fs} unit{fs === form.fleetSize ? " (saat ini)" : ""}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatRupiah(s.fleetCaptured)}</td>
                  <td className="px-4 py-2.5 text-slate-600">{formatRupiah(s.annualSavings)}</td>
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
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
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
