# MuatCerdas — Tire, Payload & Speed Intelligence Platform (KPP Mining)

Aplikasi web **full-stack yang benar-benar berfungsi** yang mengubah data armada KPP menjadi keputusan biaya & operasi. Modul A/B/C/D + inti — memetakan dua case lomba Astranauts, satu lapisan penyatu, dan satu lapisan operasi/akses:

- **Modul A — Tire Life Intelligence (Case 1):** truk hauling jalan **Scania P410, Scania R580, Volvo FH16 6x4T, Scania 620 XT** di rute laterit CPP KM 33 → Jetty (±35 km). Prediksi sisa umur ban (regresi linear **terjelaskan**), atribusi penyebab keausan, rekomendasi tindakan, dan biaya.
- **Modul B — Payload Optimization (Case 2):** dump truck in-pit **HD785** (dimuat PC2000/PC1250/PC850). Analitik payload vs target 91 t, deteksi over/underload, kaitan ke keausan, kepercayaan kalibrasi, dan panduan pemuatan hijau/kuning/merah.
- **Modul C — Speed Optimization (TKPH):** menyatukan A & B. Menghitung **kecepatan aman maksimum** tiap truk hauling dari beban ban (standar **TKPH**), menyeimbangkannya dengan **target produksi harian**, lalu **jujur melaporkan** bila target hanya tercapai dengan melanggar batas ban — beserta opsi solusi terukur. Deterministik (TKPH + aljabar), **bukan AI**.
- **Modul D — Peran & Operasi (akses + driver + peta):** login **dua peran** (admin/driver), **Driver Dashboard** ringkas per-unit (reuse A/B/C), dan prototipe **peta kondisi jalan** (konsep LIDAR) sebagai sumber `conditionScore` yang menyetir Modul A. Data simulasi — **bukan LIDAR live**.
- **Inti:** import data nyata (CSV/XLSX), mesin finansial (biaya terhindarkan + ROI), dashboard & laporan (PDF/CSV).

> **Bukan demo/mock, dan bukan Pareto.** Bekerja atas data yang di-import (CSV/XLSX) atau dataset contoh deterministik bawaan. Integrasi telematik/PLM/FMS **live** = pekerjaan masa depan (batas integrasi tersedia di arsitektur), **tidak dipalsukan**.

## Tagline
> "KPP sudah punya datanya. MuatCerdas mengubahnya jadi keputusan: memprediksi & memperpanjang umur ban truk hauling, menjaga payload HD785 tepat di target, dan menetapkan kecepatan aman yang tetap mengejar produksi — semua diterjemahkan ke Rupiah."

## Mulai cepat
```bash
npm install            # workspaces: shared, server, client
npm run db:setup       # prisma migrate + generate + seed dataset contoh (30 truk hauling + 12 HD785, + parameter TKPH)
npm run dev            # server (http://localhost:3001) + client (http://localhost:5173)
```
Buka **http://localhost:5173**. Perintah lain:
```bash
npm run test           # uji lengkap lintas 3 workspace (mengunci model §12 & §C; peran & peta M10)
npm run typecheck      # TypeScript strict, 3 workspace
npm run build          # build produksi client + cek tipe server
```
Prasyarat: **Node ≥ 18**. Database: **SQLite** (tanpa setup berat). File `server/.env` minimal berisi `DATABASE_URL="file:./dev.db"` (UTF-8 tanpa BOM).

## Arsitektur
TypeScript full-stack, npm workspaces:
- **`shared/`** — otak domain **murni** (tipe, skema Zod, rumus PRD §12 + Modul C §C, format Rupiah) + Vitest. Dipakai server **dan** client → satu sumber perhitungan (SR-V5).
- **`server/`** — Fastify + Prisma + SQLite. Endpoint import (papaparse/SheetJS), analitik tire/payload, **speed/TKPH**, finansial, data. Logika murni dipisah dari Prisma agar mudah diuji tanpa DB.
- **`client/`** — React + Vite + Tailwind + Recharts + TanStack Query. 10 layar admin (sidebar) + **Driver Dashboard** terpisah (Modul D), UI Bahasa Indonesia, format angka Indonesia terpusat.

