import { useRef, useState } from "react";
import { formatNumber, formatTon } from "@muatcerdas/shared";
import { useInventory, useImport } from "../api/data";
import { downloadCsv } from "../lib/export";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";
import { FleetOperatorPanel } from "../components/FleetOperatorPanel";

interface EntityDef {
  key: string;
  label: string;
  headers: string[];
}

const ENTITIES: EntityDef[] = [
  { key: "units", label: "Unit (truk dan HD785)", headers: ["id", "category", "model", "tareKg", "ratedPayloadKg", "tiresCount", "tireModel", "tirePriceIdr", "kmPerYear"] },
  { key: "operators", label: "Operator", headers: ["id", "name", "shift"] },
  { key: "segments", label: "Ruas jalan", headers: ["id", "name", "surface", "lengthKm", "conditionScore", "avgSpeedLoadedKmh", "avgSpeedEmptyKmh"] },
  { key: "tires", label: "Ban (truk hauling)", headers: ["id", "unitId", "position", "installDate", "removalDate", "kmAtRemoval", "avgPressureDeviationPct", "loadIndex", "removalReason", "costIdr"] },
  { key: "payload", label: "Muatan (HD785)", headers: ["id", "unitId", "operatorId", "timestamp", "measuredPayloadKg", "targetPayloadKg"] },
  { key: "calibration", label: "Kalibrasi (HD785)", headers: ["id", "unitId", "lastCalibrationDate", "scaleStudyOffsetPct"] },
];

export function DataImport() {
  const inv = useInventory();
  const imp = useImport();
  const [entity, setEntity] = useState("units");
  const [fileName, setFileName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const current = ENTITIES.find((e) => e.key === entity) ?? ENTITIES[0]!;

  const onUpload = () => {
    const f = fileRef.current?.files?.[0];
    if (f) imp.mutate({ entity, file: f });
  };

  return (
    <>
      <PageHeader
        title="Data dan Impor"
        subtitle="Unggah file CSV atau Excel untuk memperbarui data. Baris dengan id yang sama akan ditimpa. Ban hanya untuk truk hauling, muatan hanya untuk HD785."
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Impor */}
        <Card>
          <h2 className="mb-3 font-semibold text-slate-800">
            Impor file
            <InfoTip text="Tiap baris diperiksa satu per satu. Baris yang rusak dilaporkan, baris yang benar tetap disimpan. Unit yang salah jenis akan ditolak." />
          </h2>

          <label className="mb-1 block text-xs text-slate-500">Jenis data</label>
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              imp.reset();
            }}
            className="mb-3 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          >
            {ENTITIES.map((e) => (
              <option key={e.key} value={e.key}>
                {e.label}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <label className="flex-1 cursor-pointer rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
                className="hidden"
              />
              {fileName || "Pilih file .csv atau .xlsx"}
            </label>
            <button
              onClick={onUpload}
              disabled={!fileName || imp.isPending}
              className="rounded-md bg-kpp-green px-3 py-2 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-40"
            >
              {imp.isPending ? "Mengimpor…" : "Impor"}
            </button>
          </div>

          <button
            onClick={() => downloadCsv(`template-${current.key}.csv`, current.headers, [])}
            className="mt-2 text-xs text-kpp-blue hover:underline"
          >
            Unduh template CSV ({current.label})
          </button>

          {imp.error && <div className="mt-3"><ErrorState message={(imp.error as Error).message} /></div>}

          {imp.data && (
            <div className="mt-4 rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge tone="green">{formatNumber(imp.data.inserted)} tersimpan</Badge>
                {imp.data.skipped > 0 && <Badge tone="red">{formatNumber(imp.data.skipped)} ditolak</Badge>}
                <span className="text-slate-400">dari {formatNumber(imp.data.totalRows)} baris</span>
              </div>
              {imp.data.errors.length > 0 && (
                <div className="mt-2 max-h-48 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-slate-400">
                      <tr>
                        <th className="py-1 pr-2 font-medium">Baris</th>
                        <th className="py-1 font-medium">Masalah</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imp.data.errors.map((e, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="py-1 pr-2 font-medium text-red-600">{e.row}</td>
                          <td className="py-1 text-slate-600">{e.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Petunjuk */}
        <Card>
          <h2 className="mb-3 font-semibold text-slate-800">Kolom dan contoh</h2>
          <p className="mb-2 text-sm text-slate-600">
            Kolom untuk <span className="font-medium">{current.label}</span>
          </p>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {current.headers.map((h) => (
              <span key={h} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                {h}
              </span>
            ))}
          </div>
          <ul className="list-disc space-y-1 pl-5 text-xs text-slate-500">
            <li>Contoh file siap pakai ada di <span className="font-mono">server/sample-data/*.csv</span>.</li>
            <li>Mengimpor ulang dengan <span className="font-mono">id</span> yang sama akan menimpa data lama.</li>
            <li>Status muatan dan status kalibrasi dihitung otomatis dari data.</li>
            <li>Impor ban menolak unit HD785. Impor muatan menolak unit truk hauling.</li>
          </ul>
        </Card>
      </div>

      {/* Inventory */}
      <FleetOperatorPanel />

      <h2 className="mb-3 mt-6 font-semibold text-slate-800">Data saat ini</h2>
      {inv.isLoading && <Loading />}
      {inv.error && <ErrorState message={(inv.error as Error).message} onRetry={() => void inv.refetch()} />}
      {inv.data && (
        <>
          <div className="mb-4 grid grid-cols-3 gap-4">
            <Stat label="Unit" value={formatNumber(inv.data.counts.units)} />
            <Stat label="Operator" value={formatNumber(inv.data.counts.operators)} />
            <Stat label="Ruas jalan" value={formatNumber(inv.data.counts.segments)} />
          </div>

          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-200 px-5 py-3">
              <h3 className="text-sm font-semibold text-slate-700">Unit ({inv.data.units.length})</h3>
            </div>
            <div className="max-h-80 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">ID</th>
                    <th className="px-4 py-2 font-medium">Kategori</th>
                    <th className="px-4 py-2 font-medium">Model</th>
                    <th className="px-4 py-2 font-medium">Kapasitas muatan</th>
                    <th className="px-4 py-2 font-medium">Ban</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inv.data.units.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="px-4 py-1.5 font-medium text-slate-700">{u.id}</td>
                      <td className="px-4 py-1.5">
                        <Badge tone={u.category === "haul_truck" ? "blue" : "slate"}>
                          {u.category === "haul_truck" ? "Truk hauling" : "HD785"}
                        </Badge>
                      </td>
                      <td className="px-4 py-1.5 text-slate-600">{u.model}</td>
                      <td className="px-4 py-1.5 text-slate-500">{formatTon(u.ratedPayloadKg)}</td>
                      <td className="px-4 py-1.5 text-slate-500">{u.tiresCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </>
  );
}
