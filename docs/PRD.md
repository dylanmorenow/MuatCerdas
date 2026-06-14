# PRD-0002: MuatCerdas — Tire & Payload Intelligence Platform

**Author:** Tim Astranauts · **Date:** 2026-06-14 · **Status:** Draft (case KPP Mining — lomba Astranauts)
**Product codename:** `MuatCerdas` *(placeholder, boleh diganti)*

> Dokumen ini hybrid: §1–§9 PRD produk (apa & kenapa), §10–§14 build-spec untuk agen koding (Claude Code). Sumber kebenaran model/rumus = §11–§12. Bangun **aplikasi sungguhan yang berfungsi**, bukan demo. **Tanpa Pareto. Tanpa fitur tak perlu.**

---

## 1. Ringkasan & Konteks
KPP Mining (grup Astra) adalah kontraktor tambang batu bara terintegrasi. Di site PT Indexim Coalindo terdapat dua case berbeda dengan **armada berbeda**:

- **Case 1 — Umur ban truk hauling jalan.** Pada rute CPP KM 33 → Jetty (±35 km, mayoritas laterit), ban truk **Scania P410, Scania R580, Volvo FH16 6x4T, Scania 620 XT** memendek umurnya akibat kondisi jalan, muatan, tekanan ban, dan gaya operator → penggantian dini → biaya naik.
- **Case 2 — Optimalisasi payload HD785.** Dump truck in-pit **HD785** (dimuat excavator PC2000/PC1250/PC850): underload menaikkan ritase & biaya; overload merusak ban/rem/drivetrain & menambah risiko.

**Insight produk:** masalahnya bukan ketiadaan alat ukur, melainkan data (umur ban, payload, kondisi, operator) **tidak disatukan, dimodelkan, dan ditindaklanjuti**. MuatCerdas menjadi platform yang melakukan itu dengan model yang transparan dan dapat dijalankan pada data nyata.

**Batas jujur (penting):** platform bekerja atas data yang **di-import** (CSV/XLSX) atau **dataset contoh** bawaan. Disediakan batas integrasi (import + API) agar suatu saat bisa tersambung ke FMS/PLM, tetapi **integrasi telematik live bukan bagian rilis ini** dan tidak boleh dipalsukan.

---

## 2. Problem Statement
KPP kehilangan biaya berulang dari (1) penggantian ban truk hauling yang dini dan (2) payload HD785 yang tidak konsisten — padahal datanya sudah ada namun tersebar dan tidak dimodelkan menjadi keputusan. Tidak ada satu sistem yang memprediksi sisa umur ban & penyebabnya, mengukur kualitas payload terhadap target, mengaitkan keduanya ke Rupiah, dan menghasilkan tindakan konkret.

---

## 3. Goals
**Primary**
- Menyediakan platform yang benar-benar berfungsi untuk: (A) memprediksi & mengelola umur ban truk hauling beserta penyebab keausan, dan (B) menganalisis & mengoptimalkan payload HD785 — keduanya diterjemahkan ke biaya & ROI.

**Secondary**
- Menerima data nyata (import) dan menyimpannya; menghasilkan rekomendasi tindakan; mengekspor laporan untuk manajemen.
- Dirancang dengan batas integrasi agar dapat berkembang ke koneksi FMS/PLM.

**Non-goals**
- Pareto / analisis 80-20 (dibuang).
- Integrasi telematik/PLM/FMS live, hardware/IoT, pada rilis ini.
- Menggantikan sistem pengukuran (PLM/Loadrite); kita di atasnya.
- RBAC kompleks, multi-tenant, mobile native.

---

## 4. Personas
| Persona | Peran | Kebutuhan |
|---|---|---|
| Tyre/Maintenance Planner | Mengelola ban truk hauling | Prediksi sisa umur ban, penyebab keausan, rekomendasi rotasi/ganti, biaya |
| Site Productivity Engineer | Produktivitas alat | Kualitas payload HD785, over/underload, kaitan ke keausan, biaya |
| Operator Excavator / Spotter | Memuat HD785 | Panduan pemuatan sederhana ke target 91 ton |
| Manajemen KPP / Juri | Keputusan & nilai | KPI, biaya terhindarkan, ROI, payback, laporan |
| Data/Operations Admin | Menyiapkan data | Import data, kelola unit/operator/rute, kalibrasi |

