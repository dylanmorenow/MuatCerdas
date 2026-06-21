// Item 4 — kalender target/kuota produksi batubara harian. Admin menyetel target tiap hari
// untuk beberapa hari ke depan. Hari tanpa setelan memakai target default (OpsParams).
import { useState } from "react";
import { formatNumber } from "@muatcerdas/shared";
import { useCoalTargets, useSaveCoalTarget, localDateKey } from "../api/finance";
import { useOpsParams } from "../api/fleet";
import { Card } from "../components/ui";

const DAYS_AHEAD = 14;
const DOW = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MON = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export function CoalTargetCalendar() {
  const { data: targets } = useCoalTargets();
  const { data: ops } = useOpsParams();
  const save = useSaveCoalTarget();

  const defaultTarget = ops?.dailyCoalTargetT ?? 0;
  const byDate = new Map((targets ?? []).map((t) => [t.date, t.targetT]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: DAYS_AHEAD }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const todayKey = localDateKey(today);
  const [selected, setSelected] = useState<string>(todayKey);
  const [value, setValue] = useState<string>("");

  const selectDay = (key: string) => {
    setSelected(key);
    setValue(byDate.has(key) ? String(byDate.get(key)) : "");
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = Number(value);
    if (!Number.isFinite(t) || t < 0) return;
    save.mutate({ date: selected, targetT: t });
  };
  const clearDay = () => {
    save.mutate({ date: selected, targetT: 0 }, { onSuccess: () => setValue("") });
  };

  const fmtShort = (d: Date) => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]}`;
  const selectedDate = days.find((d) => localDateKey(d) === selected) ?? today;

  return (
    <Card className="mb-5">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Kalender target produksi batubara</h2>
        <span className="text-xs text-slate-400">Default {formatNumber(defaultTarget)} t/hari</span>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Setel target tiap hari untuk beberapa hari ke depan. Hari tanpa setelan memakai target default. Target hari
        ini dipakai pada kartu kuota di atas.
      </p>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {days.map((d) => {
          const key = localDateKey(d);
          const custom = byDate.get(key);
          const isSel = key === selected;
          const isToday = key === todayKey;
          return (
            <button
              key={key}
              onClick={() => selectDay(key)}
              className={`min-w-[78px] shrink-0 rounded-lg border px-2 py-2 text-left transition ${
                isSel ? "border-kpp-green bg-emerald-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-1 text-[11px] text-slate-500">
                {fmtShort(d)}
                {isToday && <span className="rounded bg-kpp-blue px-1 text-[9px] font-medium text-white">ini</span>}
              </div>
              <div className={`mt-1 text-sm font-bold ${custom != null ? "text-slate-800" : "text-slate-400"}`}>
                {formatNumber(custom ?? defaultTarget)} t
              </div>
              <div className="text-[9px] text-slate-400">{custom != null ? "disetel" : "default"}</div>
            </button>
          );
        })}
      </div>

      <form onSubmit={submit} className="mt-3 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-slate-500">Target untuk {fmtShort(selectedDate)} (ton)</span>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={`${formatNumber(defaultTarget)} (default)`}
            className="w-44 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={save.isPending || value === ""}
          className="rounded-md bg-kpp-green px-3 py-1.5 text-sm font-medium text-white hover:bg-kpp-green/90 disabled:opacity-50"
        >
          Simpan
        </button>
        {byDate.has(selected) && (
          <button
            type="button"
            onClick={clearDay}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
          >
            Pakai default
          </button>
        )}
        {save.isSuccess && <span className="text-xs text-emerald-600">Tersimpan ✓</span>}
        {save.isError && <span className="text-xs text-red-600">{(save.error as Error).message}</span>}
      </form>
    </Card>
  );
}
