# IMPLEMENTATION_PLAN — MuatCerdas

**Cara pakai (Claude Code):** kerjakan **satu milestone sekali jalan**, urut. Tiap milestone: rencanakan singkat → koding → jalankan test → centang `[x]` → commit → lanjut. Patuhi `CLAUDE.md`. Acuan: PRD (FR/AC §7–§8, model §11–§12), SRS, TECH_DESIGN.

**Ingat:** tanpa Pareto · ban = truk jalan (Scania/Volvo) · payload = HD785 · jangan tambah fitur di luar PRD §7 · app harus benar-benar berfungsi.

---

## M1 — Fondasi workspace
- [x] Setup npm workspaces: `shared`, `server`, `client`; TypeScript `strict` di semua.
- [x] `shared`: `types.ts` (PRD §11), `schemas.ts` (Zod), `assumptions.ts` (CostParams default §12, bertanda ASUMSI), `format.ts` (Rupiah Indonesia).
- [x] `server`: Fastify bootstrap + Prisma + SQLite; `schema.prisma` mirror §11; perintah `db:setup`.
- [x] Perintah root: `dev` (server+client concurrently), `test`, `build`.
- [x] Verifikasi server hidup & client kosong tampil.

## M2 — Domain/model + test (INTI)  ·  PRD §12, SR-4/5/7/8/12/13
- [x] `tire/predict.ts` (§12.1 regresi + fallback), `tire/attribution.ts` (§12.2), `tire/finance.ts` (§12.7).
- [x] `payload/analytics.ts` (§12.3), `payload/wear.ts` (§12.4), `payload/guidance.ts` (§12.5), `payload/calibration.ts` (§12.6).
- [x] `finance/roi.ts` (§12.8–§12.9).
- [x] **Unit test** mengunci sanity PRD §8 (capturedPerUnit≈Rp53,8jt; fleet30≈Rp1,62M; payback≈3,7 bln; status under/ok/over SR-V1). `npm run test` hijau.

## M3 — Seed data realistis + ingest  ·  FR-0002-1/2, SR-1/2/V2/V3
- [x] `server/seed.ts`: dataset realistis — truk hauling (Scania/Volvo) utk Modul A; HD785 utk Modul B; operator & segmen laterit; deterministik. **Pemetaan unit benar.**
- [x] Endpoint `/import` CSV/XLSX (papaparse + SheetJS) dgn validasi Zod & error per-baris; tegakkan SR-V3 (tolak unit salah-modul).
- [x] Verifikasi AC FR-0002-1/2.

## M4 — Modul A (Tire) end-to-end  ·  FR-0002-3/4/5/6
- [ ] Endpoint server: registry ban, prediksi, atribusi, rekomendasi (panggil `shared`).
- [ ] Client: **Tire — Daftar & Prediksi** (tabel + detail per unit: riwayat, sisa umur+keyakinan, atribusi penyebab) & **Tire — Rekomendasi** (+ estimasi penghematan).
- [ ] Verifikasi AC FR-0002-4/5.

## M5 — Modul B (Payload) end-to-end  ·  FR-0002-7/8/9/10/11
- [ ] Endpoint: analitik payload, kaitan overload→keausan, kalibrasi, loading policy.
- [ ] Client: **Payload — Analitik** (distribusi vs 91 t, %under/ok/over, statistik, filter, tren, panel kaitan keausan), **Loading Guidance** (ambang + indikator hijau/kuning/merah + policy), **Calibration Health**.
- [ ] Verifikasi AC FR-0002-7/10.

## M6 — Finansial, ROI & Dashboard  ·  FR-0002-12/13/14
- [ ] Client **Finansial & ROI**: asumsi editable (disimpan DB), hasil live, skenario armada.
- [ ] **Dashboard** KPI gabungan (biaya terhindarkan, penghematan, payback, ROI) + ringkasan tiap modul.
- [ ] Verifikasi AC FR-0002-12/13.

## M7 — Laporan, Data/Import UI, polish  ·  FR-0002-15, NFR
- [ ] Layar **Data/Import** (unggah, validasi, kelola unit/operator/rute).
- [ ] Ekspor laporan (PDF/CSV).
- [ ] Tooltip glosarium (PRD §15), format angka Indonesia, responsif, validasi tahan-banting.
- [ ] README: cara jalan + cara ganti data riil + screenshot. Cek Definition of Done (CLAUDE.md).

## M8 — (Opsional) Auth tipis  ·  FR-0002-16
- [ ] Login satu organisasi (session/JWT), dapat dinonaktifkan via env untuk demo.

---

### Catatan jujur (untuk presentasi)
- App **benar-benar berfungsi atas data import/contoh**; integrasi telematik live = pekerjaan masa depan (PRD §1, TECH_DESIGN §9) — jangan diklaim sudah ada.
- Verifikasi **Open Question #1** (FMS KPP, PRD §16) sebelum final.
