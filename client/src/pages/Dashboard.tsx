import { Link } from "react-router-dom";
import { formatNumber, formatRupiah, formatPersen } from "@muatcerdas/shared";
import { useDashboard } from "../api/finance";
import { PageHeader, Card, Loading, ErrorState, InfoTip } from "../components/ui";

export function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan biaya terhindarkan, penghematan & ROI — atas asumsi default (sesuaikan di Finansial)."
      />

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          {/* KPI gabungan */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi label="Biaya ban terhindarkan / th" value={formatRupiah(data.finance.fleetCaptured)} accent />
            <Kpi
              label="Biaya payload terhindarkan / th"
              value={formatRupiah(data.finance.payloadAvoidable)}
              hint={data.finance.payloadAvoidable === 0 ? "lever payload = 0 (asumsi)" : undefined}
            />
            <Kpi label="Total penghematan / th" value={formatRupiah(data.finance.annualSavings)} accent />
            <Kpi
              label="Payback"
              value={Number.isFinite(data.finance.paybackMonths) ? `${formatNumber(data.finance.paybackMonths, 1)} bln` : "—"}
            />
            <Kpi label="ROI tahun-1" value={formatPersen(data.finance.roiYear1)} />
            <Kpi label="CapEx / OpEx" value={`${formatRupiah(data.capexIdr)}`} hint={`OpEx ${formatRupiah(data.opexAnnualIdr)}/th`} />
          </div>

          {/* Ringkasan modul */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Modul A — Ban (truk hauling)</h2>
                <Link to="/tire" className="text-sm text-kpp-blue hover:underline">
                  Lihat →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <ModuleStat label="Kritis" value={data.tire.critical} tone="text-red-600" />
                <ModuleStat label="Pantau" value={data.tire.warn} tone="text-amber-600" />
                <ModuleStat label="Sehat" value={data.tire.ok} tone="text-emerald-600" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {formatNumber(data.tire.totalUnits)} unit · rata-rata prediksi umur ban{" "}
                <span className="font-medium text-slate-700">{formatNumber(data.tire.avgPredictedLifeKm)} km</span>
              </p>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Modul B — Payload (HD785)</h2>
                <Link to="/payload" className="text-sm text-kpp-blue hover:underline">
                  Lihat →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <ModuleStat label="Over" value={formatPersen(data.payload.overPct)} tone="text-red-600" />
                <ModuleStat label="OK" value={formatPersen(data.payload.okPct)} tone="text-emerald-600" />
                <ModuleStat label="Under" value={formatPersen(data.payload.underPct)} tone="text-amber-600" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {formatNumber(data.payload.count)} event · rata-rata{" "}
                <span className="font-medium text-slate-700">{formatNumber(data.payload.meanKg)} kg</span> ·{" "}
                <Link to="/calibration" className="text-kpp-blue hover:underline">
                  {data.calibration.needs}/{data.calibration.total} perlu kalibrasi
                </Link>
              </p>
            </Card>
          </div>

          <p className="mt-5 text-xs text-slate-400">
            Angka di atas memakai asumsi tersimpan.{" "}
            <Link to="/finance" className="text-kpp-blue hover:underline">
              Sesuaikan di Finansial & ROI
            </Link>
            . Data contoh/import — bukan telematik live.
          </p>
        </>
      )}
    </>
  );
}

function Kpi({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-kpp-green/30 bg-emerald-50/40" : undefined}>
      <div className="flex items-center text-xs uppercase tracking-wide text-slate-400">
        {label}
        {label.startsWith("Payback") && <InfoTip text="CapEx ÷ (penghematan/12)." />}
      </div>
      <div className="mt-1 text-xl font-bold text-slate-800">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </Card>
  );
}

function ModuleStat({ label, value, tone }: { label: string; value: number | string; tone: string }) {
  return (
    <div className="rounded-lg bg-slate-50 py-3">
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
