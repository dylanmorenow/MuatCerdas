# CLAUDE.md — MuatCerdas (Tire & Payload Intelligence Platform untuk KPP)

> Dibaca otomatis oleh Claude Code tiap sesi. Ini hukum tertinggi proyek; jika konflik dengan prompt biasa, aturan di sini menang. Tetap ringkas & spesifik.

## Apa proyek ini
MuatCerdas adalah **aplikasi web full-stack yang benar-benar berfungsi** (bukan demo/mock) untuk KPP Mining. Ia mengubah data armada menjadi keputusan biaya. Dua modul, memetakan dua case KPP:

- **Modul A — Tire Life Intelligence (Case 1):** untuk **truk hauling jalan** di rute laterit CPP KM 33 → Jetty (±35 km): **Scania P410, Scania R580, Volvo FH16 6x4T, Scania 620 XT**. Memprediksi sisa umur ban, mengaitkan penyebab keausan dini, merekomendasikan tindakan, dan menghitung biaya. **Bukan HD785.**
- **Modul B — Payload Optimization (Case 2):** untuk **dump truck in-pit HD785** (dimuat excavator PC2000/PC1250/PC850). Menganalisis payload vs target 91 ton, deteksi over/underload, kepercayaan kalibrasi, kaitan overload→keausan, dan panduan pemuatan.
- **Inti bersama:** ingest data nyata, mesin finansial (biaya terhindarkan + ROI), dashboard & laporan.

Konteks lengkap di dokumen yang di-import di bawah. Baca PRD & SRS sebelum mulai; TECH_DESIGN sebelum koding.

## Aturan emas (JANGAN dilanggar)
1. **Pemetaan unit harus benar.** Ban = truk jalan (Scania/Volvo). Payload = HD785. Jangan tertukar di kode, seed, maupun UI.
2. **Bangun aplikasi yang benar-benar bekerja**, kualitas produksi: ingest data riil (CSV/XLSX), simpan di database, hitung dengan model nyata, tampilkan hasil yang akurat. Sediakan dataset contoh realistis agar bisa langsung dijalankan.
3. **JANGAN ada Pareto / analisis 80-20** — bukan bagian produk ini.
4. **Jangan bikin fitur yang tidak perlu.** Hanya yang langsung melayani Case 1 & Case 2 + inti bersama. Tidak ada gimmick. Bila ragu sebuah fitur perlu, tanya dulu.
5. **Jangan palsukan integrasi langsung.** App bekerja atas data yang di-import/contoh. Sediakan batas integrasi (import & API) agar SUATU SAAT bisa tersambung ke FMS/PLM, tapi jangan klaim/menyimulasikan koneksi telematik live yang tidak ada.
6. **Logika domain murni & teruji.** Semua perhitungan & model di paket `shared/` (TypeScript murni) dengan unit test. UI/API hanya memanggilnya.
7. **Rencanakan dulu, baru koding.** Untuk perubahan non-trivial, ajukan rencana ringkas & tunggu konfirmasi. Kerjakan mengikuti `docs/IMPLEMENTATION_PLAN.md` (urut), centang task selesai.

## Tech stack (detail: docs/TECH_DESIGN.md)
Full-stack TypeScript, npm workspaces. **client** React 18 + Vite + Tailwind + Recharts + TanStack Query. **server** Fastify + Prisma + SQLite (dev) / Postgres-ready, Zod, papaparse + SheetJS untuk import. **shared** domain murni (tipe, model, rumus) + Vitest. Node ≥ 18.

## Konvensi
- TypeScript `strict`, hindari `any`. Validasi I/O dengan Zod.
- UI **Bahasa Indonesia**; format angka ribuan titik / desimal koma (helper terpusat). Tiap angka berlabel + satuan.
- Model & rumus = sumber kebenaran di `docs/PRD.md` §11–§12; implementasi di `shared/`.
- Commit kecil & sering, pesan jelas. Migrasi DB lewat Prisma.

## Definition of Done
Semua FR "Must" lulus acceptance criteria PRD §8 · `client` & `server` jalan via satu perintah · import dataset contoh sukses & hasil cocok unit test domain · prediksi & analitik tampil akurat · README & cara ganti data terisi.

## JANGAN
Pareto · fitur tak perlu · over-engineering (microservice, RBAC kompleks, multi-tenant) · klaim integrasi live palsu · data nyata KPP yang tidak diverifikasi · tertukar HD785 vs truk jalan.

## Dokumen (di-import otomatis)
@docs/PRD.md
@docs/SRS.md
@docs/TECH_DESIGN.md
@docs/IMPLEMENTATION_PLAN.md
@docs/MODULE_C_SPEED.md
@docs/MODULE_D_DRIVER_AND_MAPPING.md

Pendukung (baca saat relevan): `docs/BRD.md`, `docs/VIBECODING_GUIDE.md`, `README.md`.
