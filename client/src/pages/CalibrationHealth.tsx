import { formatNumber } from "@muatcerdas/shared";
import { useCalibration } from "../api/payload";
import { PageHeader, Card, Stat, Badge, Loading, ErrorState, InfoTip } from "../components/ui";
import { ExportButton } from "../components/ExportButton";

export function CalibrationHealth() {
  const { data, isLoading, error, refetch } = useCalibration();
  const needs = data?.filter((r) => r.needsCalibration).length ?? 0;

  return (
    <>
      <PageHeader
        title="Calibration Health"
        subtitle="Status drift kalibrasi Payload Meter (PLM) HD785 — perlu kalibrasi bila |offset| > 5% atau usia > 90 hari."
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
            <Stat label="Perlu kalibrasi" value={<span className="text-red-600">{needs}</span>} hint="offset/usia di luar ambang" />
            <Stat label="Terkalibrasi baik" value={<span className="text-emerald-600">{data.length - needs}</span>} />
          </div>

          <Card className="overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Kalibrasi terakhir</th>
                  <th className="px-4 py-3 font-medium">
                    Offset skala
                    <InfoTip text="Selisih sistematis timbangan dari studi (scale study). Ambang |offset| > 5%." />
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
