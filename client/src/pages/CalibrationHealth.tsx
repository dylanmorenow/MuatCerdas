import { useMemo, useState } from "react";
import { formatNumber } from "@muatcerdas/shared";
import { useCalibration, useAddCalibration } from "../api/payload";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";
import { ExportButton } from "../components/ExportButton";

export function CalibrationHealth() {
  const { data, isLoading, error, refetch } = useCalibration();
  const needs = data?.filter((r) => r.needsCalibration).length ?? 0;
  const unitIds = useMemo(() => (data ? [...new Set(data.map((r) => r.unitId))].sort() : []), [data]);

  return (
    <>
      <PageHeader
        title="Kesehatan Kalibrasi"
        subtitle="Status kalibrasi timbangan muatan di HD785. Sebuah timbangan perlu dikalibrasi ulang kalau selisihnya lebih dari 5 persen, atau sudah lebih dari 90 hari sejak kalibrasi terakhir."
        actions={
          data ? (
            <ExportButton
              filename="kalibrasi-hd785.csv"
              headers={["unit", "kalibrasiTerakhir", "offsetPct", "usiaHari", "perluKalibrasi"]}
              rows={data.map((r) => [r.unitId, r.lastCalibrationDate, r.scaleStudyOffsetPct, r.ageDays, r.needsCalibration ? "ya" : "tidak"])}
            />
          ) : undefined
        }
      />

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Total HD785" value={formatNumber(data.length)} />
            <Stat label="Perlu dikalibrasi" value={<span className="text-red-600">{needs}</span>} hint="selisih atau usianya di luar batas aman" />
            <Stat label="Kalibrasi masih baik" value={<span className="text-emerald-600">{data.length - needs}</span>} />
          </div>

          <CalibrationForm unitIds={unitIds} />

          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Kalibrasi terakhir</th>
                  <th className="px-4 py-3 font-medium">
                    Selisih timbangan
                    <InfoTip text="Selisih hasil timbangan dari nilai yang sebenarnya. Lebih dari 5 persen dianggap perlu dikalibrasi." />
                  </th>
                  <th className="px-4 py-3 font-medium">Usia</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((r) => {
                  const offsetHigh = Math.abs(r.scaleStudyOffsetPct) > 5;
                  const ageHigh = r.ageDays > 90;
                  return (
                    <tr key={r.unitId} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-800">{r.unitId}</td>
                      <td className="px-4 py-3 text-slate-500">{r.lastCalibrationDate}</td>
                      <td className={`px-4 py-3 ${offsetHigh ? "font-medium text-red-600" : "text-slate-600"}`}>
                        {formatNumber(r.scaleStudyOffsetPct)} %
                      </td>
                      <td className={`px-4 py-3 ${ageHigh ? "font-medium text-red-600" : "text-slate-600"}`}>
                        {formatNumber(r.ageDays)} hari
                      </td>
                      <td className="px-4 py-3">
                        {r.needsCalibration ? (
                          <Badge tone="red">Perlu kalibrasi</Badge>
                        ) : (
                          <Badge tone="green">Baik</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}

function CalibrationForm({ unitIds }: { unitIds: string[] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [unitId, setUnitId] = useState("");
  const [date, setDate] = useState(today);
  const [offset, setOffset] = useState("0");
  const add = useAddCalibration();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitId) return;
    add.mutate(
      { unitId, lastCalibrationDate: date, scaleStudyOffsetPct: Number(offset) },
      {
        onSuccess: () => {
          setOffset("0");
          setDate(today);
        },
      },
    );
  };

  return (
    <Card className="mb-5">
      <h2 className="mb-1 font-semibold text-slate-800">
        Catat kalibrasi baru
        <InfoTip text="Catat kalibrasi ulang timbangan HD785. Pilih unit, tanggal kalibrasi, dan selisih timbangannya. Statusnya langsung dihitung ulang." />
      </h2>
      <p className="mb-3 text-xs text-slate-400">Hanya untuk unit HD785. Data dimasukkan manual, bukan dari timbangan langsung.</p>
      <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Unit (HD785)</span>
          <select
            value={unitId}
            onChange={(e) => setUnitId(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            required
          >
            <option value="">Pilih unit…</option>
            {unitIds.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Tanggal kalibrasi</span>
          <input
            type="date"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            required
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-500">Selisih timbangan (%)</span>
          <input
            type="number"
            step="0.1"
            value={offset}
            onChange={(e) => setOffset(e.target.value)}
            className="w-28 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            required
          />
        </label>
        <button
          type="submit"
          disabled={add.isPending || !unitId}
          className="rounded-md bg-kpp-green px-4 py-2 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
        >
          {add.isPending ? "Menyimpan…" : "Simpan kalibrasi"}
        </button>
        {add.isError && <span className="text-sm text-red-600">{(add.error as Error).message}</span>}
        {add.isSuccess && <span className="text-sm text-emerald-600">Tersimpan ✓</span>}
      </form>
    </Card>
  );
}
