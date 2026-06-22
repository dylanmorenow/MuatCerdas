// Surface DRIVER (FR-0004-4) — besar, sederhana, terbaca sekilas saat operasi.
import { useEffect, useRef } from "react";
import {
  formatNumber,
  cyclesRemaining,
  hazardLabel,
  type SpeedActualStatus,
  type HazardProximity,
} from "@muatcerdas/shared";
import { useDriverMe, type DriverBundle } from "../api/driver";
import { clearToken } from "../api/auth";
import { Loading, ErrorState, cx } from "../components/ui";
import { HazardMap } from "../components/HazardMap";
import { MassReportForm } from "../components/MassReport";
import { DriverAutoMonitor } from "../components/DriverAutoMonitor";

const CYCLE_KM = 70;

const ACTUAL_TONE: Record<SpeedActualStatus, { bg: string; label: string }> = {
  ok: { bg: "bg-kpp-blue", label: "AMAN" },
  near: { bg: "bg-amber-500", label: "MENDEKATI BATAS" },
  over: { bg: "bg-red-600", label: "DI ATAS BATAS — PELAN" },
  none: { bg: "bg-slate-600", label: "GPS belum tersedia" },
};

const PAYLOAD_TONE: Record<string, { bg: string; label: string }> = {
  under: { bg: "bg-amber-500", label: "KURANG" },
  ok: { bg: "bg-emerald-600", label: "PAS" },
  over: { bg: "bg-red-600", label: "BERLEBIH" },
};
const TIRE_TONE: Record<string, { bg: string; label: string }> = {
  ok: { bg: "bg-emerald-600", label: "SEHAT" },
  warn: { bg: "bg-amber-500", label: "PANTAU" },
  critical: { bg: "bg-red-600", label: "KRITIS" },
};

