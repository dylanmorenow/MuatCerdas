// Revisi F3 — simulasi perjalanan driver: deteksi overspeed (vs Vmax aman Modul C) & melewati
// zona bahaya (peta LiDAR) → kirim DriverEvent (lewat antrean offline). DISIMULASIKAN: tak ada
// GPS/spidometer live di kabin; mewakili apa yang akan dikirim perangkat kelak.
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { hazardLabel } from "@muatcerdas/shared";
import { useRoadMap } from "../api/roadmap";
import { useOfflineQueue } from "../lib/useOfflineQueue";

export function DriverTripSim({ unitId, vmaxKmh }: { unitId: string; vmaxKmh: number | null }) {
  const { data: roadMap } = useRoadMap();
  const { enqueue } = useOfflineQueue();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const simulate = async () => {
    if (!vmaxKmh) return;
    setBusy(true);
    const msgs: string[] = [];

    // 1) Overspeed: aktual sedikit di atas Vmax aman (deteksi sistem).
    const actual = Math.round(vmaxKmh * (1.05 + Math.random() * 0.18));
    if (actual > vmaxKmh) {
      const atKm = Number((2 + Math.random() * 31).toFixed(1));
      const detail = `Aktual ~${actual} km/jam > Vmax aman ${Math.round(vmaxKmh)} km/jam`;
      const r = await enqueue("/api/driver/event", { unitId, type: "overspeed", detail, atKm, source: "sim" });
      msgs.push(`${r.sent ? "Terkirim" : "Antre"}: overspeed — ${detail}`);
    }

    // 2) Hazard: melewati salah satu bahaya pada peta LiDAR.
    const hazards = roadMap?.hazards ?? [];
    if (hazards.length) {
      const h = hazards[Math.floor(Math.random() * hazards.length)]!;
      const detail = `Melewati ${hazardLabel(h.type)} di KM ${h.positionKm.toFixed(1)}`;
      const r = await enqueue("/api/driver/event", {
        unitId,
        type: "hazard",
        detail,
        atKm: h.positionKm,
        hazardType: h.type,
        source: "sim",
      });
      msgs.push(`${r.sent ? "Terkirim" : "Antre"}: hazard — ${detail}`);
    }

    setLog((prev) => [...msgs, ...prev].slice(0, 4));
    setBusy(false);
    void qc.invalidateQueries({ queryKey: ["driver-events"] });
    void qc.invalidateQueries({ queryKey: ["tire-recommendations"] });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Simulasi perjalanan</h2>
        <button
          onClick={() => void simulate()}
          disabled={busy || !vmaxKmh}
          className="rounded-lg bg-kpp-blue px-4 py-2 text-sm font-semibold text-white hover:bg-kpp-blue/90 disabled:opacity-50"
        >
          {busy ? "Memproses…" : "Simulasi 1 perjalanan"}
        </button>
      </div>
      <p className="text-[11px] text-slate-400">
        Mendeteksi overspeed (vs Vmax aman) &amp; bahaya yang dilewati → dikirim ke surveyor (rekomendasi Modul A).
        Simulasi — bukan perangkat live di kabin.
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
