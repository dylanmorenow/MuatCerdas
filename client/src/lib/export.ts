// Ekspor laporan: CSV (Blob) + PDF (pdfmake di-lazy-load saat dipakai).
import { toCsv, formatRupiah, formatNumber, formatPersen } from "@muatcerdas/shared";
import type { DashboardData } from "../api/finance";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Unduh CSV (BOM agar Excel ID benar). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const blob = new Blob(["﻿" + toCsv(headers, rows)], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Unduh laporan manajemen PDF (lazy pdfmake). */
export async function downloadReportPdf(d: DashboardData): Promise<void> {
  const pdfMake = ((await import("pdfmake/build/pdfmake")) as any).default;
  const vfsMod = (await import("pdfmake/build/vfs_fonts")) as any;
  pdfMake.vfs = vfsMod.default?.pdfMake?.vfs ?? vfsMod.default?.vfs ?? vfsMod.pdfMake?.vfs ?? vfsMod.vfs;

  const tanggal = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const kpi = (label: string, value: string) => [
    { text: label, color: "#475569" },
    { text: value, alignment: "right", bold: true },
  ];

  const doc = {
    pageMargins: [40, 50, 40, 40],
    content: [
      { text: "MuatCerdas — Laporan Manajemen", style: "h1" },
      { text: `Tire & Payload Intelligence — KPP Mining · ${tanggal}`, style: "sub", margin: [0, 0, 0, 14] },

      { text: "Ringkasan Finansial (asumsi tersimpan)", style: "h2" },
      {
        table: {
          widths: ["*", "auto"],
          body: [
            kpi("Biaya ban terhindarkan / tahun", formatRupiah(d.finance.fleetCaptured)),
            kpi("Biaya payload terhindarkan / tahun", formatRupiah(d.finance.payloadAvoidable)),
            kpi("Total penghematan / tahun", formatRupiah(d.finance.annualSavings)),
            kpi("Payback", Number.isFinite(d.finance.paybackMonths) ? `${formatNumber(d.finance.paybackMonths, 1)} bulan` : "—"),
            kpi("ROI tahun-1", formatPersen(d.finance.roiYear1)),
            kpi("CapEx / OpEx", `${formatRupiah(d.capexIdr)} / ${formatRupiah(d.opexAnnualIdr)}`),
          ],
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 14],
      },

      { text: "Modul A — Ban (truk hauling)", style: "h2" },
      {
        ul: [
          `${d.tire.totalUnits} unit · Kritis ${d.tire.critical} · Pantau ${d.tire.warn} · Sehat ${d.tire.ok}`,
          `Rata-rata prediksi umur ban: ${formatNumber(d.tire.avgPredictedLifeKm)} km`,
        ],
        margin: [0, 0, 0, 12],
      },

      { text: "Modul B — Payload (HD785)", style: "h2" },
      {
        ul: [
          `${formatNumber(d.payload.count)} event · Under ${formatPersen(d.payload.underPct)} · OK ${formatPersen(d.payload.okPct)} · Over ${formatPersen(d.payload.overPct)}`,
          `Rata-rata payload: ${formatNumber(d.payload.meanKg)} kg (target 91.000 kg)`,
          `Kalibrasi: ${d.calibration.needs} dari ${d.calibration.total} HD785 perlu kalibrasi`,
        ],
        margin: [0, 0, 0, 12],
      },

      {
        text: "Catatan: angka memakai asumsi (editable di layar Finansial & ROI). Lever payload bernilai 0 sampai faktor biaya diisi. Bekerja atas data import/contoh — bukan telematik live.",
        style: "note",
      },
    ],
    styles: {
      h1: { fontSize: 18, bold: true, color: "#0B7A3B" },
      h2: { fontSize: 13, bold: true, color: "#0E4D92", margin: [0, 6, 0, 6] },
      sub: { fontSize: 9, color: "#64748b" },
      note: { fontSize: 8, color: "#94a3b8", italics: true },
    },
    defaultStyle: { fontSize: 10 },
  };

  pdfMake.createPdf(doc).download("Laporan-MuatCerdas.pdf");
}
