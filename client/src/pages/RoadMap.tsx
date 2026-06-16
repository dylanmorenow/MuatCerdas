// Modul D + F3 — Peta Jalan LiDAR (prototipe). conditionScore DITURUNKAN dari bahaya LiDAR
// (bukan slider manual) → menyetir Modul A/C. Admin dapat "recompute dari LiDAR".
import { formatPersen, conditionColor } from "@muatcerdas/shared";
import { useRoadMap, useRecomputeRoadmap } from "../api/roadmap";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";
import { HazardMap } from "../components/HazardMap";

export function RoadMap() {
  const { data, isLoading, error, refetch } = useRoadMap();
  const recompute = useRecomputeRoadmap();

  if (isLoading || !data) {
    return (
      <>
        <PageHeader title="Peta Jalan LiDAR (prototipe)" />
        {error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : <Loading />}
      </>
    );
  }

  const total = data.routeLengthKm || data.segments.reduce((s, x) => s + x.lengthKm, 0) || 1;
  const routeBadness = data.segments.reduce((s, x) => s + x.lengthKm * (1 - x.conditionScore), 0) / total;

  return (
    <>
      <PageHeader
        title="Peta Jalan LiDAR (prototipe)"
        subtitle="Bahaya jalan dari CPP KM 33 ke Jetty, dari alat LiDAR di truk paling depan dan paling belakang. Kondisi tiap ruas jalan dihitung dari bahaya ini, lalu dipakai untuk memperkirakan umur ban dan kecepatan aman. Data simulasi, bukan LiDAR langsung."
        actions={
          <button
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
          >
            {recompute.isPending ? "Memproses…" : "Hitung ulang dari LiDAR"}
          </button>
        }
      />

      <Card>
        <HazardMap data={data} />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Badge tone="slate">prototipe, data simulasi LiDAR</Badge>
          <span>bukan LiDAR langsung. {data.hazards.length} bahaya terdeteksi. Terakhir diperbarui {new Date(data.lastUpdated).toLocaleString("id-ID")}</span>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <Stat
            label="Tingkat kerusakan jalan"
            value={formatPersen(routeBadness)}
            hint={
              <>
                dihitung dari bahaya LiDAR, dipakai untuk perkiraan umur ban
                <InfoTip text="Rata-rata kerusakan sepanjang rute, ditimbang dengan panjang tiap ruas. Skornya kini berasal dari bahaya LiDAR, bukan diisi manual. Klik 'Hitung ulang dari LiDAR' untuk memperbarui dan perkiraan umur ban ikut berubah." />
              </>
            }
          />
          {recompute.isSuccess && <p className="mt-2 text-xs text-emerald-600">Kondisi jalan diperbarui dari bahaya</p>}
        </Card>

        <Card className="lg:col-span-2 overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-3">
            <h2 className="font-semibold text-slate-800">Kondisi tiap ruas jalan</h2>
            <p className="text-xs text-slate-400">Hanya tampilan. Bersumber dari peta LiDAR, bukan diisi manual.</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Ruas jalan</th>
                <th className="px-4 py-2.5 font-medium">Panjang</th>
                <th className="px-4 py-2.5 font-medium">Jumlah bahaya</th>
                <th className="px-4 py-2.5 font-medium">Skor kondisi</th>
                <th className="px-4 py-2.5 font-medium">Kondisi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.segments.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium text-slate-700">{s.name}<div className="text-xs font-normal text-slate-400">{s.surface}</div></td>
                  <td className="px-4 py-2.5 text-slate-600">{s.lengthKm} km</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.hazardCount}</td>
                  <td className="px-4 py-2.5 text-slate-600">{s.conditionScore.toFixed(2)}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded px-2 py-0.5 text-xs font-medium text-white" style={{ backgroundColor: conditionColor(s.conditionScore) }}>
                      {s.condition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
