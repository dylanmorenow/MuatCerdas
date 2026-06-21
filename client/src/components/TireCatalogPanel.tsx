// Item 5 — input tipe ban per unit + katalog tipe ban (keterangan untuk perkiraan umur ideal).
import { useState } from "react";
import { formatNumber } from "@muatcerdas/shared";
import {
  useTireCatalog,
  useSaveTireCatalog,
  useTireAssignments,
  useAssignUnitTire,
} from "../api/tires";
import { Card } from "../components/ui";

export function TireCatalogPanel() {
  const { data: catalog } = useTireCatalog();
  const { data: assignments } = useTireAssignments();
  const assign = useAssignUnitTire();
  const saveCatalog = useSaveTireCatalog();

  const models = catalog?.map((c) => c.tireModel) ?? [];

  // Form tambah/ubah tipe ban.
  const [form, setForm] = useState({ tireModel: "", idealLifeKm: "", catalogTkph: "", sizeSpec: "", loadRating: "" });
  const submitCatalog = (e: React.FormEvent) => {
    e.preventDefault();
    const tireModel = form.tireModel.trim();
    const idealLifeKm = Number(form.idealLifeKm);
    const catalogTkph = Number(form.catalogTkph);
    if (!tireModel || !Number.isFinite(idealLifeKm) || idealLifeKm <= 0 || !Number.isFinite(catalogTkph) || catalogTkph <= 0) return;
    saveCatalog.mutate(
      { tireModel, idealLifeKm, catalogTkph, sizeSpec: form.sizeSpec.trim() || null, loadRating: form.loadRating.trim() || null },
      { onSuccess: () => setForm({ tireModel: "", idealLifeKm: "", catalogTkph: "", sizeSpec: "", loadRating: "" }) },
    );
  };

  const editModel = (m: string) => {
    const row = catalog?.find((c) => c.tireModel === m);
    if (!row) return;
    setForm({
      tireModel: row.tireModel,
      idealLifeKm: String(row.idealLifeKm),
      catalogTkph: String(row.catalogTkph),
      sizeSpec: row.sizeSpec ?? "",
      loadRating: row.loadRating ?? "",
    });
  };

  return (
    <div className="mt-6">
      <h2 className="mb-1 font-semibold text-slate-800">Tipe ban per unit &amp; katalog umur ideal</h2>
      <p className="mb-3 text-xs text-slate-400">
        Pilih tipe ban tiap truk hauling. Umur ideal tiap tipe ban dipakai sebagai acuan perhitungan sisa umur (Modul A).
      </p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Assign tipe ban per unit */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 px-5 py-3">
            <h3 className="text-sm font-semibold text-slate-700">Tipe ban per unit ({assignments?.length ?? 0})</h3>
          </div>
          <div className="max-h-80 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-4 py-2 font-medium">Model truk</th>
                  <th className="px-4 py-2 font-medium">Tipe ban</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {assignments?.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-1.5 font-medium text-slate-700">{u.id}</td>
                    <td className="px-4 py-1.5 text-slate-500">{u.model}</td>
                    <td className="px-4 py-1.5">
                      <select
                        value={u.tireModel ?? ""}
                        onChange={(e) => assign.mutate({ unitId: u.id, tireModel: e.target.value })}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-xs"
                      >
                        <option value="" disabled>
                          pilih tipe ban
                        </option>
                        {models.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {assign.isError && <p className="px-4 py-2 text-xs text-red-600">{(assign.error as Error).message}</p>}
        </Card>

        {/* Katalog tipe ban + form */}
        <Card>
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Katalog tipe ban</h3>
          <div className="mb-3 max-h-48 overflow-auto rounded-lg border border-slate-100">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr>
                  <th className="px-2 py-1.5 font-medium">Tipe ban</th>
                  <th className="px-2 py-1.5 font-medium">Umur ideal</th>
                  <th className="px-2 py-1.5 font-medium">Ukuran</th>
                  <th className="px-2 py-1.5 font-medium">Dipakai</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalog?.map((c) => (
                  <tr key={c.tireModel}>
                    <td className="px-2 py-1.5 font-medium text-slate-700">{c.tireModel}</td>
                    <td className="px-2 py-1.5 text-slate-600">{formatNumber(c.idealLifeKm)} km</td>
                    <td className="px-2 py-1.5 text-slate-500">{c.sizeSpec ?? "-"}</td>
                    <td className="px-2 py-1.5 text-slate-500">{c.unitsUsing.length} unit</td>
                    <td className="px-2 py-1.5 text-right">
                      <button onClick={() => editModel(c.tireModel)} className="text-kpp-blue hover:underline">
                        ubah
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form onSubmit={submitCatalog} className="space-y-2">
            <p className="text-xs font-medium text-slate-600">Tambah / ubah tipe ban</p>
            <input
              type="text"
              value={form.tireModel}
              onChange={(e) => setForm((s) => ({ ...s, tireModel: e.target.value }))}
              placeholder="Nama tipe ban (mis. Michelin X Works Z)"
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-0.5 block text-[11px] text-slate-500">Umur ideal (km)</span>
                <input
                  type="number"
                  value={form.idealLifeKm}
                  onChange={(e) => setForm((s) => ({ ...s, idealLifeKm: e.target.value }))}
                  placeholder="120000"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[11px] text-slate-500">TKPH katalog</span>
                <input
                  type="number"
                  value={form.catalogTkph}
                  onChange={(e) => setForm((s) => ({ ...s, catalogTkph: e.target.value }))}
                  placeholder="360"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[11px] text-slate-500">Ukuran ban</span>
                <input
                  type="text"
                  value={form.sizeSpec}
                  onChange={(e) => setForm((s) => ({ ...s, sizeSpec: e.target.value }))}
                  placeholder="315/80R22.5"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-0.5 block text-[11px] text-slate-500">Rating beban</span>
                <input
                  type="text"
                  value={form.loadRating}
                  onChange={(e) => setForm((s) => ({ ...s, loadRating: e.target.value }))}
                  placeholder="156/150 L"
                  className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={saveCatalog.isPending}
              className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
            >
              Simpan tipe ban
            </button>
            {saveCatalog.isSuccess && <span className="ml-2 text-xs text-emerald-600">Tersimpan ✓</span>}
            {saveCatalog.isError && <p className="text-xs text-red-600">{(saveCatalog.error as Error).message}</p>}
          </form>
          <p className="mt-2 text-[11px] text-slate-400">
            Umur ideal, TKPH, ukuran, dan rating beban adalah keterangan untuk memperkirakan umur ban ideal. Nilai
            awal adalah asumsi; ganti dengan data brosur pabrik bila tersedia.
          </p>
        </Card>
      </div>
    </div>
  );
}
