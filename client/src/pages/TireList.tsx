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
import { ExportButton } from "../components/ExportButton";

function countBy(units: TireUnitSummary[], status: TireUnitSummary["status"]): number {
  return units.filter((u) => u.status === status).length;
}

export function TireList() {
  const navigate = useNavigate();
  const { data, isLoading, error, refetch } = useTireUnits();

  return (
    <>
      <PageHeader
        title="Daftar dan Prediksi Ban"
        actions={
          data ? (
            <ExportButton
              filename="tire-prediksi.csv"
              headers={["unit", "model", "prediksiUmurKm", "sisaUmurKm", "keyakinan", "status"]}
              rows={data.map((u) => [u.id, u.model, u.predictedLifeKm, u.remainingLifeKm, u.confidence, u.status])}
            />
          ) : undefined
        }
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
                    <InfoTip text="Perkiraan total umur ban dikurangi jarak yang sudah ditempuh ban saat ini." />
                  </th>
                  <th className="px-4 py-3 font-medium">
                    Tingkat keyakinan
                    <InfoTip text="Seberapa cocok perhitungan dengan data masa lalu unit ini. Makin tinggi makin bisa dipercaya. Tanda 'perkiraan awal' berarti datanya masih sedikit, jadi dipakai angka umum dari merek ban." />
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
                    <td className="px-4 py-3 text-slate-600">
                      {formatPersen(u.confidence)}
                      {u.usedFallback && (
                        <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">
                          perkiraan awal
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
          <p className="mt-3 text-xs text-slate-400">Klik salah satu baris untuk melihat riwayat ban dan penyebab keausannya.</p>
        </>
      )}
    </>
  );
}
