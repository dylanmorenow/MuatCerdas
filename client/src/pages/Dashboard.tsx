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
        ["Perkiraan biaya ban yang harus segera diganti (Rp)", Math.round(o.tireReplacementCostIdr)],
        ["Perkiraan kerugian produksi bila ban dibiarkan (Rp)", Math.round(o.productionLossIdr)],
        ["Batubara dimuat hari ini (ton)", Math.round(o.coalQuota.loadedT)],
        ["Target batubara hari ini (ton)", Math.round(o.coalQuota.targetT)],
        ["Perkiraan balik modal (bulan)", Number.isFinite(f.paybackMonths) ? f.paybackMonths.toFixed(2) : "-"],
        ["Keuntungan tahun pertama", f.roiYear1.toFixed(4)],
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
        subtitle="Ringkasan risiko biaya, kuota produksi batubara, dan perkiraan balik modal. Semua angka memakai asumsi yang bisa diubah di halaman Finansial."
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
              label="Perkiraan biaya ban yang harus segera diganti"
              value={formatRupiah(data.ops.tireReplacementCostIdr)}
              hint={`${data.tire.critical} unit dalam kondisi kritis`}
              danger
            />
            <Kpi
              label="Perkiraan kerugian produksi bila ban dibiarkan"
              value={formatRupiah(data.ops.productionLossIdr)}
              hint="dari hari unit berhenti beroperasi dikali nilai produksi per hari"
              danger
            />
            <Kpi
              label="Kuota produksi batubara hari ini"
              value={`${formatNumber(data.ops.coalQuota.loadedT)} / ${formatNumber(data.ops.coalQuota.targetT)} t`}
              hint={`${formatPersen(data.ops.coalQuota.pct)} dari target, dari muatan batubara HD785`}
              accent
            />
            <Kpi
              label="Perkiraan balik modal"
              value={Number.isFinite(data.finance.paybackMonths) ? `${formatNumber(data.finance.paybackMonths, 1)} bulan` : "-"}
            />
            <Kpi label="Keuntungan tahun pertama" value={formatPersen(data.finance.roiYear1)} />
            <Kpi label="Biaya investasi & operasional" value={`${formatRupiah(data.capexIdr)}`} hint={`biaya operasional ${formatRupiah(data.opexAnnualIdr)} per tahun`} />
          </div>

          {/* Ringkasan modul */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Ban truk hauling</h2>
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
                {formatNumber(data.tire.totalUnits)} unit, perkiraan umur ban rata-rata{" "}
                <span className="font-medium text-slate-700">{formatNumber(data.tire.avgPredictedLifeKm)} km</span>
              </p>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Muatan HD785</h2>
                <Link to="/payload" className="text-sm text-kpp-blue hover:underline">
                  Lihat →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <ModuleStat label="Berlebih" value={formatPersen(data.payload.overPct)} tone="text-red-600" />
                <ModuleStat label="Pas" value={formatPersen(data.payload.okPct)} tone="text-emerald-600" />
                <ModuleStat label="Kurang" value={formatPersen(data.payload.underPct)} tone="text-amber-600" />
              </div>
              <p className="mt-3 text-sm text-slate-500">
                {formatNumber(data.payload.count)} catatan muatan, rata-rata{" "}
                <span className="font-medium text-slate-700">{formatTon(data.payload.meanKg)}</span>.{" "}
                <Link to="/calibration" className="text-kpp-blue hover:underline">
                  {data.calibration.needs} dari {data.calibration.total} timbangan perlu dikalibrasi
                </Link>
              </p>
            </Card>
          </div>

          {/* Peta bahaya jalan LiDAR (prototipe) */}
          {roadMap && (
            <Card className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">
                  Peta bahaya jalan (prototipe kamera AI)
                  <InfoTip text="Bahaya di sepanjang jalan dari CPP KM 33 ke Jetty. Datanya dari kamera berbasis AI di truk paling depan dan paling belakang. Ini contoh simulasi, bukan data langsung dari kamera. Kondisi jalan dari peta ini dipakai untuk menghitung umur ban dan kecepatan aman." />
                </h2>
                <Link to="/roadmap" className="text-sm text-kpp-blue hover:underline">Buka peta →</Link>
              </div>
              <HazardMap data={roadMap} />
            </Card>
          )}

          <p className="mt-5 text-xs text-slate-400">
            Angka di atas memakai asumsi yang tersimpan.{" "}
            <Link to="/finance" className="text-kpp-blue hover:underline">
              Ubah asumsinya di halaman Finansial
            </Link>
            . Memakai data contoh dan data yang diunggah, bukan data langsung dari alat di truk.
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
        {label.startsWith("Perkiraan balik modal") && <InfoTip text="Lama waktu sampai penghematan per bulan menutup biaya investasi awal." />}
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
