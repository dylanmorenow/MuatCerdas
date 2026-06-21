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

          {/* Item 5 — tipe ban terpasang + umur ideal tipe ban */}
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              Tipe ban: <span className="font-semibold text-slate-800">{data.tireModel ?? "belum diisi"}</span>
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              Umur ideal tipe ban ini: <span className="font-semibold text-slate-800">{formatNumber(data.idealLifeKm)} km</span>
            </span>
            <Link to="/data" className="text-xs text-kpp-blue hover:underline">Ubah tipe ban di Data</Link>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Perkiraan umur ban" value={`${formatNumber(data.predictedLifeKm)} km`} hint="ideal dikurangi faktor eksternal" />
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

          {/* Item 1 — pembacaan sisa umur = estimasi umur ideal − faktor eksternal − jarak nyata */}
          {(() => {
            const idealKm = Math.round(data.attribution.baselineLifeKm); // estimasi umur ideal (baseline armada)
            const externalKm = Math.round(data.attribution.shortfallKm); // pengurangan faktor eksternal
            const realKm = Math.max(0, Math.round(data.features.currentKm)); // jarak tempuh nyata
            const sisaKm = Math.round(data.remainingLifeKm); // = idealKm − externalKm − realKm
            const Box = ({ label, value, tone }: { label: string; value: string; tone: string }) => (
              <div className="flex-1 rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-[11px] text-slate-500">{label}</div>
                <div className={`mt-0.5 text-lg font-bold ${tone}`}>{value}</div>
              </div>
            );
            const Op = ({ s }: { s: string }) => <div className="px-1 text-lg font-bold text-slate-400">{s}</div>;
            return (
              <Card className="mb-5">
                <h2 className="mb-1 font-semibold text-slate-800">
                  Cara membaca sisa umur ban
                  <InfoTip text="Sisa umur tidak hanya dikurangi jarak yang sudah ditempuh. Faktor eksternal (muatan, kondisi jalan, gaya operator) ikut 'memakan' umur ban, jadi ikut dikurangkan. Rincian tiap faktor ada di 'Penyebab keausan ban' di bawah." />
                </h2>
                <p className="mb-3 text-xs text-slate-400">
                  Sisa umur = estimasi umur ideal − pengurangan faktor eksternal − jarak tempuh nyata.
                </p>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Box label="Estimasi umur ideal" value={`${formatNumber(idealKm)} km`} tone="text-slate-800" />
                  <Op s="−" />
                  <Box label="Faktor eksternal" value={`${formatNumber(externalKm)} km`} tone={externalKm >= 0 ? "text-red-600" : "text-emerald-600"} />
                  <Op s="−" />
                  <Box label="Jarak tempuh nyata" value={`${formatNumber(realKm)} km`} tone="text-kpp-blue" />
                  <Op s="=" />
                  <Box label="Sisa umur" value={`${formatNumber(sisaKm)} km`} tone={sisaKm < 10000 ? "text-red-600" : "text-emerald-700"} />
                </div>
                <p className="mt-2 text-[11px] text-slate-400">
                  Estimasi umur ideal memakai kondisi terbaik armada sebagai acuan. Bila faktor eksternal bernilai
                  negatif (hijau), unit ini justru lebih baik dari rata-rata, sehingga umur bertambah.
                </p>
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
                <h2 className="mb-1 font-semibold text-slate-800">
                  Kondisi unit
                  <InfoTip text="Tiap angka di sini berasal dari data unit ini. Penjelasan 'dari mana' dan dampaknya ke umur ban dirinci di bawah masing-masing faktor." />
                </h2>
                <p className="mb-3 text-xs text-slate-400">Asal tiap angka dan dampaknya ke umur ban.</p>
                {(() => {
                  const c = data.regressionModel.coefficients;
                  const contribBy = new Map(data.attribution.contributions.map((x) => [x.factor, x.contribution]));
                  const factors = [
                    {
                      label: "Selisih tekanan ban",
                      value: `${formatNumber(data.features.avgPressureDeviationPct)} %`,
                      source:
                        "Rata-rata penyimpangan tekanan ban unit ini dari tekanan ideal, diambil dari log perjalanan dan riwayat ban.",
                      contribKey: "Tekanan ban",
                      rate: `${formatNumber(c.pressure)} km tiap 1% selisih`,
                    },
                    {
                      label: "Tingkat muatan",
                      value: formatNumber(data.features.loadIndex, 2),
                      source:
                        "Rasio muatan rata-rata unit ini terhadap muatan nominal (1,00 = sesuai kapasitas). Diturunkan dari muatan tiap perjalanan.",
                      contribKey: "Muatan",
                      rate: `${formatNumber(c.loadIndex)} km tiap 1 tingkat muatan`,
                    },
                    {
                      label: "Tingkat kerusakan jalan",
                      value: formatPersen(data.features.weightedRoadConditionExposure),
                      source:
                        "Rata-rata berbobot (1 − skor kondisi) tiap ruas yang dilalui unit ini, ditimbang jarak tempuh di ruas itu. Skor kondisi berasal dari peta jalan.",
                      contribKey: "Kondisi jalan",
                      rate: `${formatNumber(c.road)} km tiap 1 tingkat kerusakan`,
                    },
                    {
                      label: "Pengaruh gaya operator",
                      value: formatPersen(data.features.operatorFactor),
                      source:
                        "Dinormalisasi dari tingkat overload operator unit ini dibanding seluruh operator (0% paling halus, 100% paling agresif).",
                      contribKey: "Operator",
                      rate: `${formatNumber(c.operator)} km tiap 1 poin gaya operator`,
                    },
                  ];
                  return (
                    <ul className="space-y-3 text-sm">
                      {factors.map((f) => {
                        const contrib = contribBy.get(f.contribKey);
                        const helps = contrib != null && contrib < 0;
                        return (
                          <li key={f.label} className="border-b border-slate-100 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-600">{f.label}</span>
                              <span className="font-semibold text-slate-800">{f.value}</span>
                            </div>
                            <p className="mt-1 text-[11px] leading-snug text-slate-400">{f.source}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px]">
                              <span className="text-slate-400">Laju: {f.rate}</span>
                              {contrib != null && (
                                <span className={helps ? "text-emerald-600" : "text-red-600"}>
                                  Dampak ke umur: {formatNumber(contrib)} km {helps ? "(menambah)" : "(mengurangi)"}
                                </span>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()}
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