---

## 5. User Stories
- **US-1 (A):** Sebagai *Tyre Planner*, saya ingin melihat prediksi sisa umur tiap ban/unit truk hauling beserta tingkat keyakinannya, agar saya merencanakan penggantian tepat waktu.
- **US-2 (A):** Sebagai *Tyre Planner*, saya ingin tahu **penyebab utama** keausan dini per unit (jalan/tekanan/muatan/operator), agar saya menindak akar masalah.
- **US-3 (A):** Sebagai *Tyre Planner*, saya ingin rekomendasi tindakan (rotasi, ganti, koreksi tekanan, segmen jalan kritis) dan estimasi penghematannya.
- **US-4 (B):** Sebagai *Productivity Engineer*, saya ingin melihat distribusi payload HD785 vs target 91 ton, % under/ok/over, per unit & operator, agar saya tahu di mana masalahnya.
- **US-5 (B):** Sebagai *Engineer*, saya ingin tahu keterkaitan frekuensi overload dengan keausan ban/komponen HD785 dalam Rupiah.
- **US-6 (B):** Sebagai *Engineer*, saya ingin tahu unit mana yang data payload-nya kemungkinan tidak terkalibrasi, agar angkanya bisa dipercaya.
- **US-7 (B):** Sebagai *Operator/Spotter*, saya ingin panduan pemuatan hijau/kuning/merah ke target, agar berhenti tepat tanpa over/underload.
- **US-8 (inti):** Sebagai *Manajemen*, saya ingin KPI biaya terhindarkan + ROI/payback yang inputnya dapat diubah dengan data riil, agar memutuskan investasi.
- **US-9 (inti):** Sebagai *Admin*, saya ingin meng-import data (CSV/XLSX) untuk unit, ban, payload, rute, operator, kalibrasi, dengan validasi.
- **US-10 (inti):** Sebagai *Manajemen*, saya ingin mengekspor laporan ringkas (PDF/CSV).

---

## 6. Cakupan
**In scope (bangun):** Modul A (Tire), Modul B (Payload), Ingest data + DB, Mesin finansial & ROI, Dashboard & laporan, Auth tipis (opsional, milestone akhir).
**Out of scope:** Pareto; integrasi live telematik/FMS/PLM/IoT; RBAC kompleks; multi-tenant; mobile native; prediksi black-box yang tak terjelaskan.

---

## 7. Functional Requirements
| ID | Requirement | Modul | Priority |
|----|-------------|-------|----------|
| FR-0002-1 | Import data CSV/XLSX (unit, ban, payload, rute/segmen, operator, kalibrasi) dengan validasi skema & pesan error jelas | Inti | Must |
| FR-0002-2 | Dataset contoh realistis ter-seed, konsisten dgn pemetaan unit (truk jalan vs HD785), agar app langsung jalan | Inti | Must |
| FR-0002-3 | Registry ban truk hauling: posisi, pasang/lepas, km, tekanan, alasan lepas, biaya | A | Must |
| FR-0002-4 | Prediksi sisa umur ban per ban/unit + tingkat keyakinan (model §12.1) | A | Must |
| FR-0002-5 | Atribusi penyebab keausan dini per unit (kontribusi tiap faktor, §12.2) | A | Must |
| FR-0002-6 | Rekomendasi tindakan ban (rotasi/ganti/tekanan/segmen) + estimasi penghematan | A | Should |
| FR-0002-7 | Analitik payload HD785: distribusi vs target 91 t, % under/ok/over, statistik, per unit & operator, tren (§12.3) | B | Must |
| FR-0002-8 | Kaitan overload→keausan ban/komponen HD785 dalam Rupiah (§12.4) | B | Must |
| FR-0002-9 | Kepercayaan kalibrasi payload: flag drift (offset/usia kalibrasi, §12.6) | B | Should |
| FR-0002-10 | Panduan pemuatan (loading guidance): konfigurasi ambang + tampilan hijau/kuning/merah per bucket terhadap target; sumber data: input/feed payload (§12.5) | B | Should |
| FR-0002-11 | Generator loading policy (target band, jumlah pass disarankan, koreksi densitas material) | B | Should |
| FR-0002-12 | Mesin finansial: biaya ban terhindarkan, biaya under/overload, gabungan; semua asumsi editable; skenario armada (§12.7–§12.8) | Inti | Must |
| FR-0002-13 | ROI & payback dari penghematan vs CapEx/OpEx (§12.9) | Inti | Must |
| FR-0002-14 | Dashboard: KPI per modul + ringkasan biaya/penghematan/ROI | Inti | Must |
| FR-0002-15 | Ekspor laporan (PDF/CSV) | Inti | Should |
| FR-0002-16 | Auth tipis (login satu organisasi); dapat dinonaktifkan untuk demo | Inti | Nice |

