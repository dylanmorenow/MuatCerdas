# VIBECODING_GUIDE — Membangun MuatCerdas dengan Claude Code

Panduan praktis mengubah dokumen di repo ini menjadi **aplikasi full-stack yang benar-benar berfungsi** memakai Claude Code.

> **Jujurnya soal "vibecoding".** Anda mengarahkan agen dengan bahasa natural, tetapi **Anda tetap pemilik kodenya**: tinjau diff, jalankan, uji. Target proyek ini bukan demo — ini app sungguhan. Karena itu kualitas, kebenaran model, dan "Anda paham cara kerjanya" jauh lebih penting daripada sekadar terlihat jadi.

## 0. Kenapa repo ini optimal untuk Claude Code
- **`CLAUDE.md`** dibaca otomatis tiap sesi (hukum tertinggi) dan meng-`@import` PRD/SRS/TECH_DESIGN/PLAN → agen langsung punya konteks penuh.
- Dokumen terpisah per peran (BRD=kenapa, PRD=apa, SRS=requirement, TECH_DESIGN=bagaimana, PLAN=urutan), tanpa tumpang tindih.
- Aturan keras sudah tertanam: **tanpa Pareto**, **ban=truk jalan / payload=HD785**, **app nyata**, **tanpa fitur tak perlu**.

## 1. Persiapan
1. Install Claude Code CLI (butuh Node ≥18): `npm install -g @anthropic-ai/claude-code`, cek `claude --version`.
2. Di VS Code: install extension resmi **Claude Code** (publisher: anthropic).
3. **File > Open Folder** → buka folder `muatcerdas/` sebagai root (agar `CLAUDE.md` + `@import` terbaca). Pastikan `.claude/` & `docs/` ikut terbawa saat download.
4. Buka panel Claude Code (ikon Spark) & login. `git init` + commit awal (untuk checkpoint).

## 2. Loop kerja: Jelajah → Rencana → Bangun → Uji → Commit
1. **Align (sekali di awal):**
   > "Baca CLAUDE.md dan seluruh docs. Ringkas dalam 8 poin: apa yang dibangun, dua modul & pemetaan unitnya, aturan emas (termasuk tanpa Pareto), dan urutan milestone. Jangan tulis kode dulu."
   Pastikan ringkasannya benar — terutama bahwa **ban = truk jalan (Scania/Volvo)** dan **payload = HD785**, serta **tanpa Pareto**.
2. **Rencana (tiap milestone, pakai plan mode):**
   > "Ambil M1 dari docs/IMPLEMENTATION_PLAN.md. Buat rencana langkah + daftar file. Jangan koding sampai saya setujui."
3. **Bangun:** setujui → kerjakan sesuai TECH_DESIGN → centang task di PLAN.
4. **Uji:** `npm run test` (kunci sanity PRD §8) dan `npm run dev`; buka sendiri di browser.
5. **Commit & `/clear`** sebelum milestone berikutnya (jaga konteks bersih).

## 3. Resep prompt (khusus proyek ini)
- **Mulai milestone:** `Kerjakan milestone berikutnya yang belum dicentang di docs/IMPLEMENTATION_PLAN.md. Rencanakan dulu, tunggu approve.` (atau slash command `/build-next`).
- **Jaga scope:** `Stop — ini di luar PRD §7 / melanggar aturan emas CLAUDE.md. Batalkan, kembali ke task M-x.`
- **Cegah Pareto/fitur tak perlu:** `Jangan tambahkan Pareto atau fitur di luar PRD §7. Kalau menurutmu perlu, tanya dulu.`
- **Jaga pemetaan unit:** `Pastikan modul ban hanya memproses haul_truck (Scania/Volvo) dan modul payload hanya HD785; tolak yang tertukar (SR-V3).`
- **Kunci kebenaran model:** `Sebelum lanjut, tulis unit test untuk shared/ yang memverifikasi angka PRD §8. Pastikan hijau.`
- **App nyata, bukan mock:** `Implementasikan benar lewat server+DB+shared; jangan hardcode hasil/mock.`

## 4. Tips berpengaruh
- `CLAUDE.md` ringkas & spesifik = lebih dipatuhi. Tambah aturan cepat dgn mengetik `#` saat sesi; pindahkan yang permanen ke `CLAUDE.md`.
- Satu milestone satu fokus; `/clear` di antaranya.
- Minta rencana sebelum perubahan besar (plan mode mengurangi salah arah).
- Commit sering; manfaatkan checkpoint extension untuk mundur.
- **Selalu jalankan & klik sendiri** tiap layar; jangan percaya "sudah jadi".

## 5. Jebakan & solusi
| Jebakan | Tanda | Solusi |
|---|---|---|
| Pareto/fitur ekstra menyusup | muncul chart 80-20 / fitur tak diminta | Tunjuk aturan emas #3/#4; suruh hapus |
| Unit tertukar | HD785 di analitik ban / sebaliknya | Tegakkan SR-V3; minta perbaiki |
| Jadi mock, bukan nyata | hasil hardcoded | Minta lewat server+DB+shared + test |
| Model melenceng | angka beda dari PRD §8 | Unit test sebagai penjaga |
| Over-engineering | microservice/RBAC/multi-tenant | "MVP-real, bukan enterprise; tetap di TECH_DESIGN" |
| Konteks penuh | jawaban makin ngawur | `/clear`, lanjut dari PLAN |

## 6. Dokumentasi resmi (verifikasi versi terbaru)
- Claude Code: https://docs.claude.com/en/docs/claude-code/overview
- Memory & CLAUDE.md: https://docs.anthropic.com/en/docs/claude-code/memory
- npm: https://www.npmjs.com/package/@anthropic-ai/claude-code