```
muatcerdas/
├─ shared/src/
│  ├─ tire/        predict · attribution · finance        (§12.1/§12.2/§12.7)
│  ├─ payload/     analytics · wear · guidance · calibration · policy  (§12.3–§12.6)
│  ├─ finance/     roi                                     (§12.8–§12.9)
│  └─ speed/       tkph · productionSpeed · decision       (§C.1–§C.6)   ← Modul C
├─ server/src/     routes/ · services/ · seed.ts · prisma/schema.prisma
└─ client/src/     pages/ · api/ · components/
```

## Layar
| Layar | Modul | Isi |
|---|---|---|
| Dashboard | Inti | KPI gabungan: biaya terhindarkan, penghematan, payback, ROI + ringkasan modul + **Unduh Laporan PDF/CSV** |
| Tire — Daftar & Prediksi | A | Tabel unit: sisa umur + interval keyakinan + status; klik → detail (riwayat ban, atribusi penyebab, koefisien model) |
| Tire — Rekomendasi | A | Tindakan prioritas (rotasi/ganti/tekanan/segmen) + estimasi penghematan |
| Payload — Analitik | B | Distribusi vs 91 t, %under/ok/over, tren, filter unit/operator, kaitan overload→keausan |
| Loading Guidance | B | Generator policy (pass/band) + simulasi bucket → indikator hijau/kuning/merah |
| Calibration Health | B | Status drift PLM HD785 (offset/usia kalibrasi) |
| **Speed Optimization** | **C** | **Vmax aman per unit (TKPH) · target produksi → V_required · banner AMAN/KONFLIK + opsi terukur · panduan driver · panel HD785 ringkas. Parameter TKPH/produksi editable (tersimpan DB)** |
| Finansial & ROI | Inti | Asumsi editable (tersimpan DB) → hasil live + skenario armada |
| Data / Import | Inti | Unggah CSV/XLSX per entity + validasi per-baris + inventaris |
| **Peta Jalan** | **D** | **Prototipe peta kondisi jalan KM33→Jetty (SVG): segmen berwarna per kondisi + truk pemeta (lead/last). Admin geser `conditionScore` → eksposur jalan Modul A berubah. Data simulasi, bukan LIDAR live** |
| **Driver Dashboard** | **D** | **Surface driver (login peran `driver`): kecepatan maks aman, massa muatan, identitas, kondisi unit, target produksi, peta jalan — besar & terbaca sekilas** |

## Modul C — Speed Optimization (TKPH), lebih dekat
**TKPH** (Tonne-Kilometre Per Hour) adalah standar industri ban tambang: tiap tipe ban punya batas TKPH dari katalog pabrik. Beban kerja ban = berat yang ditanggung × kecepatan rata-rata — jadi makin berat muatan, makin rendah batas kecepatan aman.

- **§C.1–§C.3** — beban ban kritis `Qa`, TKPH site (`Qa × Vm`), TKPH ban (katalog × koreksi suhu × situs), lalu `Vmax_safe = TKPH_ban / Qa`. Overload menaikkan `Qa` ⇒ Vmax turun.
- **§C.4** — dari target produksi harian & cycle time, dihitung kecepatan yang **dibutuhkan**.
- **§C.5 (rekonsiliasi satuan)** — keputusan dibandingkan **hanya pada basis kecepatan kerja rata-rata** (native TKPH). Angka yang ditampilkan ke driver dikonversi eksplisit ke **basis travel/spidometer** (`÷ travelFraction`) — tidak ada perbandingan "apel-jeruk".
- **§C.6 (keputusan)** — **AMAN** (jalankan pada V_required) atau **KONFLIK** → JANGAN ngebut; tampilkan opsi terukur: tambah N unit, turunkan target ke X t/hari, kurangi overload ke Y t (basis TKPH), atau pangkas waktu tetap (basis travel/kelayakan).
- **Panel HD785 ringkas** — payload aktual (Modul B) → `Qa` → Vmax_safe, mendemonstrasikan "muatan X t > target → maks Y km/jam".

