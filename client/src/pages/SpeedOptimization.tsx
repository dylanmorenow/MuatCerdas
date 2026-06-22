import { useEffect, useState } from "react";
import {
  formatNumber,
  productionSpeed,
  criticalTireLoadTonnes,
  tkphTire,
  vmaxSafeWorkKmh,
  workAvgToTravel,
  decideSpeed,
  roadOpsConditionLabel,
  ROAD_OPS_CONDITIONS,
  clampSpeedKmh,
  HAUL_SPEED_CEILING_KMH,
  type SpeedParams,
  type RoadOpsCondition,
  type SpeedActualStatus,
} from "@muatcerdas/shared";
import { useSpeed, useSaveSpeedParams, useResetSpeedParams, type SpeedUnitRow, type Hd785SpeedRow } from "../api/speed";
import { useZones, useSetZoneCondition } from "../api/zones";
import { PageHeader, Card, Loading, ErrorState, InfoTip, Badge, cx } from "../components/ui";

const kmh = (n: number) => (Number.isFinite(n) ? `${formatNumber(n, 1)} km/jam` : "-");
const ton = (n: number) => `${formatNumber(n, 1)} t`;

export function SpeedOptimization() {
  const { data, isLoading, error, refetch } = useSpeed();
  const save = useSaveSpeedParams();
  const reset = useResetSpeedParams();
  const [form, setForm] = useState<SpeedParams | null>(null);

  useEffect(() => {
    if (data) setForm(data.params);
  }, [data]);

  if (isLoading || !form || !data) {
    return (
      <>
        <PageHeader title="Kecepatan Aman" />
        {error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : <Loading />}
      </>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(data.params);
  const set = (k: keyof SpeedParams, v: number) => setForm((f) => (f ? { ...f, [k]: v } : f));

  // — Recompute LIVE (<300 ms) via shared. Jumlah unit & kapasitas dari input editable (item 2). —
  const fi = data.fleetInputs;
  const haulPayloadTon = form.haulPayloadCapacityTon;
  const prod = productionSpeed({
    dailyTargetTon: form.dailyTargetTon,
    payloadPerUnitTon: haulPayloadTon,
    unitCount: form.haulUnitCount,
    effectiveWorkHoursPerDay: form.effectiveWorkHoursPerDay,
    fixedTimeHours: form.fixedTimeHours,
    oneWayKm: form.oneWayKm,
  });
  const repQa = criticalTireLoadTonnes({
    tareKg: fi.avgTareKg,
    payloadKg: haulPayloadTon * 1000,
    loadShareHeaviestPosition: form.loadShareHeaviestPosition,
  }).qaT;
  const repTkphTire = tkphTire(fi.avgCatalogTkph, form.tempCorrectionFactor, form.siteCorrectionFactor);
  const vmaxWork = vmaxSafeWorkKmh(repTkphTire, repQa);
  const vmaxTravel = workAvgToTravel(vmaxWork, prod.travelFraction);
  // Rekomendasi yang DITAMPILKAN ke driver dipotong ke batas atas absolut hauling (output clamp).
  // decideSpeed di bawah tetap memakai nilai dinamis (vmaxWork/vmaxTravel) — keputusan tak berubah.
  const vmaxTravelCapped = clampSpeedKmh(vmaxTravel, HAUL_SPEED_CEILING_KMH);
  const decision = decideSpeed({
    vRequiredWorkKmh: prod.vRequiredWorkKmh,
    vmaxSafeWorkKmh: vmaxWork,
    context: {
      unitCount: form.haulUnitCount,
      dailyTargetTon: form.dailyTargetTon,
      overload: {
        tkphTireValue: repTkphTire,
        currentPayloadT: haulPayloadTon,
        qaAtZeroPayloadT: form.loadShareHeaviestPosition * (fi.avgTareKg / 1000),
        qaSlopePerPayloadT: form.loadShareHeaviestPosition / 2,
      },
      travel: {
        cycleTimeAvailableHours: prod.cycleTimeAvailableHours,
        currentFixedTimeHours: form.fixedTimeHours,
        roundTripKm: 2 * form.oneWayKm,
        vmaxSafeTravelKmh: vmaxTravel,
      },
    },
  });
  const conflict = decision.status === "conflict";

  return (
    <>
      <PageHeader
        title="Kecepatan Aman"
        subtitle="Batas kecepatan aman berdasarkan beban yang ditanggung ban, dibandingkan dengan target produksi. Dihitung dengan rumus pasti, bukan tebakan AI. Kolom Aktual (GPS) memakai kecepatan sebenarnya dari telemetri (perpindahan koordinat), bukan spidometer. Semua angka adalah asumsi yang bisa diubah."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Kembalikan ke awal
            </button>
            <button
              onClick={() => form && save.mutate(form)}
              disabled={!dirty || save.isPending}
              className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-40"
            >
              {save.isPending ? "Menyimpan…" : dirty ? "Simpan" : "Tersimpan"}
            </button>
          </div>
        }
      />

      {/* Banner keputusan §C.6 */}
      <div
        className={cx(
          "mb-5 rounded-xl border-2 p-5",
          conflict ? "border-red-300 bg-red-50" : "border-emerald-300 bg-emerald-50",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className={cx("h-10 w-10 flex-shrink-0 rounded-full", conflict ? "bg-red-500" : "bg-emerald-500")} />
            <div>
              <div className="text-xl font-bold text-slate-800">
                {conflict ? "Konflik. Target hanya tercapai bila melebihi batas aman ban." : "Aman. Target tercapai tanpa melebihi batas ban."}
              </div>
              <div className="text-sm text-slate-600">
                Perlu {kmh(prod.vRequiredWorkKmh)}. Batas aman {kmh(vmaxWork)} (kecepatan rata-rata kerja)
                {!conflict && decision.recommendedWorkKmh != null && (
                  <>. Disarankan jalan di {kmh(decision.recommendedWorkKmh)}</>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-500">Selisih</div>
            <div className={cx("text-lg font-bold", conflict ? "text-red-600" : "text-emerald-600")}>
              {kmh(decision.marginKmh)}
            </div>
          </div>
        </div>

        {conflict && (
          <div className="mt-4 border-t border-red-200 pt-3">
            <div className="mb-2 text-sm font-semibold text-slate-700">
              Jangan ngebut. Pilihan solusi:
              <InfoTip text="Pilihan bertanda 'beban ban' benar-benar menyelesaikan masalah batas ban. Pilihan bertanda 'waktu tempuh' hanya membuat kecepatan saat jalan lebih masuk akal." />
            </div>
            {decision.options.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada pilihan solusi untuk kondisi ini.</p>
            ) : (
              <ul className="space-y-1.5">
                {decision.options.map((o) => (
                  <li key={o.kind} className="flex items-start gap-2 text-sm text-slate-700">
                    <Badge tone={o.basis === "work" ? "blue" : "slate"}>{o.basis === "work" ? "beban ban" : "waktu tempuh"}</Badge>
                    <span>{o.label}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Form editable */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">
              Target produksi & armada
              <InfoTip text="Dari target produksi dihitung kecepatan yang dibutuhkan, lewat waktu satu siklus angkut. Jumlah unit dan kapasitas bisa diubah sesuai realita lapangan." />
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField label="Jumlah unit hauling" value={form.haulUnitCount} onChange={(v) => set("haulUnitCount", v)} hint="realita lapangan" />
              <NumberField label="Kapasitas per unit" unit="ton" value={form.haulPayloadCapacityTon} onChange={(v) => set("haulPayloadCapacityTon", v)} hint="2 trailer" />
              <NumberField label="Target harian" unit="ton/hari" value={form.dailyTargetTon} onChange={(v) => set("dailyTargetTon", v)} />
              <NumberField label="Jam kerja efektif" unit="jam/hari" value={form.effectiveWorkHoursPerDay} onChange={(v) => set("effectiveWorkHoursPerDay", v)} />
              <NumberField label="Waktu diam per siklus" unit="jam" step={0.05} value={form.fixedTimeHours} onChange={(v) => set("fixedTimeHours", v)} hint="muat, bongkar, manuver, antre" />
              <NumberField label="Jarak satu arah" unit="km" value={form.oneWayKm} onChange={(v) => set("oneWayKm", v)} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-3">
              <Mini label="Ritase per unit per hari" value={formatNumber(prod.tripsPerUnitPerDay, 1)} />
              <Mini label="Waktu per siklus" value={`${formatNumber(prod.cycleTimeAvailableHours, 2)} jam`} />
              <Mini label="Kecepatan perlu (saat jalan)" value={kmh(prod.vRequiredTravelKmh)} />
              <Mini label="Kecepatan perlu (rata-rata)" value={kmh(prod.vRequiredWorkKmh)} />
              <Mini label="Porsi waktu jalan" value={formatNumber(prod.travelFraction, 3)} />
              <Mini label="Jumlah unit" value={formatNumber(form.haulUnitCount, 0)} />
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">
              Batas beban ban dan beban aktual
              <InfoTip text="Beban yang ditanggung ban dan batas amannya. Angka batas tiap merek ban perlu dicari dari brosur pabrik." />
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField label="Faktor koreksi suhu" step={0.05} value={form.tempCorrectionFactor} onChange={(v) => set("tempCorrectionFactor", v)} />
              <NumberField label="Faktor koreksi lokasi" step={0.05} value={form.siteCorrectionFactor} onChange={(v) => set("siteCorrectionFactor", v)} />
              <NumberField label="Porsi beban di ban terberat" step={0.01} value={form.loadShareHeaviestPosition} onChange={(v) => set("loadShareHeaviestPosition", v)} />
              <NumberField label="Jarak per shift" unit="km" value={form.distancePerShiftKm} onChange={(v) => set("distancePerShiftKm", v)} />
              <NumberField label="Jam kerja per shift" unit="jam" value={form.workHoursPerShift} onChange={(v) => set("workHoursPerShift", v)} />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Kecepatan rata-rata kerja {kmh(data.vmKmh)}. Beban ban {ton(repQa)}. Batas beban ban sekitar {formatNumber(repTkphTire, 0)}.
            </p>
          </Card>
        </div>

        {/* Panduan driver + ringkasan */}
        <div className="space-y-4">
          {/* Pakai <div> (bukan Card) agar bg-kpp-green tak bertabrakan dgn bg-white bawaan Card → teks putih tetap terlihat. */}
          <div className="rounded-xl border border-emerald-800/30 bg-kpp-green p-5 text-white shadow-sm">
            <div className="text-xs uppercase tracking-wide text-emerald-100">Kecepatan aman untuk driver (aktual GPS)</div>
            <div className="mt-1 text-3xl font-bold text-white">{kmh(vmaxTravelCapped)}</div>
            <div className="mt-1 text-xs text-emerald-50">
              kecepatan aktual maksimum (dibaca GPS), dibatasi {HAUL_SPEED_CEILING_KMH} km/jam untuk truk hauling.
            </div>
            <div className="mt-3 border-t border-white/30 pt-3 text-sm text-emerald-50">
              {conflict
                ? "Target sekarang butuh kecepatan di atas batas ban. Turunkan muatan atau target, jangan ngebut."
                : "Jalan sesuai rekomendasi. Jaga jangan melebihi batas supaya ban awet."}
            </div>
          </div>

          <Card>
            <h2 className="mb-2 font-semibold text-slate-800">Penyamaan satuan kecepatan</h2>
            <p className="text-xs text-slate-500">
              Keputusan dibandingkan memakai <b>kecepatan rata-rata kerja</b> (termasuk waktu berhenti). Angka untuk
              driver dinyatakan sebagai <b>kecepatan aktual saat bergerak (GPS)</b> memakai porsi waktu jalan {formatNumber(prod.travelFraction, 3)}.
            </p>
          </Card>
        </div>
      </div>

      {/* Kondisi jalan per zona (ADMIN-8) */}
      <ZoneConditionPanel />

      {/* Tabel per-unit haul */}
      <Card className="mt-5 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-800">
            Per unit truk hauling
            <InfoTip text="Kecepatan maksimum dihitung dari muatan dan ban tiap unit, lalu disesuaikan dengan kondisi jalan di zonanya, dan terakhir dipotong ke batas atas absolut 45 km/jam (truk hauling). Tabel memakai angka yang tersimpan. Klik Simpan untuk memperbarui." />
          </h2>
          <span className="text-xs text-slate-400">{data.units.length} unit</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Unit</th>
                <th className="px-4 py-2.5 font-medium">Ban</th>
                <th className="px-4 py-2.5 font-medium">Zona / jalan</th>
                <th className="px-4 py-2.5 font-medium">Muatan</th>
                <th className="px-4 py-2.5 font-medium">Beban ban</th>
                <th className="px-4 py-2.5 font-medium">Beban vs batas</th>
                <th className="px-4 py-2.5 font-medium">Maks (rata-rata)</th>
                <th className="px-4 py-2.5 font-medium">Maks aman (aktual)</th>
                <th className="px-4 py-2.5 font-medium">Aktual (GPS)</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.units.map((u) => (
                <UnitRow key={u.id} u={u} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Panel HD785 ringkas */}
      <Card className="mt-5 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-800">
            HD785: kecepatan maksimum dari muatan
            <InfoTip text="Ringkasan untuk HD785. Dari muatan dihitung beban ban lalu kecepatan maksimum aman, dipotong ke batas atas absolut 50 km/jam (HD785 in-pit). Tanpa hitungan target produksi, karena itu khusus truk hauling." />
          </h2>
          <span className="text-xs text-slate-400">{data.hd785.length} unit</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Unit</th>
                <th className="px-4 py-2.5 font-medium">Muatan vs target</th>
                <th className="px-4 py-2.5 font-medium">Beban ban</th>
                <th className="px-4 py-2.5 font-medium">Batas beban ban</th>
                <th className="px-4 py-2.5 font-medium">Maks (rata-rata)</th>
                <th className="px-4 py-2.5 font-medium">Maks aman (aktual)</th>
                <th className="px-4 py-2.5 font-medium">Aktual (GPS)</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.hd785.map((u) => (
                <Hd785Row key={u.id} u={u} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="mt-4 text-xs text-slate-400">
        Catatan jujur. Semua angka di sini adalah asumsi. Angka batas beban tiap merek ban masih perlu dicari dari brosur
        pabrik. Kecepatan Aktual (GPS) berasal dari telemetri simulasi (mewakili tracker GNSS/feed FMS di tiap truk); arsitektur
        siap disambung ke perangkat nyata, bukan feed satelit langsung sekarang. Hasil dihitung dari data contoh atau data yang diunggah.
      </p>
    </>
  );
}

const ZONE_LABEL_SHORT: Record<string, string> = { cpp: "Dekat CPP", tengah: "Tengah", jetty: "Dekat Jetty" };

function UnitRow({ u }: { u: SpeedUnitRow }) {
  const condBad = u.zoneCondition !== "normal";
  return (
    <tr className={cx(u.exceedsRequired && "bg-red-50/50")}>
      <td className="px-4 py-2.5 font-medium text-slate-700">{u.id}<div className="text-xs font-normal text-slate-400">{u.model}</div></td>
      <td className="px-4 py-2.5 text-slate-600">{u.tireModel ?? "-"}</td>
      <td className="px-4 py-2.5 text-slate-600">
        {u.zone ? ZONE_LABEL_SHORT[u.zone] ?? u.zone : "-"}
        <div className={cx("text-xs", condBad ? "font-medium text-amber-600" : "text-slate-400")}>
          {roadOpsConditionLabel((u.zoneCondition as RoadOpsCondition) ?? "normal")}
        </div>
      </td>
      <td className="px-4 py-2.5 text-slate-600">
        {ton(u.payloadT)} {u.overTarget && <Badge tone="amber">over</Badge>}
      </td>
      <td className="px-4 py-2.5 text-slate-600">{ton(u.qaT)}</td>
      <td className="px-4 py-2.5 text-slate-600">{formatNumber(u.tkphSite, 0)} / {formatNumber(u.tkphTire, 0)}</td>
      <td className="px-4 py-2.5 text-slate-600">{kmh(u.vmaxSafeWorkKmh)}</td>
      <td className="px-4 py-2.5 font-medium text-slate-800">{kmh(u.vmaxSafeTravelKmh)}</td>
      <ActualCell kmh={u.actualSpeedKmh} status={u.actualStatus} />
      <td className="px-4 py-2.5">
        {u.exceedsRequired ? <Badge tone="red">di atas batas</Badge> : <Badge tone="green">aman</Badge>}
      </td>
    </tr>
  );
}

/** Sel kecepatan AKTUAL GPS, diwarnai sesuai status terhadap batas aman. */
function ActualCell({ kmh: k, status }: { kmh: number | null; status: SpeedActualStatus }) {
  if (k == null) return <td className="px-4 py-2.5 text-slate-400">-</td>;
  const tone =
    status === "over" ? "text-red-600 font-bold" : status === "near" ? "text-amber-600 font-semibold" : "text-slate-800 font-medium";
  return <td className={cx("px-4 py-2.5", tone)}>{kmh(k)}</td>;
}

function Hd785Row({ u }: { u: Hd785SpeedRow }) {
  return (
    <tr className={cx(u.overTarget && "bg-amber-50/50")}>
      <td className="px-4 py-2.5 font-medium text-slate-700">{u.id}</td>
      <td className="px-4 py-2.5 text-slate-600">{ton(u.payloadT)} / {ton(u.targetT)}</td>
      <td className="px-4 py-2.5 text-slate-600">{ton(u.qaT)}</td>
      <td className="px-4 py-2.5 text-slate-600">{formatNumber(u.tkphTire, 0)}</td>
      <td className="px-4 py-2.5 text-slate-600">{kmh(u.vmaxSafeWorkKmh)}</td>
      <td className="px-4 py-2.5 font-medium text-slate-800">{kmh(u.vmaxSafeTravelKmh)}</td>
      <ActualCell kmh={u.actualSpeedKmh} status={u.actualStatus} />
      <td className="px-4 py-2.5">
        {u.overTarget ? <Badge tone="amber">overload</Badge> : <Badge tone="green">ok</Badge>}
      </td>
    </tr>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span>{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}

function ZoneConditionPanel() {
  const { data: zones } = useZones();
  const setCond = useSetZoneCondition();
  if (!zones) return null;
  return (
    <Card className="mt-5">
      <h2 className="mb-1 font-semibold text-slate-800">
        Kondisi jalan per zona
        <InfoTip text="Pilih kondisi jalan tiap zona. Kondisi yang lebih buruk menurunkan kecepatan aman semua unit di zona itu, jadi kecepatan tidak hanya dipengaruhi muatan. Licin berarti unit praktis berhenti." />
      </h2>
      <p className="mb-3 text-xs text-slate-400">Berubah langsung memengaruhi kecepatan unit di tabel bawah.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {zones.map((z) => (
          <label key={z.zone} className="block">
            <span className="mb-1 block text-xs text-slate-500">{z.label}</span>
            <select
              value={z.condition}
              onChange={(e) => setCond.mutate({ zone: z.zone, condition: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              {ROAD_OPS_CONDITIONS.map((c) => (
                <option key={c} value={c}>
                  {roadOpsConditionLabel(c)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </Card>
  );
}

function NumberField({
  label,
  value,
  onChange,
  unit,
  step,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  step?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center justify-between text-xs text-slate-500">
        <span>{label}</span>
        {unit && <span className="text-slate-400">{unit}</span>}
      </span>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => {
          const n = Number(e.target.value);
          onChange(Number.isFinite(n) ? n : 0);
        }}
        className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
      />
      {hint && <span className="mt-0.5 block text-[10px] text-slate-400">{hint}</span>}
    </label>
  );
}
