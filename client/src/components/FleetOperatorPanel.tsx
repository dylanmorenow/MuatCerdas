// Kelola operator (nama + shift + unit yang dipegang). Bagian "jumlah armada" dihapus (Revisi #4);
// jumlah unit hauling & HD785 dikelola di layar Kecepatan Aman (Target produksi & armada).
import { useState } from "react";
import { useOperators, useAddOperator } from "../api/fleet";
import { useInventory } from "../api/data";
import { Card, Badge } from "../components/ui";

export function FleetOperatorPanel() {
  const { data: operators } = useOperators();
  const { data: inv } = useInventory();
  const addOp = useAddOperator();

  const [opName, setOpName] = useState("");
  const [opShift, setOpShift] = useState("day");
  const [opUnit, setOpUnit] = useState("");

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
      <h2 className="mb-3 font-semibold text-slate-800">Operator</h2>
      <Card>
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
  );
}