---

## 8. Acceptance Criteria (Given–When–Then)

### FR-0002-1 / FR-0002-2 Import & seed
| # | Criteria |
|---|----------|
| 1 | Given file CSV ban valid, when di-import, then baris tersimpan & jumlah tervalidasi ditampilkan |
| 2 | Given kolom wajib hilang/ tipe salah, when di-import, then error baris-spesifik ditampilkan, data valid lain tetap diproses |
| 3 | Given DB kosong, when app pertama dijalankan dengan seed, then ada truk hauling (Scania/Volvo) untuk Modul A dan HD785 untuk Modul B, tidak tertukar |

### FR-0002-4 Prediksi umur ban (Modul A)
| # | Criteria |
|---|----------|
| 1 | Given riwayat ban suatu unit, when membuka prediksi, then ditampilkan estimasi sisa umur (km) + interval keyakinan |
| 2 | Given data sangat sedikit untuk satu unit, then sistem memakai fallback heuristik (umur best-practice merek × pengali kondisi) dan menandainya "estimasi awal" |
| 3 | Given unit dengan eksposur jalan buruk & tekanan menyimpang tinggi, then prediksi sisa umurnya lebih rendah dari unit serupa berkondisi baik |

### FR-0002-5 Atribusi penyebab (Modul A)
| # | Criteria |
|---|----------|
| 1 | Given unit dengan umur ban di bawah baseline, when membuka atribusi, then ditampilkan kontribusi tiap faktor (kondisi jalan, tekanan, muatan, operator) yang menjumlah ke total shortfall |

### FR-0002-7 Analitik payload (Modul B)
| # | Criteria |
|---|----------|
| 1 | Given payload events HD785, then ditampilkan % under (<95% target), ok (95–110%), over (>110%) dan rata-rata payload |
| 2 | Given pilih per operator/unit, then statistik dihitung ulang untuk irisan itu |

### FR-0002-12 / FR-0002-13 Finansial & ROI
| # | Criteria |
|---|----------|
| 1 | Given default §12 (harga ban Rp20jt, 10 ban/unit, 100.000 km/th, umur aktual 65.000, best 100.000), then "ban dapat-dihindari per unit" ≈ 5,38 & biaya ≈ Rp107,7 jt/unit/th |
| 2 | Given capture_rate 50% & armada 30 (default, ASUMSI sementara), then penghematan ban ≈ Rp1,62 M/th |
| 3 | Given penghematan & CapEx, then payback (bln) = CapEx ÷ (penghematan/12) tampil; default CapEx Rp500jt → payback ≈ 3,7 bln |
| 4 | Given salah satu asumsi diubah, then seluruh turunan diperbarui < 300 ms |

### FR-0002-10 Loading guidance (Modul B)
| # | Criteria |
|---|----------|
| 1 | Given urutan berat bucket dimasukkan/feed, when total dalam target, then indikator HIJAU |
| 2 | Given total ≥95% target, then KUNING; given >110%, then MERAH "STOP" |

---

## 9. Non-Functional Requirements
| ID | Kategori | Target |
|----|----------|--------|
| NFR-0002-1 | Performance | recompute finansial/analitik < 300 ms untuk dataset contoh; import 10k baris < 10 s |
| NFR-0002-2 | Correctness | model & rumus tervalidasi unit test (sanity §8); angka konsisten lintas layar |
| NFR-0002-3 | Usability | tiap angka berlabel+satuan; istilah ber-tooltip (glosarium §15); UI Bahasa Indonesia |
| NFR-0002-4 | Portability | jalan via satu perintah dev di laptop; SQLite tanpa setup berat |
| NFR-0002-5 | Reliability | validasi input ketat (Zod); import & form tidak meng-crash di data buruk |
| NFR-0002-6 | Explainability | prediksi & atribusi transparan (koefisien terlihat), bukan black-box |
| NFR-0002-7 | Extensibility | lapisan import & API memungkinkan sumber data lain ditambah tanpa ubah domain |
| NFR-0002-8 | Localization | format angka Indonesia (ribuan titik, desimal koma) |

