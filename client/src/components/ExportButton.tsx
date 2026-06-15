import { downloadCsv } from "../lib/export";

/** Tombol ekspor CSV untuk sebuah tabel. */
export function ExportButton({
  filename,
  headers,
  rows,
  label = "Ekspor CSV",
}: {
  filename: string;
  headers: string[];
  rows: (string | number)[][];
  label?: string;
}) {
  return (
    <button
      onClick={() => downloadCsv(filename, headers, rows)}
      disabled={rows.length === 0}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
    >
      {label}
    </button>
  );
}
