# BRD-0002: MuatCerdas — Business Requirements Document

**Author:** Tim Astranauts · **Date:** 2026-06-14 · **Status:** Draft
**Terkait:** `docs/PRD.md`, `docs/SRS.md`

> Menjawab **kenapa** dari sisi bisnis. Tidak memuat fitur detail (PRD) maupun teknis (TECH_DESIGN).

## 1. Latar Belakang
KPP Mining (grup Astra), kontraktor tambang batu bara terintegrasi. Dua case dengan armada berbeda:
- **Case 1 — Umur ban truk hauling jalan** (Scania P410/R580, Volvo FH16 6x4T, Scania 620 XT) di rute laterit CPP KM 33 → Jetty (±35 km): penggantian ban dini → biaya operasional naik.
- **Case 2 — Payload HD785 in-pit** (dimuat PC2000/PC1250/PC850): underload menaikkan ritase/biaya; overload merusak ban/komponen & menambah risiko.

Akar: data ada tetapi tidak dimodelkan & ditindaklanjuti.

## 2. Tujuan Bisnis
- **BO-1** Menekan biaya ban truk hauling dengan memprediksi umur, menemukan penyebab keausan dini, dan menindaknya.
- **BO-2** Memperbaiki *cost-per-ton* HD785 lewat payload yang konsisten di target & menekan keausan akibat overload.
- **BO-3** Mengubah data yang ada menjadi keputusan dengan CapEx kecil & ROI cepat.
- **BO-4** Solusi dapat di-scale ke proyek Astra lain.

## 3. Pemangku Kepentingan
Manajemen KPP/juri (ROI, payback, risiko) · Tyre/Maintenance Planner (Case 1) · Productivity Engineer (Case 2) · Operator/Spotter (panduan muat) · Data Admin (import) · Tim Astranauts (memenangkan lomba).

## 4. Business Case & Nilai (konservatif; rumus PRD §12)
- **Ban (Case 1):** selisih umur aktual vs best-practice ≈ 35% belanja ban terbuang. Per unit truk hauling ≈ **Rp108 jt/th**; tertangkap (50%) ≈ **Rp54 jt/unit/th**. Armada 30 → ≈ **Rp1,62 M/th** (sebelum payload).
- **Payload (Case 2):** hemat tambahan dari menekan overload (ban/komponen HD785) & underload (ritase/fuel) — lever, dikunci saat data KPP tersedia.
- **CapEx** ratusan juta one-off (software di atas data yang ada) → **payback < 1 tahun**.

**Posisi jujur:** nilainya kecil dibanding revenue KPP (triliunan). Jual sebagai **penghematan berisiko-rendah, ROI sangat tinggi, dapat di-scale** — bukan "menyelamatkan perusahaan".

## 5. Pasar & Kompetisi (build vs buy)
- **PLM bawaan HD785** & **sistem sisi-excavator** (Loadrite, ShovelMetrics) menjual **pengukuran** payload; tidak menjual model umur ban maupun keputusan biaya terpadu.
- **UVP MuatCerdas:** platform **keputusan** — prediksi & atribusi umur ban truk hauling (Case 1) + analitik/optimasi payload HD785 (Case 2) → diterjemahkan ke Rupiah & tindakan, di atas data yang sudah ada. Dirancang agar bisa tersambung ke FMS/PLM ke depan.

## 6. Cakupan & Batasan Bisnis
- **In:** platform dua-modul yang berfungsi nyata atas data import/contoh + laporan.
- **Out:** Pareto; integrasi telematik live; penggantian sistem pengukuran; fitur tak perlu.
- **Batasan:** deadline lomba 21 Juni 2026; tim mahasiswa; data internal KPP belum dimiliki (semua asumsi editable).

## 7. Kriteria Sukses Bisnis
| ID | Kriteria | Target |
|---|---|---|
| BS-1 | Kedua modul berfungsi atas data import/contoh | Jalan nyata, bukan mock |
| BS-2 | ROI/payback menarik | Payback < 12 bln (default ≈3,7 bln) |
| BS-3 | Juri paham nilai cepat | < 60 detik dari slide pembuka |
| BS-4 | Dapat di-input data riil tanpa ubah kode | Semua asumsi editable; import berfungsi |

## 8. Risiko & Asumsi
- **R-1 (tinggi):** KPP mungkin sudah pakai FMS penuh → posisikan sebagai pelengkap (model umur-ban & payload→biaya). **Verifikasi sebelum final.**
- **R-2:** angka bergantung data internal → semua asumsi editable + bertanda.
- **R-3:** dianggap "cuma dashboard" → pembeda = model prediktif umur ban + kaitan overload→biaya yang transparan.
- **Asumsi:** harga/umur ban dari riset tim; capture_rate 50%; CapEx Rp500jt, OpEx Rp100jt/th — placeholder.

## 9. Open Questions
Lihat PRD §16 (status FMS KPP; harga ban HD785 & data komponen; ukuran armada hauling; status/kalibrasi PLM).
