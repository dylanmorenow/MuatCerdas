import { useState } from "react";
import { Link } from "react-router-dom";
import { formatNumber, formatRupiah, formatPersen, formatTon } from "@muatcerdas/shared";
import { useDashboard } from "../api/finance";
import { useRoadMap } from "../api/roadmap";
import { HazardMap } from "../components/HazardMap";
import { PageHeader, Card, Loading, ErrorState, InfoTip, cx } from "../components/ui";
import { downloadReportPdf, downloadCsv } from "../lib/export";

export function Dashboard() {
  const { data, isLoading, error, refetch } = useDashboard();
  const { data: roadMap } = useRoadMap();
  const [pdfBusy, setPdfBusy] = useState(false);

  const exportCsv = () => {
    if (!data) return;
    const f = data.finance;
    const o = data.ops;
    downloadCsv(
      "kpi-muatcerdas.csv",
      ["KPI", "Nilai"],
      [
        ["Estimasi harga ban segera diganti (Rp)", Math.round(o.tireReplacementCostIdr)],
        ["Est. kerugian produksi bila ban diabaikan (Rp)", Math.round(o.productionLossIdr)],
        ["Kuota batubara hari ini — dimuat (t)", Math.round(o.coalQuota.loadedT)],
        ["Kuota batubara hari ini — target (t)", Math.round(o.coalQuota.targetT)],
        ["Payback (bulan)", Number.isFinite(f.paybackMonths) ? f.paybackMonths.toFixed(2) : "-"],
        ["ROI tahun-1", f.roiYear1.toFixed(4)],
      ],
    );
  };
  const exportPdf = async () => {
    if (!data) return;
    setPdfBusy(true);
    try {
      await downloadReportPdf(data);
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Ringkasan risiko & kerugian operasional, kuota produksi, dan ROI — atas asumsi tersimpan (sesuaikan di Finansial)."
        actions={
          data ? (
            <div className="flex items-center gap-2">
              <button onClick={exportCsv} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                Ekspor KPI (CSV)
              </button>
              <button
                onClick={() => void exportPdf()}
                disabled={pdfBusy}
                className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
              >
                {pdfBusy ? "Menyiapkan…" : "Unduh Laporan (PDF)"}
              </button>
            </div>
          ) : undefined
        }
      />

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          {/* KPI operasional (kerugian/risiko) */}
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Kpi
              label="Estimasi harga ban segera diganti"
              value={formatRupiah(data.ops.tireReplacementCostIdr)}
              hint={`${data.tire.critical} unit kritis × ban`}
              danger
            />
            <Kpi
              label="Est. kerugian produksi bila ban diabaikan"
              value={formatRupiah(data.ops.productionLossIdr)}
              hint="downtime × nilai produksi/hari (asumsi)"
              danger
            />
            <Kpi
              label="Kuota produksi batubara hari ini"
              value={`${formatNumber(data.ops.coalQuota.loadedT)} / ${formatNumber(data.ops.coalQuota.targetT)} t`}
              hint={`${formatPersen(data.ops.coalQuota.pct)} target · HD785 coal`}
              accent
            />
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
                <span className="font-medium text-slate-700">{formatTon(data.payload.meanKg)}</span> ·{" "}
                <Link to="/calibration" className="text-kpp-blue hover:underline">
                  {data.calibration.needs}/{data.calibration.total} perlu kalibrasi
                </Link>
              </p>
            </Card>
          </div>

          {/* Peta bahaya jalan LiDAR (prototipe) */}
          {roadMap && (
            <Card className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">
                  Peta bahaya jalan — LiDAR (prototipe)
                  <InfoTip text="Bahaya rute KM33 → Jetty dari device LiDAR (truk pemeta lead/last, shift 1). Data simulasi mewakili keluaran LiDAR; menyetir kondisi jalan Modul A/C. Bukan LiDAR live." />
                </h2>
                <Link to="/roadmap" className="text-sm text-kpp-blue hover:underline">Buka peta →</Link>
              </div>
              <HazardMap data={roadMap} />
            </Card>
          )}

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

function Kpi({ label, value, hint, accent, danger }: { label: string; value: string; hint?: string; accent?: boolean; danger?: boolean }) {
  return (
    <Card className={accent ? "border-kpp-green/30 bg-emerald-50/40" : danger ? "border-red-200 bg-red-50/40" : undefined}>
      <div className="flex items-center text-xs uppercase tracking-wide text-slate-400">
        {label}
        {label.startsWith("Payback") && <InfoTip text="CapEx ÷ (penghematan/12)." />}
      </div>
      <div className={cx("mt-1 text-xl font-bold", danger ? "text-red-600" : "text-slate-800")}>{value}</div>
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