---

## 10. Tech Stack (ringkas; detail di TECH_DESIGN)
Full-stack TypeScript, npm workspaces: **client** (React+Vite+Tailwind+Recharts+TanStack Query), **server** (Fastify+Prisma+SQLite, Zod, papaparse+SheetJS), **shared** (domain murni + Vitest). Node ≥ 18.

---

## 11. Model Data (entitas inti — implementasikan di shared + Prisma)
```
Unit { id; category: "haul_truck"|"pit_dumper"; model; tareKg; ratedPayloadKg;
       tiresCount; tireModel?; tirePriceIdr?; kmPerYear? }
   // haul_truck: Scania P410/R580, Volvo FH16 6x4T, Scania 620 XT (Case 1)
   // pit_dumper: HD785 (Case 2)
Operator { id; name; shift: "day"|"night" }
RoadSegment { id; name; surface:"laterite"|"rock"|"sealed"; lengthKm; conditionScore(0..1);
              avgSpeedLoadedKmh; avgSpeedEmptyKmh }
TireRecord { id; unitId; position; installDate; removalDate?; kmAtRemoval?;
             avgPressureDeviationPct?; loadIndex?; removalReason:"worn"|"cut"|"overload"|"scheduled";
             costIdr }
TripLog { id; unitId; operatorId; date; km; segmentExposure: {segmentId, km}[];
          avgPressureDeviationPct?; payloadIdx? }   // untuk truk hauling (Modul A)
PayloadEvent { id; unitId(HD785); operatorId; timestamp; measuredPayloadKg;
               targetPayloadKg; status:"under"|"ok"|"over" }   // Modul B
CalibrationRecord { unitId; lastCalibrationDate; scaleStudyOffsetPct }
CostParams { tirePriceIdr; tiresPerUnit; kmPerYear; tireLifeActualKm; tireLifeBestKm;
             captureRate; fleetSize; capexIdr; opexAnnualIdr;
             fuelCostPerTripIdr; tripsPerYear; underloadPct; overloadWearCostFactorIdr }
```

---

## 12. Model & Rumus (SUMBER KEBENARAN — implementasikan persis di `shared/`)
Format Rupiah Indonesia. Default = ASUMSI, editable, bertanda di UI.

**§12.1 Prediksi umur ban (Modul A).** Multiple linear regression terhadap riwayat `TireRecord`+`TripLog`:
```
predictedLifeKm = β0 + β1*avgPressureDeviationPct + β2*loadIndex
                + β3*weightedRoadConditionExposure + β4*operatorFactor + (dummies merek)
remainingLifeKm = predictedLifeKm - currentKm
```
Fit via normal equations / lib regresi. Tampilkan koefisien (explainable). **Fallback** bila data unit < ambang: `tireLifeBest(merek) * conditionMultiplier`, tandai "estimasi awal".

**§12.2 Atribusi penyebab.** Kontribusi faktor-i terhadap shortfall (baselineLife − predictedLife):
```
contribution_i = β_i * (x_i - x_i_baseline)   // dinormalisasi agar Σ ≈ shortfall
```

**§12.3 Analitik payload (Modul B).** Dari `PayloadEvent`: status `<95%`=under, `95–110%`=ok, `>110%`=over; hitung %, mean, stdev, breakdown per unit/operator, tren waktu.

**§12.4 Overload→keausan (Modul B, Rupiah).**
```
overloadRate(unit) = #over / #events
overloadWearCost(unit) = overloadRate * overloadWearCostFactorIdr
```
Korelasikan overloadRate vs umur ban/komponen HD785 (tampilkan, jadikan biaya).

**§12.5 Loading guidance.** total = Σ bucket; HIJAU bila dalam target, KUNING ≥95%, MERAH >110% target.

**§12.6 Calibration drift.** `needsCalibration = |scaleStudyOffsetPct|>5 OR usia kalibrasi >90 hari`.