Semua parameter (katalog TKPH per model ban, koreksi suhu/situs, jam kerja, waktu tetap, jarak, target produksi) **editable** & bertanda **ASUMSI**; nilai katalog TKPH bertanda **WAJIB DICARI** dari brosur pabrik (lihat `docs/ASSUMPTIONS.md` §F). Tersimpan di DB (tabel `SpeedParams` + `TkphCatalog`), **terpisah** dari parameter finansial agar sanity Modul A/B tak tersentuh.

## Mengganti dengan data riil KPP (tanpa ubah kode)
Buka layar **Data / Import**, pilih jenis data, unggah `.csv`/`.xlsx`. Validasi per-baris: baris rusak dilaporkan, baris valid tetap disimpan; impor ulang dengan `id` sama = **upsert**. Pemetaan unit ditegakkan (impor ban menolak HD785, impor payload menolak truk jalan). Contoh siap-pakai ada di **`server/sample-data/`** (termasuk `units-INVALID.csv` untuk mencoba validasi).

**Kolom per entity** (wajib; `[opsional]`):
| Entity | Kolom |
|---|---|
| `units` | id · category (`haul_truck`\|`pit_dumper`) · model · tareKg · ratedPayloadKg · tiresCount · [tireModel] · [tirePriceIdr] · [kmPerYear] |
| `operators` | id · name · shift (`day`\|`night`) |
| `segments` | id · name · surface (`laterite`\|`rock`\|`sealed`) · lengthKm · conditionScore (0–1) · avgSpeedLoadedKmh · avgSpeedEmptyKmh |
| `tires` | id · unitId (haul_truck) · position · installDate · [removalDate] · [kmAtRemoval] · [avgPressureDeviationPct] · [loadIndex] · removalReason (`worn`\|`cut`\|`overload`\|`scheduled`) · costIdr |
| `payload` | id · unitId (HD785) · operatorId · timestamp · measuredPayloadKg · targetPayloadKg *(status dihitung)* |
| `calibration` | id · unitId (HD785) · lastCalibrationDate · scaleStudyOffsetPct |

Parameter yang **diedit di layar** (bukan via import), semuanya tersimpan di DB:
- **Finansial & ROI** — harga ban, capture rate, armada, capex/opex, lever payload (default bertanda ASUMSI, tombol "Reset ke default").
- **Speed Optimization** — katalog TKPH per model ban, koreksi suhu/situs, jam kerja, waktu tetap, jarak, target produksi (idem, "Reset ke default").

## Auth & peran (opsional, Modul D)
Default **nonaktif** — demo langsung jalan tanpa login (akses penuh = admin). Untuk mengaktifkan login + peran, set `AUTH_ENABLED=true` di `server/.env` (set juga `AUTH_SECRET` untuk produksi). Saat aktif: semua endpoint butuh `Authorization: Bearer <token>` (kecuali `/api/health` & `/api/auth/*`); client menampilkan layar login (token JWT 12 jam, tombol **Keluar**).

**Dua peran** (sengaja tipis — bukan RBAC kompleks/multi-tenant):
- **admin** — seluruh modul (A/B/C), Finansial, Dashboard, Data/Import, **Speed Monitor** & **Peta Jalan**.
- **driver** — hanya **Driver Dashboard** untuk unitnya: kecepatan maks aman, massa muatan, identitas, kondisi unit (ban/kalibrasi), target produksi, peta jalan; endpoint admin → **403**.

Akun demo (di-seed; password **plain** = kredensial demo): admin `kpp` / `muatcerdas` · driver `andi` / `andi123` (HD-01), `budi` / `budi123` (HT-01), `citra` (HD-03), `dedi` (HT-07). Kembalikan `AUTH_ENABLED=false` untuk demo tanpa login.

