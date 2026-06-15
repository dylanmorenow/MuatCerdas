# MuatCerdas — Tire & Payload Intelligence Platform (KPP Mining)

Aplikasi web **full-stack yang benar-benar berfungsi** yang mengubah data armada KPP menjadi keputusan biaya. Dua modul memetakan dua case lomba Astranauts:

- **Modul A — Tire Life Intelligence (Case 1):** truk hauling jalan **Scania P410, Scania R580, Volvo FH16 6x4T, Scania 620 XT** di rute laterit CPP KM 33 → Jetty. Prediksi sisa umur ban (regresi terjelaskan), atribusi penyebab keausan, rekomendasi tindakan, biaya.
- **Modul B — Payload Optimization (Case 2):** dump truck in-pit **HD785** (dimuat PC2000/PC1250/PC850). Analitik payload vs target 91 t, over/underload, kaitan ke keausan, kepercayaan kalibrasi, panduan pemuatan hijau/kuning/merah.
- **Inti:** import data nyata (CSV/XLSX), mesin finansial (biaya terhindarkan + ROI), dashboard & laporan (PDF/CSV).

> **Bukan demo/mock, dan bukan Pareto.** Bekerja atas data yang di-import (CSV/XLSX) atau dataset contoh deterministik bawaan. Integrasi telematik/PLM/FMS **live** = pekerjaan masa depan (batas integrasi tersedia di arsitektur), **tidak dipalsukan**.

## Tagline
> "KPP sudah punya datanya. MuatCerdas mengubahnya jadi keputusan: memprediksi & memperpanjang umur ban truk hauling, dan menjaga payload HD785 tepat di target — lalu menerjemahkannya ke Rupiah."

## Mulai cepat
```bash
npm install            # workspaces: shared, server, client
npm run db:setup       # prisma migrate + generate + seed dataset contoh (armada 30 truk + 12 HD785)
npm run dev            # server (http://localhost:3001) + client (http://localhost:5173)
```
Buka **http://localhost:5173**. Perintah lain:
```bash
npm run test           # unit test domain + service (mengunci kebenaran model §12)
npm run typecheck      # TypeScript strict, 3 workspace
npm run build          # build produksi client + cek tipe server
```

## Arsitektur
TypeScript full-stack, npm workspaces:
- **`shared/`** — otak domain murni (tipe, skema Zod, rumus PRD §12, format Rupiah) + Vitest. Dipakai server **dan** client (satu sumber perhitungan).
- **`server/`** — Fastify + Prisma + SQLite. Endpoint import (papaparse/SheetJS), analitik tire/payload, finansial, data. Logika murni terpisah dari Prisma (mudah diuji).
- **`client/`** — React + Vite + Tailwind + Recharts + TanStack Query. 8 layar (sidebar).

## Layar
| Layar | Modul | Isi |
|---|---|---|
| Dashboard | Inti | KPI gabungan: biaya terhindarkan, penghematan, payback, ROI + ringkasan modul + **Unduh Laporan PDF/CSV** |
| Tire — Daftar & Prediksi | A | Tabel unit: sisa umur + interval + keyakinan + status; klik → detail (riwayat ban, atribusi penyebab, koefisien model) |
| Tire — Rekomendasi | A | Tindakan prioritas + estimasi penghematan |
| Payload — Analitik | B | Distribusi vs 91 t, %under/ok/over, tren, filter unit/operator, kaitan overload |
| Loading Guidance | B | Generator policy (pass/band) + simulasi bucket → indikator hijau/kuning/merah |
| Calibration Health | B | Status drift PLM HD785 (offset/usia) |
| Finansial & ROI | Inti | Asumsi editable (tersimpan DB) → hasil live + skenario armada |
| Data / Import | Inti | Unggah CSV/XLSX per entity + validasi per-baris + inventaris |

## Mengganti dengan data riil KPP (tanpa ubah kode)
Buka layar **Data / Import**, pilih jenis data, unggah `.csv`/`.xlsx`. Validasi per-baris: baris rusak dilaporkan, baris valid tetap disimpan; impor ulang dengan `id` sama = **upsert**. Pemetaan unit ditegakkan (impor ban menolak HD785, impor payload menolak truk jalan). Contoh siap-pakai ada di **`server/sample-data/`**.

**Kolom per entity** (wajib; `[opsional]`):
| Entity | Kolom |
|---|---|
| `units` | id · category (`haul_truck`\|`pit_dumper`) · model · tareKg · ratedPayloadKg · tiresCount · [tireModel] · [tirePriceIdr] · [kmPerYear] |
| `operators` | id · name · shift (`day`\|`night`) |
| `segments` | id · name · surface (`laterite`\|`rock`\|`sealed`) · lengthKm · conditionScore (0–1) · avgSpeedLoadedKmh · avgSpeedEmptyKmh |
| `tires` | id · unitId (haul_truck) · position · installDate · [removalDate] · [kmAtRemoval] · [avgPressureDeviationPct] · [loadIndex] · removalReason (`worn`\|`cut`\|`overload`\|`scheduled`) · costIdr |
| `payload` | id · unitId (HD785) · operatorId · timestamp · measuredPayloadKg · targetPayloadKg *(status dihitung)* |
| `calibration` | id · unitId (HD785) · lastCalibrationDate · scaleStudyOffsetPct |

Asumsi finansial (harga ban, capture rate, armada, dll.) editable di layar **Finansial & ROI** — default bertanda **ASUMSI**, tombol "Reset ke default" tersedia.

## Definition of Done (CLAUDE.md)
- [x] Semua FR "Must" lulus acceptance criteria PRD §8 (engine §12 + unit test penjaga).
- [x] `client` & `server` jalan via satu perintah (`npm run dev`).
- [x] Import dataset contoh sukses & hasil cocok unit test domain.
- [x] Prediksi & analitik tampil akurat (sisa umur ban, distribusi payload, finansial konsisten lintas layar).
- [x] README + cara ganti data riil terisi.

## Catatan jujur
- **Asumsi**: lever payload (underload/overload, faktor keausan) default **0** sampai diisi — agar ROI tidak dibesar-besarkan. `currentKm` ban & spec excavator/densitas = heuristik/asumsi bertanda, bukan data KPP terverifikasi (PRD §16).
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
| `docs/IMPLEMENTATION_PLAN.md` | Urutan kerja M1–M8 |
| `docs/BRD.md` · `docs/VIBECODING_GUIDE.md` | Bisnis · cara mengarahkan agen |
