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
            title={`${data.id} · ${data.model}`}
            subtitle="Perkiraan sisa umur ban, penyebab keausan, dan riwayat ban unit ini."
            actions={<StatusBadge status={data.status} />}
          />

          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Perkiraan umur ban" value={`${formatNumber(data.predictedLifeKm)} km`} hint="dari hasil perhitungan" />
            <Stat
              label="Sisa umur"
              value={formatRemainingKm(data.remainingLifeKm)}
              hint={`Kisaran ${formatNumber(data.remainingLifeLowKm)} sampai ${formatNumber(data.remainingLifeHighKm)} km`}
            />
            <Stat
              label="Tingkat keyakinan"
              value={formatPersen(data.confidence)}
              hint={data.usedFallback ? "perkiraan awal, data masih sedikit" : "dari kecocokan dengan data"}
            />
            <Stat label="Jarak tempuh ban sekarang" value={`${formatNumber(data.features.currentKm)} km`} hint="dari perkiraan usia ban" />
          </div>

          {/* Item 3 — umur ban terpakai = jarak nyata + pengurangan faktor eksternal */}
          {(() => {
            const realKm = Math.max(0, Math.round(data.features.currentKm));
            const externalKm = Math.round(data.attribution.shortfallKm);
            const totalKm = realKm + externalKm;
            const realPct = totalKm > 0 ? (realKm / totalKm) * 100 : 100;
            return (
              <Card className="mb-5">
                <h2 className="mb-1 font-semibold text-slate-800">
                  Umur ban terpakai = jarak nyata + faktor eksternal
                  <InfoTip text="Umur ban tidak cuma habis karena jarak. Faktor eksternal (muatan, kondisi jalan, gaya operator) ikut 'memakan' umur ban. Contoh: jika ban baru menempuh 30 km tapi faktor eksternal setara 20 km, maka umur yang sudah terpakai setara 50 km." />
                </h2>
                <p className="mb-3 text-xs text-slate-400">Pengurangan faktor eksternal dirinci di bawah pada "Penyebab keausan ban".</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Jarak tempuh nyata</div>
                    <div className="mt-0.5 text-xl font-bold text-kpp-blue">{formatNumber(realKm)} km</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Pengurangan faktor eksternal</div>
                    <div className={`mt-0.5 text-xl font-bold ${externalKm >= 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {externalKm >= 0 ? "+" : ""}{formatNumber(externalKm)} km
                    </div>
                    <div className="text-[11px] text-slate-400">muatan, jalan, operator</div>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <div className="text-xs text-slate-500">Total umur terpakai (setara)</div>
                    <div className="mt-0.5 text-xl font-bold text-slate-800">{formatNumber(totalKm)} km</div>
                  </div>
                </div>
                <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-kpp-blue" style={{ width: `${Math.min(100, realPct)}%` }} />
                  <div className="h-full bg-red-400" style={{ width: `${Math.max(0, 100 - realPct)}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                  <span>jarak nyata</span>
                  <span>faktor eksternal</span>
                </div>
              </Card>
            );
          })()}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* Atribusi */}
            <Card className="lg:col-span-2">
              <div className="mb-1 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">
                  Penyebab keausan ban
                  <InfoTip text="Seberapa besar tiap faktor menyumbang kekurangan umur ban dibanding kondisi ideal. Jumlahnya sama dengan total kekurangan umur." />
                </h2>
                <span className="text-sm text-slate-500">
                  Kekurangan umur <span className="font-semibold text-slate-700">{formatNumber(data.attribution.shortfallKm)} km</span>
                </span>
              </div>
              <FactorBarChart contributions={data.attribution.contributions} />
              <table className="mt-2 w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {data.attribution.contributions
                    .filter((c) => Math.abs(c.contribution) >= 1)
                    .map((c) => {
                      const helps = c.contribution < 0; // negatif = lebih baik dari rata-rata → menambah umur
                      return (
                        <tr key={c.factor}>
                          <td className="py-1.5 text-slate-600">{c.factor}</td>
                          <td className={`py-1.5 text-right font-medium ${helps ? "text-emerald-600" : "text-slate-800"}`}>
                            {formatNumber(c.contribution)} km
                            {helps && <span className="ml-1 text-[11px] font-normal text-emerald-600">(menambah umur)</span>}
                          </td>
                          <td className="w-16 py-1.5 text-right text-xs text-slate-400">
                            {data.attribution.shortfallKm > 0
                              ? formatPersen(c.contribution / data.attribution.shortfallKm)
                              : "-"}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-slate-400">
                Angka positif = faktor itu mengurangi umur ban (penyebab keausan). Angka negatif (hijau) = faktor itu
                lebih baik dari rata-rata armada, jadi justru menambah umur. Contoh: muatan minus berarti unit ini
                muatannya lebih ringan dari rata-rata.
              </p>
            </Card>

            {/* Fitur + koefisien model */}
            <div className="space-y-5">
              <Card>
                <h2 className="mb-3 font-semibold text-slate-800">Kondisi unit</h2>
                <dl className="space-y-2 text-sm">
                  <Row label="Selisih tekanan ban" value={`${formatNumber(data.features.avgPressureDeviationPct)} %`} />
                  <Row label="Tingkat muatan" value={formatNumber(data.features.loadIndex, 2)} />
                  <Row label="Tingkat kerusakan jalan" value={formatPersen(data.features.weightedRoadConditionExposure)} />
                  <Row label="Pengaruh gaya operator" value={formatPersen(data.features.operatorFactor)} />
                </dl>
              </Card>

              <Card>
                <h2 className="mb-1 font-semibold text-slate-800">
                  Rincian perhitungan
                  <InfoTip text="Perhitungan ini terbuka, bukan kotak hitam. Tiap angka menunjukkan berapa km umur ban yang berubah untuk setiap satuan faktor." />
                </h2>
                <p className="mb-2 text-xs text-slate-400">
                  Kecocokan {formatNumber(data.regressionModel.r2, 2)}, rata-rata meleset {formatNumber(data.regressionModel.rmse)} km, dari {data.regressionModel.n} data
                </p>
                <dl className="space-y-1.5 text-sm">
                  <Row label="Dasar" value={`${formatNumber(data.regressionModel.coefficients.intercept)} km`} />
                  <Row label="Tiap 1% selisih tekanan" value={`${formatNumber(data.regressionModel.coefficients.pressure)} km`} />
                  <Row label="Tiap 1 tingkat muatan" value={`${formatNumber(data.regressionModel.coefficients.loadIndex)} km`} />
                  <Row label="Tiap 1 tingkat kerusakan jalan" value={`${formatNumber(data.regressionModel.coefficients.road)} km`} />
                  <Row label="Tiap 1 poin gaya operator" value={`${formatNumber(data.regressionModel.coefficients.operator)} km`} />
                </dl>
                <p className="mt-2 text-[11px] text-slate-400">
                  Angka negatif di sini wajar: itu laju, bukan nilai. Maksudnya makin besar faktornya, makin pendek umur
                  ban. Contoh: tiap muatan naik 1 tingkat, umur ban berkurang sebesar angka itu.
                </p>
              </Card>
            </div>
          </div>

          {/* Riwayat ban */}
          <Card className="mt-5 overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-800">Riwayat ban yang sudah dilepas ({data.history.length})</h2>
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
                      <td className="px-4 py-2.5 text-slate-500">{h.removalDate ?? "-"}</td>
                      <td className="px-4 py-2.5 text-slate-700">
                        {h.kmAtRemoval != null ? `${formatNumber(h.kmAtRemoval)} km` : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">
                        {h.avgPressureDeviationPct != null ? `${formatNumber(h.avgPressureDeviationPct)} %` : "-"}
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
