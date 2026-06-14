// Format angka Indonesia terpusat (NFR-0002-8): ribuan titik, desimal koma.
// Semua angka di UI WAJIB lewat helper ini.

/** Angka biasa: 1234567.89 → "1.234.567,89". */
export function formatNumber(value: number, maxFractionDigits = 2): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/** Rupiah: 7000000 → "Rp 7.000.000". */
export function formatRupiah(value: number, maxFractionDigits = 0): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

/** Persentase dari fraksi: 0.15 → "15%". */
export function formatPersen(fraction: number, maxFractionDigits = 1): string {
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    maximumFractionDigits: maxFractionDigits,
  }).format(fraction);
}
