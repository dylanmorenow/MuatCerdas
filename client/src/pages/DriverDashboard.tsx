// Surface DRIVER (FR-0004-4) — besar, sederhana, terbaca sekilas saat operasi.
import { formatNumber } from "@muatcerdas/shared";
import { useDriverMe } from "../api/driver";
import { useRoadMap } from "../api/roadmap";
import { clearToken } from "../api/auth";
import { Loading, ErrorState, cx } from "../components/ui";
import { RoadMapStrip } from "../components/RoadMapStrip";
import { HazardMap } from "../components/HazardMap";
import { MassReportForm } from "../components/MassReport";
import { DriverTripSim } from "../components/DriverTripSim";

const PAYLOAD_TONE: Record<string, { bg: string; label: string }> = {
  under: { bg: "bg-amber-500", label: "KURANG" },
  ok: { bg: "bg-emerald-600", label: "PAS" },
  over: { bg: "bg-red-600", label: "OVERLOAD" },
};
const TIRE_TONE: Record<string, { bg: string; label: string }> = {
  ok: { bg: "bg-emerald-600", label: "SEHAT" },
  warn: { bg: "bg-amber-500", label: "PANTAU" },
  critical: { bg: "bg-red-600", label: "KRITIS" },
};

export function DriverDashboard() {
  const { data, isLoading, error, refetch } = useDriverMe();
  const { data: roadMap } = useRoadMap();
  const logout = () => {
    clearToken();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-kpp-green px-5 py-3 text-white">
        <div>
          <div className="text-base font-bold">MuatCerdas — Driver</div>
          {data && (
            <div className="text-xs text-white/80">
              {data.identity.name ?? "—"} · Unit {data.unit.id} ({data.unit.model}) · shift {data.identity.shift ?? "—"}
            </div>
          )}
        </div>
        <button onClick={logout} className="rounded-md bg-white/15 px-3 py-1.5 text-sm font-medium hover:bg-white/25">
          Keluar
        </button>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {isLoading && <Loading />}
        {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

        {data && (
          <div className="space-y-5">
            {/* Kecepatan maksimum aman */}
            <div className={cx("rounded-2xl p-6 text-white", data.speed?.overTarget ? "bg-red-600" : "bg-kpp-blue")}>
              <div className="text-sm uppercase tracking-wide text-white/80">Kecepatan maksimum aman</div>
              <div className="mt-1 text-6xl font-extrabold">
                {data.speed ? formatNumber(data.speed.vmaxSafeTravelKmh, 1) : "—"}
                <span className="ml-2 text-2xl font-semibold">km/jam</span>
              </div>
              <div className="mt-2 text-sm text-white/90">{data.speed?.reason ?? "data kecepatan tak tersedia"}</div>
            </div>

            {/* Massa muatan (HD785) atau Kondisi ban (haul) */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {data.payload && (
                <BigIndicator
                  title="Massa muatan"
                  tone={PAYLOAD_TONE[data.payload.status]?.bg ?? "bg-slate-500"}
                  big={`${formatNumber(data.payload.meanKg / 1000, 1)} t`}
                  sub={`target ${formatNumber(data.payload.targetKg / 1000, 0)} t · ${PAYLOAD_TONE[data.payload.status]?.label ?? data.payload.status}`}
                />
              )}
              {data.tire && (
                <BigIndicator
                  title="Kondisi ban"
                  tone={TIRE_TONE[data.tire.status]?.bg ?? "bg-slate-500"}
                  big={TIRE_TONE[data.tire.status]?.label ?? data.tire.status}
                  sub={`sisa umur ${formatNumber(data.tire.remainingLifeKm)} km`}
                />
              )}
              <BigIndicator
                title="Target produksi hari ini"
                tone="bg-slate-700"
                big={`${formatNumber(data.production.dailyTargetTon)} t`}
                sub={`bagian unit ±${formatNumber(data.production.unitShareTon)} t · ${formatNumber(data.production.perTripPayloadT, 1)} t / rit`}
              />
              {data.calibration && (
                <BigIndicator
                  title="Kalibrasi timbangan"
                  tone={data.calibration.needsCalibration ? "bg-red-600" : "bg-emerald-600"}
                  big={data.calibration.needsCalibration ? "PERLU KALIBRASI" : "OK"}
                  sub={`offset ${formatNumber(data.calibration.scaleStudyOffsetPct)}% · usia ${formatNumber(data.calibration.ageDays)} hari`}
                />
              )}
            </div>

            {/* Lapor massa muatan → surveyor (Mass Monitoring) */}
            <MassReportForm
              unitId={data.unit.id}
              category={data.unit.category}
              operatorName={data.identity.name ?? data.identity.username ?? data.unit.id}
            />

            {/* Simulasi perjalanan → overspeed/hazard event */}
            <DriverTripSim unitId={data.unit.id} vmaxKmh={data.speed?.vmaxSafeTravelKmh ?? null} />

            {/* Peta bahaya jalan LiDAR */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">Bahaya jalan KM33 → Jetty (LiDAR)</h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">prototipe · data simulasi</span>
              </div>
              {roadMap ? (
                <HazardMap data={roadMap} />
              ) : (
                <RoadMapStrip segments={data.roadMap.segments} mappers={data.roadMap.mappers} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function BigIndicator({ title, tone, big, sub }: { title: string; tone: string; big: string; sub: string }) {
  return (
    <div className={cx("rounded-2xl p-5 text-white", tone)}>
      <div className="text-sm uppercase tracking-wide text-white/80">{title}</div>
      <div className="mt-1 text-3xl font-bold">{big}</div>
      <div className="mt-1 text-sm text-white/90">{sub}</div>
    </div>
  );
}
