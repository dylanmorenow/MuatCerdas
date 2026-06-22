// Revisi #5 — pemantauan OTOMATIS dari GPS real-time (Teltonika FMB). Membaca pergerakan unit lalu
// mendeteksi sendiri: ngebut di atas batas aman aktual, rem mendadak (kecepatan turun drastis antar
// pembacaan), dan masuk zona hazard. Kejadian dikirim (lewat antrean offline) → bahan rekomendasi ban.
// Bukan tombol manual; sistem dianggap sudah terintegrasi membaca GPS.
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { hazardLabel, type SpeedActualStatus, type HazardProximity } from "@muatcerdas/shared";
import { useOfflineQueue } from "../lib/useOfflineQueue";

const COOLDOWN_MS = 60_000; // jeda minimal antar kejadian sejenis agar tak membanjiri
const HARD_BRAKE_DROP_KMH = 12; // penurunan kecepatan antar pembacaan yang dianggap rem mendadak

export function DriverAutoMonitor({
  unitId,
  groundSpeedKmh,
  actualStatus,
  vmaxKmh,
  hazard,
  capturedAt,
}: {
  unitId: string;
  groundSpeedKmh: number | null;
  actualStatus: SpeedActualStatus;
  vmaxKmh: number | null;
  hazard: HazardProximity | null;
  capturedAt: string | null;
}) {
  const { enqueue } = useOfflineQueue();
  const qc = useQueryClient();
  const [log, setLog] = useState<string[]>([]);
  const prevSpeed = useRef<number | null>(null);
  const lastSent = useRef<Record<string, number>>({});
  const lastHazardStatus = useRef<string>("clear");

  useEffect(() => {
    if (groundSpeedKmh == null) return;
    const now = Date.now();
    const fire = async (type: string, detail: string, extra: Record<string, unknown> = {}) => {
      if (now - (lastSent.current[type] ?? 0) < COOLDOWN_MS) return;
      lastSent.current[type] = now;
      const r = await enqueue("/api/driver/event", { unitId, type, detail, source: "gps", ...extra });
      setLog((p) => [`${r.sent ? "Terkirim" : "Antre"}: ${detail}`, ...p].slice(0, 5));
      void qc.invalidateQueries({ queryKey: ["driver-events"] });
      void qc.invalidateQueries({ queryKey: ["tire-recs"] });
    };

    // 1) Ngebut: kecepatan aktual di atas batas aman.
    if (actualStatus === "over" && vmaxKmh != null) {
      void fire(
        "overspeed",
        `Kecepatan aktual ${Math.round(groundSpeedKmh)} km/jam di atas batas aman ${Math.round(vmaxKmh)} km/jam`,
      );
    }
    // 2) Rem mendadak: kecepatan turun drastis antar pembacaan GPS.
    const prev = prevSpeed.current;
    if (prev != null && prev - groundSpeedKmh >= HARD_BRAKE_DROP_KMH) {
      void fire("hard_braking", `Kecepatan turun drastis dari ${Math.round(prev)} ke ${Math.round(groundSpeedKmh)} km/jam`);
    }
    // 3) Masuk zona hazard (transisi → in_zone).
    if (hazard && hazard.status === "in_zone" && lastHazardStatus.current !== "in_zone") {
      const what = hazard.type ? hazardLabel(hazard.type) : "bahaya jalan";
      void fire("hazard", `Mengenai ${what}`, hazard.type ? { hazardType: hazard.type } : {});
    }
    lastHazardStatus.current = hazard?.status ?? "clear";
    prevSpeed.current = groundSpeedKmh;
  }, [capturedAt, groundSpeedKmh, actualStatus, vmaxKmh, hazard, unitId, enqueue, qc]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Pemantauan otomatis GPS</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> aktif
        </span>
      </div>
      <p className="text-[11px] text-slate-400">
        Sistem membaca pergerakan unit dari GPS real-time (Teltonika FMB) dan otomatis mencatat saat ngebut melebihi
        batas aman, rem mendadak, atau masuk zona hazard, lalu mengirimnya ke surveyor untuk rekomendasi ban.
      </p>
      {log.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {log.map((m, i) => (
            <li key={i} className="flex items-start gap-1.5">
              <span className="text-slate-400">•</span>
              {m}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
