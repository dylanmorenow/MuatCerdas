// Peta Jalan Kamera AI (prototipe). Dua rute: KM33→Jetty (truk hauling) & in-pit Indexim (HD785).
// conditionScore diturunkan dari bahaya kamera AI (bukan slider manual) → menyetir Modul A/C.
import { formatPersen, conditionColor } from "@muatcerdas/shared";
import { useRoadMap, useRecomputeRoadmap, type MapArea } from "../api/roadmap";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";
import { HazardMap } from "../components/HazardMap";

export function RoadMap() {
  const recompute = useRecomputeRoadmap();
  return (
    <>
      <PageHeader
        title="Peta Jalan Kamera AI (prototipe)"
        subtitle="Dua rute dipetakan kamera berbasis AI di truk paling depan dan paling belakang: rute hauling CPP KM 33 ke Jetty (truk hauling) dan rute in-pit site Indexim Coalindo (HD785). Kondisi tiap ruas dihitung dari bahaya, lalu dipakai untuk perkiraan umur ban dan kecepatan aman. Data simulasi, bukan kamera langsung."
        actions={
          <button
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
          >
            {recompute.isPending ? "Memproses…" : "Hitung ulang dari kamera"}
          </button>
        }
      />

      <RouteMapSection area="haul" title="Rute hauling — CPP KM 33 ke Jetty" recomputed={recompute.isSuccess} />
      <div className="mt-8">
        <RouteMapSection area="site" title="Rute in-pit — site Indexim Coalindo (HD785)" recomputed={recompute.isSuccess} />
      </div>
    </>
  );
}

function RouteMapSection({ area, title, recomputed }: { area: MapArea; title: string; recomputed: boolean }) {
  const { data, isLoading, error, refetch } = useRoadMap(area);

  if (isLoading || !data) {
    return (
      <Card>
        <h2 className="mb-3 font-semibold text-slate-800">{title}</h2>
        {error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : <Loading />}
      </Card>
    );
  }

  const total = data.routeLengthKm || data.segments.reduce((s, x) => s + x.lengthKm, 0) || 1;
  const routeBadness = data.segments.reduce((s, x) => s + x.lengthKm * (1 - x.conditionScore), 0) / total;

  return (
    <>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">{title}</h2>
      <Card>
        <HazardMap data={data} />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Badge tone="slate">prototipe, data simulasi kamera AI</Badge>
          <span>
            bukan kamera langsung. {data.hazards.length} bahaya terdeteksi. Terakhir diperbarui{" "}
            {new Date(data.lastUpdated).toLocaleString("id-ID")}
          </span>
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <Stat
            label="Tingkat kerusakan jalan"
            value={formatPersen(routeBadness)}
            hint={
              <>
                dihitung dari bahaya kamera AI
                <InfoTip text="Rata-rata kerusakan sepanjang rute, ditimbang dengan panjang tiap ruas. Skornya berasal dari bahaya kamera AI, bukan diisi manual." />
              </>
            }
          />
          {recomputed && <p className="mt-2 text-xs text-emerald-600">Kondisi jalan diperbarui dari bahaya</p>}
        </Card>

        <Card className="lg:col-span-2 overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-3">
            <h3 className="font-semibold text-slate-800">Kondisi tiap ruas jalan</h3>
            <p className="text-xs text-slate-400">Hanya tampilan. Bersumber dari peta kamera AI, bukan diisi manual.</p>
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
