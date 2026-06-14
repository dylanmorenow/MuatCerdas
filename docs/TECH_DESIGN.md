# TECH_DESIGN-0002: MuatCerdas — Technical Design

**Author:** Tim Astranauts · **Date:** 2026-06-14 · **Status:** Draft
**Terkait:** PRD §10–§13 (sumber kebenaran model/rumus = PRD §11–§12), SRS.

> Dokumen "bagaimana". Tempat detail teknis yang tak ada di PRD/SRS. Agen koding membaca ini sebelum menulis kode. Bangun aplikasi nyata berkualitas produksi; tanpa Pareto; tanpa fitur tak perlu.

## 1. Prinsip
- **Full-stack TypeScript** dengan **npm workspaces**: `client`, `server`, `shared`.
- **`shared/` = domain murni** (tipe, skema Zod, model & rumus PRD §12) tanpa dependensi UI/DB — di-unit-test. Inilah "otak" produk; dipakai oleh server (dan boleh oleh client untuk perhitungan ringan/preview).
- **Pemetaan unit ditegakkan di tipe & query** (SR-V3): Modul A → `haul_truck`, Modul B → `pit_dumper`.
- **Batas integrasi**: semua data masuk lewat lapisan import/`server` API → memudahkan menambah sumber (FMS/PLM) kelak tanpa mengubah domain.

## 2. Tech Stack
| Lapisan | Pilihan | Alasan |
|---|---|---|
| Bahasa | TypeScript `strict` (semua workspace) | aman untuk logika finansial & model |
| Monorepo | npm workspaces | ringan, tanpa tooling berat |
| client | React 18 + Vite | standar, cepat |
| UI | Tailwind CSS (aksen hijau KPP + biru) | konsisten |
| Data fetch | TanStack Query | caching/loading state real-app |
| Chart | Recharts | distribusi, tren, bar |
| server | Fastify | ringan, cepat, TS-first |
| ORM/DB | Prisma + SQLite (dev) → Postgres-ready | nyata & mudah dijalankan |
| Validasi | Zod (dipakai bersama client/server lewat `shared`) | satu sumber skema |
| Import | papaparse (CSV) + SheetJS/xlsx (XLSX) | parsing nyata |
| Regresi | `ml-regression-multivariate-linear` atau normal equations manual | model §12.1 transparan |
| Laporan | pembuatan PDF (mis. pdfmake) / ekspor CSV | FR-0002-15 |
| Test | Vitest (domain + API) | korektness |
| Auth (opsional) | session/JWT sederhana, satu org | tipis, dapat dimatikan |

## 3. Struktur Repo (target)
```
muatcerdas/
├─ package.json            # workspaces: client, server, shared
├─ CLAUDE.md  README.md  docs/  .claude/commands/
├─ shared/
│  └─ src/
│     ├─ types.ts              # entitas PRD §11
│     ├─ schemas.ts            # Zod (validasi import & API)
│     ├─ assumptions.ts        # CostParams default (bertanda ASUMSI)
│     ├─ format.ts             # Rupiah/angka Indonesia
│     ├─ tire/predict.ts       # §12.1 regresi + fallback
│     ├─ tire/attribution.ts   # §12.2
│     ├─ tire/finance.ts       # §12.7
│     ├─ payload/analytics.ts  # §12.3
│     ├─ payload/wear.ts       # §12.4
│     ├─ payload/guidance.ts   # §12.5
│     ├─ payload/calibration.ts# §12.6
│     ├─ finance/roi.ts        # §12.8–§12.9
│     └─ __tests__/            # Vitest, sanity PRD §8
├─ server/
│  └─ src/
│     ├─ index.ts              # Fastify bootstrap
│     ├─ prisma/schema.prisma  # mirror entitas §11
│     ├─ routes/{units,tires,payload,finance,import,reports,auth}.ts
│     ├─ services/             # panggil shared, query Prisma
│     └─ seed.ts               # dataset contoh realistis (mapping unit benar)
└─ client/
   └─ src/
      ├─ main.tsx App.tsx
      ├─ api/                  # hooks TanStack Query ke server
      ├─ components/           # KPI card, tabel, chart, indikator
      └─ pages/                # Dashboard, TireList, TireRecs, PayloadAnalytics,
                               # LoadingGuidance, Calibration, Finance, DataImport, Login
```

