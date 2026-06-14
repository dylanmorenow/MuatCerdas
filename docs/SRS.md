# SRS-0002: MuatCerdas — Software Requirements Specification

**Author:** Tim Astranauts · **Date:** 2026-06-14 · **Status:** Draft
**Terkait:** `docs/PRD.md` (sumber FR/AC & rumus §12), `docs/TECH_DESIGN.md` (arsitektur)

> Requirement perangkat lunak formal & dapat ditelusuri. Merujuk PRD (tak mengulang user story) & TECH_DESIGN (tak mengulang arsitektur). Konflik nilai/rumus → **PRD §11–§12 menang**.

## 1. Pendahuluan
- **Tujuan.** Menetapkan apa yang HARUS dilakukan MuatCerdas agar dapat diverifikasi.
- **Lingkup.** Aplikasi web full-stack yang berfungsi nyata: import data, simpan, model & analitik (umur ban truk hauling; payload HD785), finansial/ROI, laporan. Bekerja atas data import/contoh; integrasi telematik live di luar lingkup (PRD §1, §6).
- **Definisi.** Glosarium PRD §15.

## 2. Deskripsi Umum
- **Perspektif.** Platform decision/analytics mandiri di atas data; tidak menggantikan sistem pengukuran.
- **Dua modul:** A (Tire, truk hauling jalan), B (Payload, HD785) + inti bersama (import/DB, finansial, dashboard, laporan).
- **Pengguna.** PRD §4. **Batasan.** Node ≥18; UI Bahasa Indonesia; tanpa Pareto; tanpa fitur tak perlu.
- **Asumsi/dependensi.** Data dari import/seed; parameter biaya editable & bertanda asumsi; model transparan.

## 3. Antarmuka Eksternal
- **3.1 UI:** layar pada PRD §13 (Dashboard, Tire Daftar/Prediksi, Tire Rekomendasi, Payload Analitik, Loading Guidance, Calibration, Finansial/ROI, Data/Import, opsional Login).
- **3.2 Hardware:** tidak ada.
- **3.3 Software:** tidak ada sistem eksternal wajib; data via import CSV/XLSX & API internal. Batas integrasi disediakan untuk masa depan (TECH_DESIGN §9).
- **3.4 Komunikasi:** client↔server via API internal; tidak ada panggilan telematik live.

## 4. Kebutuhan Fungsional (traceable ke PRD §7, diverifikasi PRD §8)
| SR | "Sistem HARUS …" | Map FR | Modul | Prio |
|---|---|---|---|---|
| SR-1 | meng-import CSV/XLSX (unit, ban, payload, rute, operator, kalibrasi) dgn validasi skema & error per-baris | FR-0002-1 | Inti | Must |
| SR-2 | menyediakan seed data realistis dgn pemetaan unit benar (truk jalan vs HD785) | FR-0002-2 | Inti | Must |
| SR-3 | menyimpan & mengelola registry ban truk hauling (posisi, km, tekanan, alasan lepas, biaya) | FR-0002-3 | A | Must |
| SR-4 | memprediksi sisa umur ban + keyakinan via model §12.1; fallback heuristik bila data minim | FR-0002-4 | A | Must |
| SR-5 | mengatribusi penyebab keausan dini per unit sesuai §12.2 (kontribusi menjumlah ke shortfall) | FR-0002-5 | A | Must |
| SR-6 | menghasilkan rekomendasi tindakan ban + estimasi penghematan | FR-0002-6 | A | Should |
| SR-7 | menghitung analitik payload HD785 (%under/ok/over, statistik, per unit/operator, tren) §12.3 | FR-0002-7 | B | Must |
| SR-8 | menghitung & memvisualkan kaitan overload→keausan dalam Rupiah §12.4 | FR-0002-8 | B | Must |
| SR-9 | menandai drift kalibrasi (offset>5% atau >90 hari) §12.6 | FR-0002-9 | B | Should |
| SR-10 | menyediakan loading guidance hijau/kuning/merah terhadap target §12.5 | FR-0002-10 | B | Should |
| SR-11 | menghasilkan loading policy (band target, pass disarankan, koreksi densitas) | FR-0002-11 | B | Should |
| SR-12 | menghitung biaya ban terhindarkan, biaya under/overload, gabungan; asumsi editable; skenario armada §12.7–§12.8 | FR-0002-12 | Inti | Must |
| SR-13 | menghitung ROI & payback §12.9 | FR-0002-13 | Inti | Must |
| SR-14 | menampilkan dashboard KPI gabungan | FR-0002-14 | Inti | Must |
| SR-15 | mengekspor laporan (PDF/CSV) | FR-0002-15 | Inti | Should |
| SR-16 | menyediakan auth tipis yang dapat dinonaktifkan | FR-0002-16 | Inti | Nice |

### 4.x Aturan & validasi
- **SR-V1** Status payload: `<95%`=under, `95–110%`=ok, `>110%`=over (PRD §12.3).
- **SR-V2** Semua input divalidasi (Zod). Data buruk → pesan jelas, tidak crash; baris valid tetap diproses.
- **SR-V3** Pemetaan kategori unit ditegakkan: Modul A hanya `haul_truck`, Modul B hanya `pit_dumper`. Sistem MENOLAK menempatkan HD785 di analitik ban dan sebaliknya.
- **SR-V4** Prediksi & atribusi harus explainable (koefisien/kontribusi dapat dilihat) — bukan black-box.
- **SR-V5** Hasil finansial konsisten antar layar (satu sumber perhitungan di `shared/`).

## 5. Non-Fungsional (traceable PRD §9)
| SR | Kategori | Target | Map |
|---|---|---|---|
| SR-NF1 | Performance | recompute <300 ms; import 10k baris <10 s | NFR-0002-1 |
| SR-NF2 | Correctness | unit test domain lulus sanity PRD §8 | NFR-0002-2 |
| SR-NF3 | Usability | label+satuan; tooltip glosarium; Bahasa Indonesia | NFR-0002-3 |
| SR-NF4 | Portability | satu perintah dev; SQLite | NFR-0002-4 |
| SR-NF5 | Reliability | validasi Zod; tak crash | NFR-0002-5 |
| SR-NF6 | Explainability | model transparan | NFR-0002-6 |
| SR-NF7 | Extensibility | lapisan import/API terpisah dari domain | NFR-0002-7 |
| SR-NF8 | Localization | format angka Indonesia | NFR-0002-8 |

## 6. Verifikasi
Tiap SR "Must" diverifikasi oleh acceptance criteria **PRD §8** + unit test domain (TECH_DESIGN §7) + integration test API. Rilis memenuhi SRS bila semua SR Must lulus.
