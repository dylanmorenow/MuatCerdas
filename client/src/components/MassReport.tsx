// Revisi F2 — komponen operator: input massa muatan + indikator antrean offline.
// HD785 (pit_dumper): massa + material (coal/OB) + nama operator excavator.
// Truk hauling: massa per 2 bucket (batubara). Semua → antrean store-and-forward (simulasi).
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { materialLabel } from "@muatcerdas/shared";
import { useOfflineQueue } from "../lib/useOfflineQueue";
import { useExcavatorOperators, useAddExcavatorOperator } from "../api/mass";
import { cx } from "./ui";

const EXCAVATOR_TYPES = ["PC2000", "PC1250", "PC850"];

/** Pil status koneksi tersimulasi + jumlah laporan tertahan + toggle. */
export function OfflineToggle() {
  const { offline, queued, setOffline, flush } = useOfflineQueue();
  return (
    <div className="flex items-center gap-2">
      {queued > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
          {queued} tertahan
        </span>
      )}
      <button
        onClick={() => void setOffline(!offline)}
        className={cx(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
          offline ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-700",
        )}
        title={offline ? "Sedang offline (simulasi). Klik untuk kembali online dan mengirim antrean." : "Sedang online. Klik untuk simulasi offline."}
      >
        <span className={cx("h-2 w-2 rounded-full", offline ? "bg-slate-400" : "bg-emerald-500")} />
        {offline ? "Offline (simulasi)" : "Online"}
      </button>
      {!offline && queued > 0 && (
        <button onClick={() => void flush()} className="rounded-md border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
          Kirim sekarang
        </button>
      )}
    </div>
  );
}

type Msg = { tone: "ok" | "err" | "queued"; text: string };

/** Form lapor massa muatan untuk operator unit yang login. */
export function MassReportForm({
  unitId,
  category,
  operatorName,
}: {
  unitId: string;
  category: string;
  operatorName: string;
}) {
  const isHd = category === "pit_dumper";
  const { offline, enqueue } = useOfflineQueue();
  const qc = useQueryClient();
  const { data: excOperators } = useExcavatorOperators();
  const addExc = useAddExcavatorOperator();

  const [material, setMaterial] = useState<"coal" | "overburden">("coal");
  const [totalT, setTotalT] = useState("");
  const [b1, setB1] = useState("");
  const [b2, setB2] = useState("");
  const [excId, setExcId] = useState("");
  const [showAddExc, setShowAddExc] = useState(false);
  const [newExcName, setNewExcName] = useState("");
  const [newExcType, setNewExcType] = useState(EXCAVATOR_TYPES[0]!);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);

  const selectedExc = excOperators?.find((o) => o.id === excId);
  const excLabel = selectedExc ? `${selectedExc.name} (${selectedExc.excavatorType})` : null;

  const addNewExcavatorOperator = () => {
    const name = newExcName.trim();
    if (!name) return;
    addExc.mutate(
      { name, excavatorType: newExcType },
      {
        onSuccess: (op) => {
          setExcId(op.id);
          setShowAddExc(false);
          setNewExcName("");
        },
      },
    );
  };

  const reset = () => {
    setTotalT("");
    setB1("");
    setB2("");
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const body: Record<string, unknown> = isHd
      ? { unitId, material, totalT: Number(totalT), excavatorOperator: excLabel, operatorName, source: "operator" }
      : { unitId, material: "coal", bucket1T: Number(b1), bucket2T: Number(b2), operatorName, source: "operator" };
    const r = await enqueue("/api/mass", body);
    setBusy(false);
    if (r.sent) {
      setMsg({ tone: "ok", text: "Laporan terkirim ✓" });
      reset();
      void qc.invalidateQueries({ queryKey: ["mass-monitoring"] });
      void qc.invalidateQueries({ queryKey: ["operator-data"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    } else if (r.error) {
      setMsg({ tone: "err", text: r.error });
    } else {
      setMsg({ tone: "queued", text: "Disimpan dulu. Akan terkirim otomatis saat kembali online." });
      reset();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">
          Lapor massa muatan {isHd ? "(HD785)" : "(truk hauling)"}
        </h2>
        <OfflineToggle />
      </div>

      <form onSubmit={submit} className="space-y-3">
        {isHd ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Material</span>
                <select
                  value={material}
                  onChange={(e) => setMaterial(e.target.value as "coal" | "overburden")}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                >
                  <option value="coal">{materialLabel("coal")}</option>
                  <option value="overburden">{materialLabel("overburden")}</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-slate-500">Massa dimuat (ton)</span>
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  value={totalT}
                  onChange={(e) => setTotalT(e.target.value)}
                  placeholder="contoh: 91"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                  required
                />
              </label>
            </div>
            <div>
              <span className="mb-1 block text-xs text-slate-500">Operator excavator pemuat</span>
              <div className="flex items-center gap-2">
                <select
                  value={excId}
                  onChange={(e) => setExcId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                >
                  <option value="">Pilih operator…</option>
                  {excOperators?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.excavatorType})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddExc((v) => !v)}
                  className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  {showAddExc ? "Tutup" : "Tambah baru"}
                </button>
              </div>
              {showAddExc && (
                <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
                  <input
                    type="text"
                    value={newExcName}
                    onChange={(e) => setNewExcName(e.target.value)}
                    placeholder="Nama operator baru"
                    className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <select
                    value={newExcType}
                    onChange={(e) => setNewExcType(e.target.value)}
                    className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                  >
                    {EXCAVATOR_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={addNewExcavatorOperator}
                    disabled={addExc.isPending || !newExcName.trim()}
                    className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
                  >
                    Simpan
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Bucket 1 (ton, batubara)</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={b1}
                onChange={(e) => setB1(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                required
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-slate-500">Bucket 2 (ton, batubara)</span>
              <input
                type="number"
                step="0.1"
                inputMode="decimal"
                value={b2}
                onChange={(e) => setB2(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base"
                required
              />
            </label>
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-kpp-green px-5 py-2.5 text-base font-semibold text-white hover:bg-kpp-green/90 disabled:opacity-50"
          >
            {busy ? "Mengirim…" : offline ? "Simpan (offline)" : "Laporkan"}
          </button>
          {msg && (
            <span
              className={cx(
                "text-sm font-medium",
                msg.tone === "ok" ? "text-emerald-600" : msg.tone === "queued" ? "text-amber-600" : "text-red-600",
              )}
            >
              {msg.text}
            </span>
          )}
        </div>
      </form>
      <p className="mt-2 text-[11px] text-slate-400">
        Data dikirim ke halaman Pemantauan Muatan milik surveyor. Mode offline hanya simulasi sinyal lemah, bukan deteksi jaringan asli.
      </p>
    </div>
  );
}
