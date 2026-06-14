import { useNavigate } from "react-router-dom";
import { formatNumber, formatPersen } from "@muatcerdas/shared";
import { useTireUnits, type TireUnitSummary } from "../api/tires";
import {
  PageHeader,
  Card,
  Stat,
  StatusBadge,
  Loading,
  ErrorState,
  InfoTip,
  formatRemainingKm,
} from "../components/ui";

function countBy(units: TireUnitSummary[], status: TireUnitSummary["status"]): number {
  return units.filter((u) => u.status === status).length;
}

export function TireList() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useTireUnits();

  return (
    <>
      <PageHeader
        title="Tire — Daftar & Prediksi"
        subtitle="Sisa umur ban truk hauling (Scania / Volvo) di rute laterit CPP KM33 → Jetty, beserta tingkat keyakinan."
      />

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Total unit" value={formatNumber(data.length)} hint="truk hauling" />
            <Stat label="Kritis" value={<span className="text-red-600">{countBy(data, "critical")}</span>} hint="ganti segera" />
            <Stat label="Pantau" value={<span className="text-amber-600">{countBy(data, "warn")}</span>} hint="mendekati batas" />
            <Stat label="Sehat" value={<span className="text-emerald-600">{countBy(data, "ok")}</span>} />
          </div>

          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Model</th>
                  <th className="px-4 py-3 font-medium">
                    Sisa umur
                    <InfoTip text="Prediksi umur ban (model regresi §12.1) dikurangi km berjalan set ban saat ini." />
                  </th>
                  <th className="px-4 py-3 font-medium">Interval 95%</th>
                  <th className="px-4 py-3 font-medium">
                    Keyakinan
                    <InfoTip text="Berdasarkan R² model. 'Estimasi awal' = fallback heuristik saat data minim." />
                  </th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => navigate(`/tire/${u.id}`)}
                    className="cursor-pointer hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-kpp-blue">{u.id}</td>
                    <td className="px-4 py-3 text-slate-600">{u.model}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{formatRemainingKm(u.remainingLifeKm)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatNumber(u.remainingLifeLowKm)} – {formatNumber(u.remainingLifeHighKm)} km
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatPersen(u.confidence)}
                      {u.usedFallback && (
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          estimasi awal
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-3 text-xs text-slate-400">Klik baris untuk detail riwayat ban & atribusi penyebab.</p>
        </>
      )}
    </>
  );
}
