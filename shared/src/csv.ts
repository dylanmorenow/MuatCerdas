// Util CSV murni (dipakai ekspor laporan client). Escape RFC-4180.

function escapeCell(v: string | number): string {
  const s = String(v);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Bangun teks CSV dari header + baris. */
export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const head = headers.map(escapeCell).join(",");
  const body = rows.map((r) => r.map(escapeCell).join(",")).join("\n");
  return body ? `${head}\n${body}` : head;
}
