# MuatCerdas — Tire & Payload Intelligence Platform (KPP Mining)

Aplikasi web **full-stack yang benar-benar berfungsi** untuk mengubah data armada KPP menjadi keputusan biaya. Dua modul memetakan dua case lomba Astranauts:

- **Modul A — Tire Life Intelligence (Case 1):** truk hauling jalan **Scania P410, Scania R580, Volvo FH16 6x4T, Scania 620 XT** di rute laterit CPP KM 33 → Jetty. Prediksi sisa umur ban, atribusi penyebab keausan, rekomendasi tindakan, biaya.
- **Modul B — Payload Optimization (Case 2):** dump truck in-pit **HD785** (dimuat PC2000/PC1250/PC850). Analitik payload vs target 91 t, over/underload, kaitan ke keausan, kepercayaan kalibrasi, panduan pemuatan.
- **Inti:** import data nyata, mesin finansial (biaya terhindarkan + ROI), dashboard & laporan.

> **Bukan demo/mock, dan bukan Pareto.** Bekerja atas data yang di-import (CSV/XLSX) atau dataset contoh bawaan. Integrasi telematik/PLM/FMS **live** = pekerjaan masa depan (ada batas integrasi di arsitektur), **tidak dipalsukan**.

## Tagline
> "KPP sudah punya datanya. MuatCerdas mengubahnya jadi keputusan: memprediksi & memperpanjang umur ban truk hauling, dan menjaga payload HD785 tepat di target — lalu menerjemahkannya ke Rupiah."

## Peta Dokumen
| File | Isi | Untuk |
|---|---|---|
| `CLAUDE.md` | Aturan & konteks agen (auto-loaded) | Claude Code |
| `docs/BRD.md` | Kenapa: bisnis, nilai, kompetisi, risiko | Manajemen/tim |
| `docs/PRD.md` | Apa: user story, FR, AC, model & rumus §12 | Tim & agen |
| `docs/SRS.md` | Requirement perangkat lunak formal | Agen & QA |
| `docs/TECH_DESIGN.md` | Bagaimana: arsitektur full-stack, engine, batas integrasi | Agen |
| `docs/IMPLEMENTATION_PLAN.md` | Urutan kerja M1–M8 | Agen |
| `docs/VIBECODING_GUIDE.md` | Cara mengarahkan Claude Code | Tim |

## Tech (ringkas)
TypeScript full-stack, npm workspaces: **client** (React+Vite+Tailwind+Recharts+TanStack Query) · **server** (Fastify+Prisma+SQLite, Zod, papaparse+SheetJS) · **shared** (domain murni + Vitest). Node ≥ 18.

## Mulai membangun
1. Buka folder ini sebagai root di VS Code, jalankan `claude`.
2. Ikuti `docs/VIBECODING_GUIDE.md` (Jelajah → Rencana → Bangun → Uji → Commit).
3. Agen mengerjakan `docs/IMPLEMENTATION_PLAN.md` milestone demi milestone.

## Menjalankan app (setelah dibangun)
```
npm install
npm run db:setup     # prisma migrate + seed dataset contoh
npm run dev          # server + client
npm run test         # unit + integration (mengunci kebenaran model)
```

## Mengganti dengan data riil KPP
Import CSV/XLSX lewat layar **Data/Import**; semua asumsi finansial editable di layar **Finansial & ROI** (default = ASUMSI). Tidak perlu ubah kode.

## Catatan jujur
- Verifikasi **Open Question #1** (apakah KPP sudah pakai FMS penuh) sebelum final — lihat `docs/BRD.md` §8 / `docs/PRD.md` §16.
- "MuatCerdas" masih placeholder.
