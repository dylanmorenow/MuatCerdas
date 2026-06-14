---
description: Kerjakan milestone/tugas berikutnya yang belum selesai di IMPLEMENTATION_PLAN
---

Baca `docs/IMPLEMENTATION_PLAN.md` dan patuhi `CLAUDE.md`.

1. Identifikasi **milestone teratas yang belum selesai** (masih ada `[ ]`).
2. Buat **rencana singkat** (langkah + daftar file), lalu **berhenti & tunggu persetujuan saya**. Jangan koding sebelum disetujui.
3. Setelah disetujui: kerjakan tugas milestone itu sesuai `docs/TECH_DESIGN.md` & `docs/SRS.md`. Implementasikan **nyata** (server+DB+shared), jangan mock.
4. Jalankan `npm run test` (dan `npm run dev` bila relevan); pastikan sanity `docs/PRD.md` §8 lolos. Perbaiki bila gagal.
5. Centang `[x]` task selesai di `docs/IMPLEMENTATION_PLAN.md`, ringkas perubahan, sarankan pesan commit, lalu berhenti.

Aturan keras: **tanpa Pareto** · **ban=truk jalan (Scania/Volvo), payload=HD785** (jangan tertukar) · **jangan tambah fitur di luar PRD §7** · jangan loncat milestone · jangan palsukan integrasi live.
