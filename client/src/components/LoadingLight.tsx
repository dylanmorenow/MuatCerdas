// Indikator pemuatan besar HIJAU/KUNING/MERAH (§12.5) untuk Loading Guidance.
import type { LoadingStatus } from "@muatcerdas/shared";
import { cx } from "./ui";

const META: Record<LoadingStatus, { ring: string; dot: string; label: string; sub: string }> = {
  green: {
    ring: "border-emerald-300 bg-emerald-50",
    dot: "bg-emerald-500",
    label: "HIJAU",
    sub: "Masih di bawah target — lanjut muat",
  },
  amber: {
    ring: "border-amber-300 bg-amber-50",
    dot: "bg-amber-400",
    label: "KUNING",
    sub: "Dalam band target (95–110%) — bersiap stop",
  },
  red: {
    ring: "border-red-300 bg-red-50",
    dot: "bg-red-500",
    label: "MERAH — STOP",
    sub: "Overload (>110% target)",
  },
};

export function LoadingLight({ status }: { status: LoadingStatus }) {
  const m = META[status];
  return (
    <div className={cx("flex items-center gap-4 rounded-xl border-2 p-5", m.ring)}>
      <span className={cx("h-12 w-12 flex-shrink-0 rounded-full", m.dot)} />
      <div>
        <div className="text-xl font-bold text-slate-800">{m.label}</div>
        <div className="text-sm text-slate-600">{m.sub}</div>
      </div>
    </div>
  );
}