## 4. Tipe & Skema
Implementasikan entitas PRD §11 di `shared/types.ts`; skema Zod di `shared/schemas.ts` (dipakai untuk validasi import & body API); mirror ke `prisma/schema.prisma`. Tegakkan enum `category` & relasi.

## 5. Engine (canonical: PRD §12) — fungsi murni di `shared/`
Saran signature:
```ts
// tire/predict.ts (§12.1)
fitTireModel(records: TireTrainingRow[]): TireModel            // β + diagnostics
predictRemainingLife(unit: Unit, history, model): { predictedLifeKm; remainingLifeKm; confidence; usedFallback }
// tire/attribution.ts (§12.2)
attributeWear(unit, history, model): { factor: string; contribution: number }[]
// tire/finance.ts (§12.7)
tireAvoidableCost(p: CostParams): { avoidableTires; avoidableCostPerUnit; capturedPerUnit; fleetCaptured }
// payload/analytics.ts (§12.3)
payloadStats(events: PayloadEvent[], groupBy?): { underPct; okPct; overPct; mean; stdev; byGroup }
// payload/wear.ts (§12.4)
overloadWearCost(events, p): { byUnit: {unitId; overloadRate; costIdr}[]; total }
// payload/guidance.ts (§12.5)
loadingStatus(totalKg, targetKg): "green"|"amber"|"red"
// payload/calibration.ts (§12.6)
needsCalibration(rec, today): boolean
// finance/roi.ts (§12.8–§12.9)
roi(annualSavings, p): { paybackMonths; roiYear1 }
```
**Wajib** unit test mengunci sanity PRD §8 (default → capturedPerUnit≈Rp53,8jt; fleet30≈Rp1,62M; payback≈3,7 bln). Test menjaga kebenaran model.

## 6. Seed Data (realistis, BUKAN sekadar dummy)
- Modul A: ±beberapa puluh truk hauling (Scania P410/R580, Volvo FH16, Scania 620 XT) dgn riwayat ban (km, tekanan, kondisi rute) yang memberi variasi umur masuk akal (rentang sesuai data merek: mis. 60.000–120.000 km).
- Modul B: HD785 + payload events terhadap target 91 t dgn campuran under/ok/over realistis; korelasi overload→keausan.
- Operator & RoadSegment laterit konsisten. **Deterministik (seed tetap)** agar reproducible. **Jangan menaruh HD785 di data ban truk jalan** atau sebaliknya.

## 7. Pengujian
- Vitest untuk seluruh `shared/` (model §12 + status payload SR-V1 + roi).
- Integration test server: import valid/invalid (SR-V2), endpoint analitik/finansial mengembalikan angka yang cocok domain.
- Smoke manual sesuai acceptance PRD §8.

## 8. Persistence & State
- Sumber kebenaran data: DB (Prisma/SQLite). `CostParams` disimpan di DB (atau tabel settings) + dapat diedit di UI; perubahan memicu recompute via API.
- Client memakai TanStack Query (cache + invalidation saat data/asumsi berubah).

## 9. Batas Integrasi (untuk masa depan, JANGAN diimplementasi live sekarang)
- Definisikan `ImportSource` interface di `server` (CSV/XLSX sekarang; FMS/PLM nanti). Endpoint `/import` menerima berkas; arsitektur memungkinkan menambah adapter telematik tanpa menyentuh `shared/`. Jangan membuat koneksi/poll telematik palsu.

## 10. Build & Run
```
npm install                 # root (workspaces)
npm run db:setup            # prisma migrate + seed
npm run dev                 # menjalankan server + client (concurrently)
npm run test                # unit + integration
npm run build               # build client & server
```

## 11. Pedoman UI
- Sidebar 8–9 layar (PRD §13). Header: nama produk + tagline.
- Semua angka via `shared/format.ts`. Komponen chart tipis (bungkus Recharts). Status pakai hijau/kuning/merah konsisten.
- Ikuti skill `frontend-design` saat membangun komponen (bila tersedia di lingkungan Claude Code Anda).
