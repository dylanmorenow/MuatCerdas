import { Link } from "react-router-dom";
import { formatRupiah, formatNumber } from "@muatcerdas/shared";
import { useTireRecommendations } from "../api/tires";
import { PageHeader, Card, Stat, Loading, ErrorState, InfoTip } from "../components/ui";
import { ExportButton } from "../components/ExportButton";

export function TireRecommendations() {
  const { data, isLoading, error, refetch } = useTireRecommendations();
  const totalLoss = data?.reduce((s, r) => s + r.estimatedSavingsIdr, 0) ?? 0;

  return (
    <>
      <PageHeader
        title="Tire — Rekomendasi"
        subtitle="Tindakan prioritas per unit untuk memperpanjang umur ban, beserta estimasi kerugian bila tindakan tidak dilakukan."
        actions={
          data ? (
            <ExportButton
              filename="tire-rekomendasi.csv"
              headers={["unit", "model", "tindakan", "faktor", "alasan", "estimasiKerugianIdr"]}
              rows={data.map((r) => [r.unitId, r.model, r.action, r.factor, r.reason, r.estimatedSavingsIdr])}
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
              label="Estimasi kerugian/th bila diabaikan"
              value={<span className="text-red-600">{formatRupiah(totalLoss)}</span>}
              hint={<>biaya berulang bila tak ditangani<InfoTip text="Porsi shortfall umur ban tiap faktor × biaya ban terhindarkan per unit × capture rate (§12.7) — yaitu biaya yang terus ditanggung bila tindakan tidak dilakukan. Asumsi editable di Finansial." /></>}
            />
            <Stat label="Unit terdampak" value={formatNumber(new Set(data.map((r) => r.unitId)).size)} />
          </div>

          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Tindakan</th>
                  <th className="px-4 py-3 font-medium">Faktor</th>
                  <th className="px-4 py-3 font-medium">Alasan</th>
                  <th className="px-4 py-3 text-right font-medium">Estimasi kerugian/th bila diabaikan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((r, i) => (
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
                      {r.estimatedSavingsIdr > 0 ? formatRupiah(r.estimatedSavingsIdr) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  );
}
