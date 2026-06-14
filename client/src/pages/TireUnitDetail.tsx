import { useParams, Link } from "react-router-dom";
import { formatNumber, formatPersen, formatRupiah } from "@muatcerdas/shared";
import { useTireUnit } from "../api/tires";
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
import { FactorBarChart } from "../components/FactorBarChart";

export function TireUnitDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error, refetch } = useTireUnit(id);

  return (
    <>
      <div className="mb-4">
        <Link to="/tire" className="text-sm text-kpp-blue hover:underline">
          ← Daftar unit
        </Link>
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          <PageHeader
            title={`${data.id} — ${data.model}`}
            subtitle="Prediksi sisa umur ban, atribusi penyebab keausan, dan riwayat (Modul A)."
            actions={<StatusBadge status={data.status} />}
          />

          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Prediksi umur ban" value={`${formatNumber(data.predictedLifeKm)} km`} hint="model §12.1" />
            <Stat
              label="Sisa umur"
              value={formatRemainingKm(data.remainingLifeKm)}
              hint={`Interval 95%: ${formatNumber(data.remainingLifeLowKm)} – ${formatNumber(data.remainingLifeHighKm)} km`}
            />
            <Stat
              label="Keyakinan"
              value={formatPersen(data.confidence)}
              hint={data.usedFallback ? "estimasi awal (fallback)" : "dari R² model"}
            />
            <Stat label="Km berjalan (set kini)" value={`${formatNumber(data.features.currentKm)} km`} hint="heuristik usia set" />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Atribusi */}
            <Card className="lg:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">
                  Atribusi penyebab keausan
                  <InfoTip text="Kontribusi tiap faktor terhadap selisih umur vs best-practice armada (§12.2). Menjumlah ke total shortfall." />
                </h2>
                <span className="text-sm text-slate-500">
                  Shortfall: <span className="font-semibold text-slate-700">{formatNumber(data.attribution.shortfallKm)} km</span>
                </span>
              </div>
              <FactorBarChart contributions={data.attribution.contributions} />
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data.attribution.contributions
                    .filter((c) => Math.abs(c.contribution) >= 1)
                    .map((c) => (
                      <tr key={c.factor}>
                        <td className="py-1.5 text-slate-600">{c.factor}</td>
                        <td className="py-1.5 text-right font-medium text-slate-800">
                          {formatNumber(c.contribution)} km
                        </td>
                        <td className="w-16 py-1.5 text-right text-xs text-slate-400">
                          {data.attribution.shortfallKm > 0
                            ? formatPersen(c.contribution / data.attribution.shortfallKm)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </Card>

            {/* Fitur + koefisien model */}
            <div className="space-y-5">
              <Card>
                <h2 className="mb-3 font-semibold text-slate-800">Kondisi unit (fitur)</h2>
                <dl className="space-y-2 text-sm">
                  <Row label="Deviasi tekanan" value={`${formatNumber(data.features.avgPressureDeviationPct)} %`} />
                  <Row label="Indeks muatan" value={formatNumber(data.features.loadIndex, 2)} />
                  <Row label="Keburukan jalan" value={formatPersen(data.features.weightedRoadConditionExposure)} />
                  <Row label="Faktor operator" value={formatPersen(data.features.operatorFactor)} />
                </dl>
              </Card>

              <Card>
                <h2 className="mb-1 font-semibold text-slate-800">
                  Koefisien model
                  <InfoTip text="Model transparan (NFR explainability): km umur yang hilang per satuan tiap faktor." />
                </h2>
                <p className="mb-2 text-xs text-slate-400">
                  R² {formatNumber(data.regressionModel.r2, 2)} · RMSE {formatNumber(data.regressionModel.rmse)} km · n{" "}
                  {data.regressionModel.n}
                </p>
                <dl className="space-y-1.5 text-sm">
                  <Row label="Intersep" value={`${formatNumber(data.regressionModel.coefficients.intercept)} km`} />
                  <Row label="per %-tekanan" value={`${formatNumber(data.regressionModel.coefficients.pressure)} km`} />
                  <Row label="per indeks muatan" value={`${formatNumber(data.regressionModel.coefficients.loadIndex)} km`} />
                  <Row label="per keburukan jalan" value={`${formatNumber(data.regressionModel.coefficients.road)} km`} />
                  <Row label="per faktor operator" value={`${formatNumber(data.regressionModel.coefficients.operator)} km`} />
                </dl>
              </Card>
            </div>
          </div>

          {/* Riwayat ban */}
          <Card className="mt-5 overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-800">Riwayat ban dilepas ({data.history.length})</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Posisi</th>
                    <th className="px-4 py-2.5 font-medium">Pasang</th>
                    <th className="px-4 py-2.5 font-medium">Lepas</th>
                    <th className="px-4 py-2.5 font-medium">Km saat lepas</th>
                    <th className="px-4 py-2.5 font-medium">Deviasi tekanan</th>
                    <th className="px-4 py-2.5 font-medium">Alasan</th>
                    <th className="px-4 py-2.5 font-medium">Biaya</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.history.map((h) => (
                    <tr key={h.id}>
                      <td className="px-4 py-2.5 font-medium text-slate-700">{h.position}</td>
                      <td className="px-4 py-2.5 text-slate-500">{h.installDate}</td>
                      <td className="px-4 py-2.5 text-slate-500">{h.removalDate ?? "—"}</td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {h.kmAtRemoval != null ? `${formatNumber(h.kmAtRemoval)} km` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {h.avgPressureDeviationPct != null ? `${formatNumber(h.avgPressureDeviationPct)} %` : "—"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{h.removalReason}</td>
                      <td className="px-4 py-2.5 text-slate-500">{formatRupiah(h.costIdr)}</td>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-800">{value}</dd>
    </div>
  );
}
