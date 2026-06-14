// Komponen UI kecil yang dipakai ulang. Angka SELALU lewat shared/format (NFR-0002-3/8).
import type { ReactNode } from "react";
import { formatNumber } from "@muatcerdas/shared";
import type { TireStatus } from "../api/tires";

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cx("rounded-xl border border-slate-200 bg-white p-5 shadow-sm", className)}>
      {children}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <div className="rounded-lg bg-slate-50 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-semibold text-slate-800">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-slate-500">{hint}</div>}
    </div>
  );
}

const STATUS_META: Record<TireStatus, { label: string; cls: string; dot: string }> = {
  ok: { label: "Sehat", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-500" },
  warn: { label: "Pantau", cls: "bg-amber-50 text-amber-700 ring-amber-600/20", dot: "bg-amber-500" },
  critical: { label: "Kritis", cls: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-500" },
};

export function StatusBadge({ status }: { status: TireStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", m.cls)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </span>
  );
}

export type Tone = "green" | "amber" | "red" | "slate" | "blue";

const TONE_CLS: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  slate: "bg-slate-100 text-slate-600 ring-slate-500/20",
  blue: "bg-blue-50 text-kpp-blue ring-blue-600/20",
};

/** Badge generik berbasis tone (dipakai status payload under/ok/over & kalibrasi). */
export function Badge({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", TONE_CLS[tone])}>
      {children}
    </span>
  );
}

/** Sisa umur km: nilai negatif = ban sudah terlewati jatuh tempo. */
export function formatRemainingKm(km: number): string {
  if (km < 0) return `Terlewati ${formatNumber(Math.abs(km))} km`;
  return `${formatNumber(km)} km`;
}

export function InfoTip({ text }: { text: string }) {
  return (
    <span
      title={text}
      className="ml-1 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600"
      aria-label={text}
    >
      ?
    </span>
  );
}

export function Loading({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
      <span className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-kpp-green" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card className="border-red-200 bg-red-50">
      <div className="text-sm font-medium text-red-700">Gagal memuat data</div>
      <div className="mt-1 text-sm text-red-600">{message}</div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Coba lagi
        </button>
      )}
    </Card>
  );
}

export function ComingSoon({ title, note }: { title: string; note?: string }) {
  return (
    <>
      <PageHeader title={title} />
      <Card>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="font-medium text-slate-700">Segera hadir</span>
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {note ?? "Layar ini dibangun pada milestone berikutnya sesuai rencana implementasi."}
        </p>
      </Card>
    </>
  );
}