export function DriverDashboard() {
  const { data, isLoading, error, refetch } = useDriverMe();
  const isHd = data?.unit.category === "pit_dumper";
  const logout = () => {
    clearToken();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="flex items-center justify-between bg-kpp-green px-5 py-3 text-white">
        <div>
          <div className="text-base font-bold">KPPulse untuk Driver</div>
          {data && (
            <div className="text-xs text-white/80">
              {data.identity.name ?? "-"} · Unit {data.unit.id} ({data.unit.model}) · shift {data.identity.shift ?? "-"}
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
            {/* Peringatan kedekatan bahaya (digerakkan posisi GPS) */}
            {data.hazardAhead && <HazardBanner p={data.hazardAhead} />}

            {/* Kecepatan AKTUAL dari GPS — pengganti spidometer */}
            <ActualSpeedHero tel={data.telemetry} reason={data.speed?.reason ?? "data kecepatan belum tersedia"} />

            {/* Massa muatan (HD785) atau Kondisi ban (haul) */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {data.payload && (
                <BigIndicator
                  title="Massa muatan"
                  tone={PAYLOAD_TONE[data.payload.status]?.bg ?? "bg-slate-500"}
                  big={`${formatNumber(data.payload.meanKg / 1000, 1)} t`}
                  sub={`target ${formatNumber(data.payload.targetKg / 1000, 0)} t, ${PAYLOAD_TONE[data.payload.status]?.label ?? data.payload.status}`}
                />
              )}
              {data.tire && (
                <BigIndicator
                  title="Kondisi ban"
                  tone={TIRE_TONE[data.tire.status]?.bg ?? "bg-slate-500"}
                  big={TIRE_TONE[data.tire.status]?.label ?? data.tire.status}
                  sub={`sisa umur ~${formatNumber(data.tire.remainingLifeKm)} km, kira-kira ${formatNumber(cyclesRemaining(data.tire.remainingLifeKm, CYCLE_KM))} cycle lagi`}
                />
              )}
              <BigIndicator
                title="Target produksi hari ini"
                tone="bg-slate-700"
                big={`${formatNumber(data.production.dailyTargetTon)} t`}
                sub={`bagian unit ini sekitar ${formatNumber(data.production.unitShareTon)} t, atau ${formatNumber(data.production.perTripPayloadT, 1)} t per ritase`}
              />
              {data.calibration && (
                <BigIndicator
                  title="Kalibrasi timbangan"
                  tone={data.calibration.needsCalibration ? "bg-red-600" : "bg-emerald-600"}
                  big={data.calibration.needsCalibration ? "PERLU KALIBRASI" : "OK"}
                  sub={`selisih ${formatNumber(data.calibration.scaleStudyOffsetPct)}%, usia ${formatNumber(data.calibration.ageDays)} hari`}
                />
              )}
            </div>

            {/* Lapor massa muatan → surveyor (Mass Monitoring) */}
            <MassReportForm
              unitId={data.unit.id}
              category={data.unit.category}
              operatorName={data.identity.name ?? data.identity.username ?? data.unit.id}
            />

            {/* Pemantauan otomatis dari GPS → overspeed/rem mendadak/hazard (Revisi #5) */}
            <DriverAutoMonitor
              unitId={data.unit.id}
              groundSpeedKmh={data.telemetry?.groundSpeedKmh ?? null}
              actualStatus={data.telemetry?.actualStatus ?? "none"}
              vmaxKmh={data.speed?.vmaxSafeTravelKmh ?? null}
              hazard={data.hazardAhead}
              capturedAt={data.telemetry?.capturedAt ?? null}
            />

            {/* Peta bahaya jalan kamera AI — HD785: rute in-pit; hauling: KM33 ke Jetty */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-semibold text-slate-800">
                  {isHd ? "Bahaya jalan in-pit site Indexim (kamera AI)" : "Bahaya jalan KM 33 ke Jetty (kamera AI)"}
                </h2>
                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">prototipe, data simulasi</span>
              </div>
              <HazardMap
                data={data.roadMap}
                live={
                  data.telemetry
                    ? [{ unitId: data.unit.id, progressKm: data.telemetry.progressKm, groundSpeedKmh: data.telemetry.groundSpeedKmh }]
                    : []
                }
                selfUnitId={data.unit.id}
                selfStatus={data.telemetry?.actualStatus ?? "none"}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ActualSpeedHero({ tel, reason }: { tel: DriverBundle["telemetry"]; reason: string }) {
  const prev = useRef<number | null>(null);
  const speed = tel?.groundSpeedKmh ?? null;
  const delta = speed != null && prev.current != null ? speed - prev.current : 0;
  useEffect(() => {
    if (speed != null) prev.current = speed;
  }, [speed]);

  const tone = ACTUAL_TONE[tel?.actualStatus ?? "none"];
  const trend = delta > 0.3 ? "▲" : delta < -0.3 ? "▼" : "■";
  const vmax = tel?.vmaxSafeTravelKmh ?? null;

  return (
    <div className={cx("rounded-2xl p-6 text-white", tone.bg)}>
      <div className="flex items-center justify-between">
        <div className="text-sm uppercase tracking-wide text-white/80">Kecepatan aktual (GPS)</div>
        <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] text-white/90">
          dari pergerakan koordinat · bukan spidometer
        </span>
      </div>
      <div className="mt-1 flex items-end gap-3">
        <div className="text-7xl font-extrabold leading-none">{speed != null ? formatNumber(speed, 0) : "-"}</div>
        <div className="pb-2 text-2xl font-semibold">km/jam</div>
        {speed != null && <div className="pb-2 text-3xl font-bold text-white/80">{trend}</div>}
      </div>
      <div className="mt-2 text-sm font-medium text-white/95">
        {vmax != null ? `Batas aman ${formatNumber(vmax, 0)} km/jam · ${tone.label}` : tone.label}
      </div>
      <div className="mt-0.5 text-xs text-white/80">{reason}</div>
    </div>
  );
}

function HazardBanner({ p }: { p: HazardProximity }) {
  if (p.status === "clear" || p.distanceKm == null) return null;
  const inZone = p.status === "in_zone";
  const meters = Math.round(p.distanceKm * 1000);
  const what = p.type ? hazardLabel(p.type) : "bahaya jalan";
  return (
    <div
      className={cx(
        "rounded-2xl px-5 py-4 text-white",
        inZone ? "animate-pulse bg-red-600" : "bg-amber-500",
      )}
    >
      <div className="text-lg font-bold">{inZone ? "⚠ MASUK ZONA HAZARD" : "Mendekati hazard"}</div>
      <div className="text-sm text-white/95">
        {what} {inZone ? "— kurangi kecepatan sekarang" : `±${meters} m di depan`}
      </div>
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
