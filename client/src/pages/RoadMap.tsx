import { useEffect, useState } from "react";
import { formatPersen, conditionLabel, conditionColor } from "@muatcerdas/shared";
import { useRoadMap, useUpdateSegment, type RoadMapSegment } from "../api/roadmap";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";
import { RoadMapStrip } from "../components/RoadMapStrip";

export function RoadMap() {
  const { data, isLoading, error, refetch } = useRoadMap();
  const update = useUpdateSegment();
  const [local, setLocal] = useState<RoadMapSegment[] | null>(null);

  useEffect(() => {
    if (data) setLocal(data.segments);
  }, [data]);

  if (isLoading || !local || !data) {
    return (
      <>
        <PageHeader title="Peta Jalan (prototipe)" />
        {error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : <Loading />}
      </>
    );
  }

  const total = local.reduce((s, x) => s + x.lengthKm, 0) || 1;
  // Keburukan jalan rute terbobot = nilai yang dikonsumsi Modul A (eksposur jalan ban).
  const routeBadness = local.reduce((s, x) => s + x.lengthKm * (1 - x.conditionScore), 0) / total;

  const setScore = (id: string, v: number) =>
    setLocal((segs) => (segs ? segs.map((s) => (s.id === id ? { ...s, conditionScore: v, condition: conditionLabel(v) } : s)) : segs));

  return (
    <>
      <PageHeader
        title="Peta Jalan (prototipe)"
        subtitle="Kondisi jalan KM33 → Jetty per segmen — mewakili keluaran LIDAR truk pemeta (lead/last)."
      />

      <Card>
        <RoadMapStrip segments={local} mappers={data.mappers} />
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-400">
          <Badge tone="slate">prototipe · data simulasi</Badge>
          <span>bukan LIDAR live · terakhir diperbarui {new Date(data.lastUpdated).toLocaleString("id-ID")}</span>
        </div>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <Stat
            label="Keburukan jalan rute (terbobot)"
            value={formatPersen(routeBadness)}
            hint={
              <>
                nilai ini dipakai prediksi <span className="font-medium">Modul A</span> (eksposur jalan ban)
                <InfoTip text="Σ panjang×(1−conditionScore)/Σpanjang. Geser kondisi segmen → angka ini & eksposur jalan Modul A berubah (FR-0004-6)." />
              </>
            }
          />
          {update.isPending && <p className="mt-2 text-xs text-slate-400">menyimpan…</p>}
        </Card>

        <Card className="lg:col-span-2">
          <h2 className="mb-1 font-semibold text-slate-800">Atur kondisi segmen (admin)</h2>
          <p className="mb-3 text-xs text-slate-400">Geser untuk memperbaiki/memburukkan; perubahan dipakai Modul A.</p>
          <div className="space-y-3">
            {local.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <div className="w-40 shrink-0">
                  <div className="text-sm font-medium text-slate-700">{s.name}</div>
                  <div className="text-xs text-slate-400">{s.lengthKm} km · {s.surface}</div>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={s.conditionScore}
                  onChange={(e) => setScore(s.id, Number(e.target.value))}
                  onPointerUp={(e) => update.mutate({ id: s.id, conditionScore: Number((e.target as HTMLInputElement).value) })}
                  className="flex-1 accent-kpp-green"
                />
                <span
                  className="w-24 shrink-0 rounded px-2 py-0.5 text-center text-xs font-medium text-white"
                  style={{ backgroundColor: conditionColor(s.conditionScore) }}
                >
                  {s.condition}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
