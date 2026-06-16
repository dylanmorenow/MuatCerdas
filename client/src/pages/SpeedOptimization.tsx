import { useEffect, useState } from "react";
import {
  formatNumber,
  productionSpeed,
  criticalTireLoadTonnes,
  tkphTire,
  vmaxSafeWorkKmh,
  workAvgToTravel,
  decideSpeed,
  type SpeedParams,
} from "@muatcerdas/shared";
import { useSpeed, useSaveSpeedParams, useResetSpeedParams, type SpeedUnitRow, type Hd785SpeedRow } from "../api/speed";
import { PageHeader, Card, Loading, ErrorState, InfoTip, Badge, cx } from "../components/ui";

const kmh = (n: number) => (Number.isFinite(n) ? `${formatNumber(n, 1)} km/jam` : "—");
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
        <PageHeader title="Kecepatan Aman (TKPH)" />
        {error ? <ErrorState message={(error as Error).message} onRetry={() => void refetch()} /> : <Loading />}
      </>
    );
  }

  const dirty = JSON.stringify(form) !== JSON.stringify(data.params);
  const set = (k: keyof SpeedParams, v: number) => setForm((f) => (f ? { ...f, [k]: v } : f));

  // — Recompute LIVE (<300 ms) via shared, pakai agregat armada dari server (SR-V5) —
  const fi = data.fleetInputs;
  const prod = productionSpeed({
    dailyTargetTon: form.dailyTargetTon,
    payloadPerUnitTon: fi.payloadPerUnitTon,
    unitCount: fi.unitCount,
    effectiveWorkHoursPerDay: form.effectiveWorkHoursPerDay,
    fixedTimeHours: form.fixedTimeHours,
    oneWayKm: form.oneWayKm,
  });
  const repQa = criticalTireLoadTonnes({
    tareKg: fi.avgTareKg,
    payloadKg: fi.payloadPerUnitTon * 1000,
    loadShareHeaviestPosition: form.loadShareHeaviestPosition,
  }).qaT;
  const repTkphTire = tkphTire(fi.avgCatalogTkph, form.tempCorrectionFactor, form.siteCorrectionFactor);
  const vmaxWork = vmaxSafeWorkKmh(repTkphTire, repQa);
  const vmaxTravel = workAvgToTravel(vmaxWork, prod.travelFraction);
  const decision = decideSpeed({
    vRequiredWorkKmh: prod.vRequiredWorkKmh,
    vmaxSafeWorkKmh: vmaxWork,
    context: {
      unitCount: fi.unitCount,
      dailyTargetTon: form.dailyTargetTon,
      overload: {
        tkphTireValue: repTkphTire,
        currentPayloadT: fi.payloadPerUnitTon,
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
        title="Kecepatan Aman (TKPH)"
        subtitle="Modul C — batas kecepatan dari beban ban (TKPH) vs target produksi. Deterministik (bukan AI). Semua angka ASUMSI."
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => reset.mutate()}
              disabled={reset.isPending}
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-50"
            >
              Reset ke default
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
                {conflict ? "KONFLIK — target melebihi batas ban" : "AMAN — target tercapai dalam batas ban"}
              </div>
              <div className="text-sm text-slate-600">
                Butuh {kmh(prod.vRequiredWorkKmh)} · Batas aman {kmh(vmaxWork)} (basis kerja rata-rata)
                {!conflict && decision.recommendedWorkKmh != null && (
                  <> · Rekomendasi jalan {kmh(decision.recommendedWorkKmh)}</>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase tracking-wide text-slate-500">Margin</div>
            <div className={cx("text-lg font-bold", conflict ? "text-red-600" : "text-emerald-600")}>
              {kmh(decision.marginKmh)}
            </div>
          </div>
        </div>

        {conflict && (
          <div className="mt-4 border-t border-red-200 pt-3">
            <div className="mb-2 text-sm font-semibold text-slate-700">
              JANGAN ngebut. Opsi solusi terukur:
              <InfoTip text="Opsi basis 'work' menyelesaikan konflik TKPH; basis 'travel' hanya memperbaiki kelayakan kecepatan saat bergerak (§C.5)." />
            </div>
            {decision.options.length === 0 ? (
              <p className="text-sm text-slate-500">Tidak ada opsi terukur pada konteks ini.</p>
            ) : (
              <ul className="space-y-1.5">
                {decision.options.map((o) => (
                  <li key={o.kind} className="flex items-start gap-2 text-sm text-slate-700">
                    <Badge tone={o.basis === "work" ? "blue" : "slate"}>{o.basis === "work" ? "TKPH" : "travel"}</Badge>
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
              Target produksi (§C.4)
              <InfoTip text="Rantai cycle time → kecepatan yang dibutuhkan. Rute CPP→Jetty (truk hauling)." />
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField label="Target harian" unit="t/hari" value={form.dailyTargetTon} onChange={(v) => set("dailyTargetTon", v)} />
              <NumberField label="Jam kerja efektif" unit="jam/hari" value={form.effectiveWorkHoursPerDay} onChange={(v) => set("effectiveWorkHoursPerDay", v)} />
              <NumberField label="Waktu tetap/siklus" unit="jam" step={0.05} value={form.fixedTimeHours} onChange={(v) => set("fixedTimeHours", v)} hint="loading+dumping+manuver+antri" />
              <NumberField label="Jarak satu arah" unit="km" value={form.oneWayKm} onChange={(v) => set("oneWayKm", v)} />
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-500 sm:grid-cols-3">
              <Mini label="Trip/unit/hari" value={formatNumber(prod.tripsPerUnitPerDay, 1)} />
              <Mini label="Cycle tersedia" value={`${formatNumber(prod.cycleTimeAvailableHours, 2)} jam`} />
              <Mini label="V butuh (travel)" value={kmh(prod.vRequiredTravelKmh)} />
              <Mini label="V butuh (kerja)" value={kmh(prod.vRequiredWorkKmh)} />
              <Mini label="travelFraction" value={formatNumber(prod.travelFraction, 3)} />
              <Mini label="Armada (unit)" value={formatNumber(fi.unitCount, 0)} />
            </dl>
          </Card>

          <Card>
            <h2 className="mb-3 font-semibold text-slate-800">
              TKPH ban & beban (§C.1–§C.2)
              <InfoTip text="Beban ban kritis Qa & batas TKPH ban. Katalog TKPH per model = WAJIB DICARI dari brosur pabrik." />
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField label="Koreksi suhu" step={0.05} value={form.tempCorrectionFactor} onChange={(v) => set("tempCorrectionFactor", v)} />
              <NumberField label="Koreksi situs" step={0.05} value={form.siteCorrectionFactor} onChange={(v) => set("siteCorrectionFactor", v)} />
              <NumberField label="Fraksi beban ban terberat" step={0.01} value={form.loadShareHeaviestPosition} onChange={(v) => set("loadShareHeaviestPosition", v)} />
              <NumberField label="Jarak/shift (Vm)" unit="km" value={form.distancePerShiftKm} onChange={(v) => set("distancePerShiftKm", v)} />
              <NumberField label="Jam/shift (Vm)" unit="jam" value={form.workHoursPerShift} onChange={(v) => set("workHoursPerShift", v)} />
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Vm (kecepatan kerja rata-rata) = {kmh(data.vmKmh)} · Qa representatif {ton(repQa)} · TKPH_ban representatif {formatNumber(repTkphTire, 0)}
            </p>
          </Card>
        </div>

        {/* Panduan driver + ringkasan */}
        <div className="space-y-4">
          {/* Pakai <div> (bukan Card) agar bg-kpp-green tak bertabrakan dgn bg-white bawaan Card → teks putih tetap terlihat. */}
          <div className="rounded-xl border border-emerald-800/30 bg-kpp-green p-5 text-white shadow-sm">
            <div className="text-xs uppercase tracking-wide text-emerald-100">Panduan driver — kecepatan maks</div>
            <div className="mt-1 text-3xl font-bold text-white">{kmh(vmaxTravel)}</div>
            <div className="mt-1 text-xs text-emerald-50">
              basis travel (spidometer). Setara {kmh(vmaxWork)} kerja rata-rata.
            </div>
            <div className="mt-3 border-t border-white/30 pt-3 text-sm text-emerald-50">
              {conflict
                ? "Target sekarang menuntut kecepatan di atas batas ban — turunkan beban/target, jangan ngebut."
                : "Jalan pada rekomendasi; jaga ≤ batas agar ban awet."}
            </div>
          </div>

          <Card>
            <h2 className="mb-2 font-semibold text-slate-800">Rekonsiliasi satuan (§C.5)</h2>
            <p className="text-xs text-slate-500">
              Keputusan dibandingkan pada <b>kecepatan kerja rata-rata</b> (Vm, native TKPH). Angka driver dikonversi ke
              <b> basis travel</b> via travelFraction = {formatNumber(prod.travelFraction, 3)}.
            </p>
          </Card>
        </div>
      </div>

      {/* Tabel per-unit haul */}
      <Card className="mt-5 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="font-semibold text-slate-800">
            Per unit — truk hauling
            <InfoTip text="Vmax dihitung dari muatan & ban tiap unit. Tabel mengikuti parameter TERSIMPAN (klik Simpan untuk perbarui)." />
          </h2>
          <span className="text-xs text-slate-400">{data.units.length} unit</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Unit</th>
                <th className="px-4 py-2.5 font-medium">Ban</th>
                <th className="px-4 py-2.5 font-medium">Muatan</th>
                <th className="px-4 py-2.5 font-medium">Qa</th>
                <th className="px-4 py-2.5 font-medium">TKPH site / ban</th>
                <th className="px-4 py-2.5 font-medium">Vmax kerja</th>
                <th className="px-4 py-2.5 font-medium">Vmax driver</th>
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
            HD785 — Vmax dari payload (ringkas)
            <InfoTip text="Panel ringkas: muatan HD785 (Modul B) → Qa → Vmax. Tanpa rantai target produksi (itu untuk truk hauling)." />
          </h2>
          <span className="text-xs text-slate-400">{data.hd785.length} unit</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">Unit</th>
                <th className="px-4 py-2.5 font-medium">Muatan / target</th>
                <th className="px-4 py-2.5 font-medium">Qa</th>
                <th className="px-4 py-2.5 font-medium">TKPH ban</th>
                <th className="px-4 py-2.5 font-medium">Vmax kerja</th>
                <th className="px-4 py-2.5 font-medium">Vmax driver</th>
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
        Catatan jujur: seluruh parameter bertanda ASUMSI; katalog TKPH per model ban WAJIB DICARI dari brosur pabrik
        (docs/ASSUMPTIONS.md §F). Keluaran atas data contoh/impor — bukan feed live dari truk.
      </p>
    </>
  );
}

function UnitRow({ u }: { u: SpeedUnitRow }) {
  return (
    <tr className={cx(u.exceedsRequired && "bg-red-50/50")}>
      <td className="px-4 py-2.5 font-medium text-slate-700">{u.id}<div className="text-xs font-normal text-slate-400">{u.model}</div></td>
      <td className="px-4 py-2.5 text-slate-600">{u.tireModel ?? "—"}</td>
      <td className="px-4 py-2.5 text-slate-600">
        {ton(u.payloadT)} {u.overTarget && <Badge tone="amber">over</Badge>}
      </td>
      <td className="px-4 py-2.5 text-slate-600">{ton(u.qaT)}</td>
      <td className="px-4 py-2.5 text-slate-600">{formatNumber(u.tkphSite, 0)} / {formatNumber(u.tkphTire, 0)}</td>
      <td className="px-4 py-2.5 text-slate-600">{kmh(u.vmaxSafeWorkKmh)}</td>
      <td className="px-4 py-2.5 font-medium text-slate-800">{kmh(u.vmaxSafeTravelKmh)}</td>
      <td className="px-4 py-2.5">
        {u.exceedsRequired ? <Badge tone="red">di atas batas</Badge> : <Badge tone="green">aman</Badge>}
      </td>
    </tr>
  );
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