## Kualitas & pengujian
- **Uji lengkap** (domain murni di `shared/` + service/integration di `server/`) — `npm run test`; logika Modul A/B/C tetap hijau setelah M10 (tak tersentuh).
- Sanity finansial PRD §8 dikunci (capturedPerUnit ≈ Rp53,8 jt/unit; fleet 30 ≈ Rp1,62 M/th; payback ≈ 3,7 bln).
- Modul C mengunci **AC#1–#5**: overload ⇒ Vmax turun · target naik ⇒ V_required naik · AMAN+rekomendasi · KONFLIK+opsi terukur · rekonsiliasi basis §C.5.
- TypeScript `strict` di 3 workspace; validasi I/O dengan Zod; logika domain murni & terjelaskan (bukan black-box).

## Definition of Done (CLAUDE.md)
- [x] Semua FR "Must" lulus acceptance criteria PRD §8 (engine §12 + unit test penjaga).
- [x] `client` & `server` jalan via satu perintah (`npm run dev`).
- [x] Import dataset contoh sukses & hasil cocok unit test domain.
- [x] Prediksi & analitik tampil akurat (sisa umur ban, distribusi payload, kecepatan TKPH, finansial konsisten lintas layar).
- [x] README + cara ganti data riil terisi.

## Status & roadmap
- **M1–M8** — Fondasi, domain & test, seed/import, Modul A, Modul B, Finansial/Dashboard, Laporan/Polish, Auth tipis. ✅
- **M9 — Modul C (Speed/TKPH).** ✅ (dokumen kanonik: `docs/MODULE_C_SPEED.md`)
- **M10 — Modul D (Driver & Road Mapping).** ✅ RBAC dua peran (admin/driver), **Driver Dashboard** (reuse A/B/C), dan prototipe **Peta Jalan** (SVG: segmen berwarna per kondisi + truk pemeta lead/last) dengan `conditionScore` editable yang menyetir eksposur jalan **Modul A**. Data simulasi (mewakili LIDAR), **bukan feed live**. (dokumen: `docs/MODULE_D_DRIVER_AND_MAPPING.md`)

## Catatan jujur
- **Asumsi**: lever payload (underload/overload, faktor keausan) default **0** sampai diisi — agar ROI tidak dibesar-besarkan. `currentKm` ban & spec excavator/densitas = heuristik/asumsi bertanda, bukan data KPP terverifikasi (PRD §16).
- **Modul C**: penerapan prinsip TKPH (deterministik, terjelaskan — **bukan AI**), bukan menemukan fisika baru. Katalog TKPH per model ban = placeholder **WAJIB DICARI** dari brosur pabrik; fraksi beban ban terberat & faktor koreksi = ASUMSI editable. Tampilan "ke driver" adalah keluaran sistem atas data yang di-feed — **bukan** perangkat live di kabin.
- **Faktor operator** Modul A diturunkan lintas-modul dari kecenderungan overload HD785 (proxy perilaku, terjelaskan — bukan black-box).
- Verifikasi **Open Question #1** (apakah KPP sudah pakai FMS penuh) sebelum final — `docs/BRD.md` §8 / `docs/PRD.md` §16.
- "MuatCerdas" masih placeholder nama.

## Peta dokumen
| File | Isi |
|---|---|
| `CLAUDE.md` | Aturan & konteks agen (auto-loaded) |
| `docs/PRD.md` | Apa: user story, FR, AC, model & rumus §12 |
| `docs/SRS.md` | Requirement perangkat lunak formal |
| `docs/TECH_DESIGN.md` | Bagaimana: arsitektur, engine, batas integrasi |
| `docs/IMPLEMENTATION_PLAN.md` | Urutan kerja M1–M10 |
| `docs/MODULE_C_SPEED.md` | Spesifikasi Modul C (Speed/TKPH) — sumber kebenaran §C |
| `docs/MODULE_D_DRIVER_AND_MAPPING.md` | Spesifikasi Modul D (peran, driver, road mapping) — rencana M10 |
| `docs/ASSUMPTIONS.md` | Daftar asumsi/placeholder yang perlu data riil + prioritas |
| `docs/BRD.md` · `docs/VIBECODING_GUIDE.md` | Bisnis · cara mengarahkan agen |