**§12.7 Biaya ban terhindarkan (Modul A, finansial).**
```
tiresActualPerYear = tiresPerUnit * kmPerYear / tireLifeActualKm
tiresBestPerYear   = tiresPerUnit * kmPerYear / tireLifeBestKm
avoidableTires     = tiresActualPerYear - tiresBestPerYear
avoidableCostPerUnit = avoidableTires * tirePriceIdr
capturedPerUnit    = avoidableCostPerUnit * captureRate          // default 0.5
fleetCaptured      = capturedPerUnit * fleetSize
```
Sanity: default → avoidableTires≈5,38; ≈Rp107,7jt/unit; captured≈Rp53,8jt/unit; fleet30≈Rp1,62M.
(Catatan: tireLifeActualKm boleh memakai keluaran model §12.1 agregat, bukan hanya input manual.)

**§12.8 Biaya payload (Modul B, lever).**
```
underloadExtraCost = tripsPerYear * underloadPct * fuelCostPerTripIdr
overloadCost       = Σ overloadWearCost(unit)        // §12.4
```

**§12.9 ROI.**
```
annualSavings = fleetCaptured + underloadExtraCost_saved + overloadCost_saved
paybackMonths = capexIdr / (annualSavings/12)
roiYear1      = (annualSavings - opexAnnualIdr - capexIdr) / capexIdr
```
Default capex 500jt, opex 100jt/th.

---

## 13. Spesifikasi Layar
1. **Dashboard** — KPI gabungan: biaya ban terhindarkan/th, biaya payload terhindarkan/th, total penghematan, payback, ROI; ringkasan tiap modul.
2. **Tire — Daftar & Prediksi (Modul A)** — tabel unit truk hauling: sisa umur prediksi, keyakinan, status; detail per unit dgn riwayat ban & atribusi penyebab.
3. **Tire — Rekomendasi** — daftar tindakan (rotasi/ganti/tekanan/segmen) + estimasi penghematan.
4. **Payload — Analitik (Modul B)** — distribusi vs 91 t, %under/ok/over, statistik, filter unit/operator, tren; panel kaitan overload→keausan.
5. **Payload — Loading Guidance** — konfigurasi ambang + indikator hijau/kuning/merah (input/feed bucket) + loading policy.
6. **Calibration Health** — daftar unit HD785 + status drift + tanggal/offset.
7. **Finansial & ROI** — input asumsi editable, hasil live, skenario armada.
8. **Data / Import** — unggah CSV/XLSX, validasi, kelola unit/operator/rute.
9. **(Opsional) Login** — auth tipis.

Navigasi sidebar; header nama produk + tagline.

---

## 14. Catatan untuk Agen
- Jangan bangun Pareto. Jangan tertukar HD785 vs truk jalan. Jangan tambah fitur di luar §7.
- Domain murni & teruji dulu (model §12) sebelum UI. Ikuti urutan `IMPLEMENTATION_PLAN.md`.
- App harus benar-benar jalan pada dataset contoh + data import; jangan mock.

## 15. Glosarium
- **Truk hauling jalan:** Scania P410/R580, Volvo FH16 6x4T, Scania 620 XT — mengangkut di rute CPP→Jetty (Case 1, fokus ban).
- **HD785:** rigid dump truck Komatsu in-pit, payload 91 t, dimuat excavator (Case 2, fokus payload).
- **PLM:** Payload Meter bawaan HD785 (akurat setelah truk jalan). **Loading guidance:** sinyal hijau/kuning/merah saat memuat.
- **Laterit:** permukaan jalan tanah merah yang abrasif/licin saat basah.
- **Overload/Underload:** muatan di atas/di bawah target; **capture rate:** fraksi kerugian teoretis yang realistis tertangkap.

## 16. Open Questions
1. Apakah KPP sudah pakai FMS penuh (mis. Modular Mining DISPATCH)? Bila ya, posisikan MuatCerdas sebagai pelengkap (model umur-ban & payload→biaya yang biasanya belum ada). **Verifikasi sebelum final.**
2. Harga & umur ban HD785 + data komponen untuk mengunci §12.4/§12.8.
3. Ukuran armada truk hauling aktual.
4. Status & kalibrasi PLM di HD785 KPP.
