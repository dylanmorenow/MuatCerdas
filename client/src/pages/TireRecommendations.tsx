import { Link } from "react-router-dom";
import { formatRupiah, formatNumber } from "@muatcerdas/shared";
import { useTireRecommendations, type TireRecommendation } from "../api/tires";
import { PageHeader, Card, Stat, GradeBadge, Loading, ErrorState, InfoTip } from "../components/ui";
import { ExportButton } from "../components/ExportButton";

const GRADES: ("A" | "B" | "C")[] = ["A", "B", "C"];

export function TireRecommendations() {
  const { data, isLoading, error, refetch } = useTireRecommendations();
  const totalLoss = data?.reduce((s, r) => s + r.estimatedSavingsIdr, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Rekomendasi Ban"
        subtitle="Tindakan yang disarankan untuk tiap unit supaya ban lebih awet, dipisah menurut tingkat risiko (Grade A, B, C), beserta perkiraan kerugian kalau tidak ditangani."
        actions={
          data ? (
            <ExportButton
              filename="tire-rekomendasi.csv"
              headers={["unit", "model", "grade", "tindakan", "faktor", "alasan", "estimasiKerugianIdr"]}
              rows={data.map((r) => [r.unitId, r.model, r.grade, r.action, r.factor, r.reason, r.estimatedSavingsIdr])}
            />
          ) : undefined
        }
      />

      {isLoading && <Loading />}
      {error && <ErrorState message={(error as Error).message} onRetry={() => void refetch()} />}

      {data && (
        <>
          <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Stat label="Total tindakan" value={formatNumber(data.length)} />
            <Stat
              label="Perkiraan kerugian per tahun bila dibiarkan"
              value={<span className="text-red-600">{formatRupiah(totalLoss)}</span>}
              hint={<>biaya yang terus muncul bila tidak ditangani<InfoTip text="Perkiraan biaya yang terus ditanggung tiap tahun kalau penyebab keausan ban tidak diperbaiki. Angkanya bisa diatur di halaman Finansial." /></>}
            />
            <Stat label="Unit terdampak" value={formatNumber(new Set(data.map((r) => r.unitId)).size)} />
          </div>

          <div className="space-y-5">
            {GRADES.map((g) => {
              const rows = data.filter((r) => r.grade === g);
              if (rows.length === 0) return null;
              return <GradeTable key={g} grade={g} rows={rows} />;
            })}
          </div>
        </>
      )}
    </>
  );
}

function GradeTable({ grade, rows }: { grade: "A" | "B" | "C"; rows: TireRecommendation[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-3">
        <GradeBadge grade={grade} />
        <span className="text-sm text-slate-500">{rows.length} tindakan</span>
      </div>
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Unit</th>
            <th className="px-4 py-3 font-medium">Tindakan</th>
            <th className="px-4 py-3 font-medium">Faktor</th>
            <th className="px-4 py-3 font-medium">Alasan</th>
            <th className="px-4 py-3 text-right font-medium">Perkiraan kerugian per tahun</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={`${r.unitId}-${i}`} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <Link to={`/tire/${r.unitId}`} className="font-medium text-kpp-blue hover:underline">
                  {r.unitId}
                </Link>
                <div className="text-xs text-slate-400">{r.model}</div>
              </td>
              <td className="px-4 py-3 font-medium text-slate-800">{r.action}</td>
              <td className="px-4 py-3">
                <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{r.factor}</span>
              </td>
              <td className="px-4 py-3 text-slate-500">{r.reason}</td>
              <td className="px-4 py-3 text-right font-medium text-slate-800">
                {r.estimatedSavingsIdr > 0 ? formatRupiah(r.estimatedSavingsIdr) : "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
