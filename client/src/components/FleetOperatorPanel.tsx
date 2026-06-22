// Revisi item 4 — kelola jumlah armada per jenis unit + tambah operator untuk unit baru.
import { useState } from "react";
import { formatNumber } from "@muatcerdas/shared";
import { useOpsParams, useSaveOpsParams, useOperators, useAddOperator } from "../api/fleet";
import { useSpeed } from "../api/speed";
import { useInventory } from "../api/data";
import { Card, Stat, Badge } from "../components/ui";

export function FleetOperatorPanel() {
  const { data: ops } = useOpsParams();
  const saveOps = useSaveOpsParams();
  const { data: speed } = useSpeed();
  const { data: operators } = useOperators();
  const { data: inv } = useInventory();
  const addOp = useAddOperator();

  const [hd785, setHd785] = useState<string>("");
  const [opName, setOpName] = useState("");
  const [opShift, setOpShift] = useState("day");
  const [opUnit, setOpUnit] = useState("");

  const hd785Value = hd785 !== "" ? hd785 : String(ops?.hd785UnitCount ?? "");
  const saveHd785 = () => {
    if (!ops) return;
    const n = Math.round(Number(hd785Value));
    if (!Number.isFinite(n) || n <= 0) return;
    saveOps.mutate({ ...ops, hd785UnitCount: n });
    setHd785("");
  };

  const submitOp = (e: React.FormEvent) => {
    e.preventDefault();
    const name = opName.trim();
    if (!name) return;
    addOp.mutate(
      { name, shift: opShift, unitId: opUnit || null },
      {
        onSuccess: () => {
          setOpName("");
          setOpUnit("");
        },
      },
    );
  };

  return (
    <div className="mt-6">
      <h2 className="mb-3 font-semibold text-slate-800">Armada &amp; operator</h2>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Jumlah armada per jenis unit */}
        <Card>
          <h3 className="mb-3 font-semibold text-slate-800">Jumlah armada</h3>
          <div className="mb-4 grid grid-cols-2 gap-3">
            <Stat label="Unit hauling" value={formatNumber(speed?.params.haulUnitCount ?? 0)} hint="ubah di layar Kecepatan Aman" />
            <Stat label="Kapasitas per unit hauling" value={`${formatNumber(speed?.params.haulPayloadCapacityTon ?? 0)} t`} hint="2 trailer" />
          </div>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-500">Jumlah unit HD785</span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={hd785Value}
                onChange={(e) => setHd785(e.target.value)}
                className="w-32 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              />
              <button
                onClick={saveHd785}
                disabled={saveOps.isPending}
                className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
              >
                Simpan
              </button>
              {saveOps.isSuccess && <span className="text-xs text-emerald-600">Tersimpan ✓</span>}
            </div>
          </label>
        </Card>

        {/* Operator untuk unit baru */}
        <Card>
          <h3 className="mb-1 font-semibold text-slate-800">Operator</h3>
          <p className="mb-3 text-xs text-slate-400">Tambah nama operator, shift, dan unit kendaraan yang dipegang.</p>
          <form onSubmit={submitOp} className="mb-3 flex flex-wrap items-end gap-2">
            <input
              type="text"
              value={opName}
              onChange={(e) => setOpName(e.target.value)}
              placeholder="Nama operator"
              className="min-w-[140px] flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <label className="block">
              <span className="mb-0.5 block text-[10px] text-slate-400">Unit dipegang</span>
              <select
                value={opUnit}
                onChange={(e) => setOpUnit(e.target.value)}
                className="rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              >
                <option value="">Tanpa unit</option>
                {inv?.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.id} · {u.model}
                  </option>
                ))}
              </select>
            </label>
            <select value={opShift} onChange={(e) => setOpShift(e.target.value)} className="rounded-md border border-slate-300 px-2 py-1.5 text-sm">
              <option value="day">Shift siang</option>
              <option value="night">Shift malam</option>
            </select>
            <button
              type="submit"
              disabled={addOp.isPending || !opName.trim()}
              className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
            >
              Tambah
            </button>
          </form>
          {addOp.isError && <p className="mb-2 text-xs text-red-600">{(addOp.error as Error).message}</p>}
          <div className="max-h-48 overflow-y-auto">
            <div className="flex flex-wrap gap-1.5">
              {operators?.map((o) => (
                <Badge key={o.id} tone={o.shift === "night" ? "slate" : "blue"}>
                  {o.name} ({o.shift === "night" ? "malam" : "siang"}){o.unitId ? ` · ${o.unitId}` : ""}
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
