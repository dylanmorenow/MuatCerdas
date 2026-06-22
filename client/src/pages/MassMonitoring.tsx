// Pemantauan Muatan (surveyor) — laporan massa real-time per HD785 (massa + material coal/OB +
// nama operator excavator) dari input operator.
import { formatNumber, formatTon, materialLabel, classifyPayload, type PayloadStatus } from "@muatcerdas/shared";
import { useMassMonitoring, useOperatorData, type MassInputRow } from "../api/mass";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";

const TARGET_KG = 91_000;
// Status muatan = acuan data analitik (classifyPayload): <85% underload · 85–100% pas · >100% overload.
const STATUS_TONE: Record<PayloadStatus, { tone: "amber" | "green" | "red"; label: string }> = {
  under: { tone: "amber", label: "underload" },
  ok: { tone: "green", label: "pas" },
  over: { tone: "red", label: "overload" },
};

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} mnt lalu`;
  const h = Math.floor(mins / 60);
  return `${h} jam ${mins % 60} mnt lalu`;
}

export function MassMonitoring() {
  const { data, isLoading, error, refetch } = useMassMonitoring();
  const { data: opData } = useOperatorData();

  return (
    <>
      <PageHeader
        title="Pemantauan Muatan"
        subtitle="Laporan langsung massa muatan tiap HD785 dari operator. Menampilkan berapa ton, jenis materialnya, dan operator excavator yang memuat, beserta panduan pemuatan. Memakai data contoh, bukan timbangan langsung."
      />

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Batubara hari ini" value={`${formatNumber(data.todayCoalT)} t`} hint="dari laporan operator" />
            <Stat label="Overburden hari ini" value={`${formatNumber(data.todayOverburdenT)} t`} />
            <Stat label="Laporan hari ini" value={formatNumber(data.reportsToday)} hint="catatan massa" />
            <Stat label="HD785 sudah melapor" value={formatNumber(data.hd785.length)} hint="jumlah unit" />
          </div>

          {/* Tabel real-time per HD785 */}
          <Card className="overflow-hidden p-0">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="font-semibold text-slate-800">
                Muatan terbaru tiap HD785
                <InfoTip text="Muatan terakhir yang dilaporkan tiap HD785, status sama dengan acuan analitik: kuning underload (<85% target), hijau pas (85–100%), merah overload (>100%). Data diperbarui otomatis tiap 15 detik." />
              </h2>
              <span className="text-xs text-slate-400">target 91 t</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Unit</th>
                    <th className="px-4 py-2.5 font-medium">Material</th>
                    <th className="px-4 py-2.5 font-medium">Massa terakhir</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Operator excavator</th>
                    <th className="px-4 py-2.5 font-medium">Pelapor</th>
                    <th className="px-4 py-2.5 font-medium">Waktu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.hd785.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                        Belum ada laporan. Operator HD785 mengirimnya dari halaman driver.
                      </td>
                    </tr>
                  )}
                  {data.hd785.map((r) => {
                    const st = STATUS_TONE[classifyPayload(r.totalT * 1000, TARGET_KG)];
                    return (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 font-medium text-slate-700">{r.unitId}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={r.material === "coal" ? "blue" : "slate"}>{materialLabel(r.material as "coal" | "overburden" | null)}</Badge>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{formatTon(r.totalT * 1000)}</td>
                        <td className="px-4 py-2.5">
                          <Badge tone={st.tone}>{st.label}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{r.excavatorOperator ?? "-"}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.operatorName}</td>
                        <td className="px-4 py-2.5 text-xs text-slate-400">{timeAgo(r.timestamp)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Data operator per jenis — section massa HD785 dihapus (redundan dgn tabel real-time di atas) */}
          {opData && opData.groups.filter((g) => g.key !== "hd785-mass").length > 0 && (
            <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
              {opData.groups
                .filter((g) => g.key !== "hd785-mass")
                .map((g) => (
                  <Card key={g.key} className="overflow-hidden p-0">
                    <div className="border-b border-slate-200 px-5 py-3">
                      <h2 className="font-semibold text-slate-800">{g.label}</h2>
                      <p className="text-xs text-slate-400">{g.rows.length} laporan</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <tbody className="divide-y divide-slate-100">
                          {g.rows.slice(0, 20).map((r) => (
                            <OperatorRow key={r.id} r={r} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function OperatorRow({ r }: { r: MassInputRow }) {
  const buckets = r.bucket1T != null || r.bucket2T != null;
  return (
    <tr className="hover:bg-slate-50">
      <td className="px-4 py-2 font-medium text-slate-700">{r.unitId}</td>
      <td className="px-4 py-2 text-slate-600">{materialLabel(r.material as "coal" | "overburden" | null)}</td>
      <td className="px-4 py-2 text-slate-800">
        {formatTon(r.totalT * 1000)}
        {buckets && (
          <span className="ml-1 text-xs text-slate-400">
            ({formatNumber(r.bucket1T ?? 0, 1)} + {formatNumber(r.bucket2T ?? 0, 1)})
          </span>
        )}
      </td>
      <td className="px-4 py-2 text-slate-500">{r.excavatorOperator ?? r.operatorName}</td>
    </tr>
  );
}

