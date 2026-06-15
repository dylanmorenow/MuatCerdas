# MODULE_C_SPEED — Speed Optimization (berbasis TKPH)

**Author:** Tim Astranauts · **Status:** Draft (tambahan untuk sistem yang sudah ada s/d M8)
**Terkait:** `docs/PRD.md` (Modul A & B), `docs/TECH_DESIGN.md`, `docs/ASSUMPTIONS.md`
**Cara pakai:** taruh file ini di `docs/`, tambahkan baris `@docs/MODULE_C_SPEED.md` ke `CLAUDE.md`, lalu kerjakan sebagai **M9** mengikuti `IMPLEMENTATION_PLAN`.

> Modul C menyatukan Modul A (umur ban) & Modul B (payload): menghitung **kecepatan aman maksimum** tiap unit dari berat muatan & batas ban (TKPH), lalu menyeimbangkannya dengan **target produksi harian & cycle time**, dan **jujur melaporkan bila target tak tercapai tanpa melanggar batas ban**. Ini perhitungan **deterministik (TKPH + optimasi)**, BUKAN AI/black-box. Bekerja atas data import/contoh; **jangan palsukan feed live dari truk**.

## 1. Konteks & Dasar Ilmiah
TKPH (Tonne-Kilometre Per Hour) adalah standar industri ban tambang (Bridgestone menyebutnya TMPH). Tiap tipe ban punya **TKPH maksimum** dari katalog pabrik. Selama beban kerja aktual ≤ batas itu, suhu ban terkendali & umur normal; bila dilampaui ban memanas → karet rusak → gagal dini. Beban kerja ban = **berat yang ditanggung × kecepatan rata-rata** — maka muatan lebih berat ⇒ batas kecepatan aman turun. Inilah dasar fitur "dengan muatan X, kecepatan maks Y".

**Posisi jujur untuk presentasi:** ini **penerapan prinsip TKPH** (yang biasanya dihitung manual sesekali) menjadi perhitungan per-unit yang terintegrasi dengan umur ban & target produksi — bukan menemukan fisika baru, dan bukan "AI". Itu kekuatannya: defensible.

## 2. Tujuan
- Menghitung kecepatan aman maksimum tiap unit berdasarkan muatan & batas TKPH ban.
- Menghitung kecepatan yang dibutuhkan untuk mengejar target produksi harian (via cycle time).
- Menyeimbangkan keduanya & melaporkan keputusan jujur (aman / konflik + opsi solusi).
- Mengaitkan hasil ke prediksi umur ban (Modul A) — loop terpadu.

## 3. Rumus (implementasi di `shared/speed/`)
> Semua angka katalog/kondisi = input editable, ditandai ASUMSI sampai data riil masuk (lihat `docs/ASSUMPTIONS.md`).

**§C.1 TKPH aktual (site):**

```
Qa = (TKL + TKE) / 2          // beban ban kritis: rata-rata saat bermuatan (TKL) & kosong (TKE), per posisi terberat
Vm = jarakPerShiftKm / jamKerjaPerShift   // kecepatan kerja RATA-RATA (termasuk waktu berhenti/loading)
TKPH_site = Qa * Vm
```

**§C.2 TKPH maksimum ban (dari katalog, dikoreksi):**

```
TKPH_ban = TKPH_katalog * faktorKoreksiSuhu * faktorKoreksiSitus
```

**§C.3 Kecepatan aman maksimum (jawaban ke driver):**

```
Vmax_safe = TKPH_ban / Qa_current
```

Qa_current naik bila overload ⇒ Vmax_safe turun. Untuk panduan per perjalanan, ambil berat muatan unit itu dari Modul B (payload) → hitung Qa_current → Vmax_safe.

**§C.4 Kecepatan yang dibutuhkan untuk target produksi:**

```
tripsPerHari        = targetProduksiHarianTon / payloadPerUnitTon
tripsPerUnitPerHari = tripsPerHari / jumlahUnit
cycleTimeTersedia   = jamKerjaEfektifPerHari / tripsPerUnitPerHari
travelTimeTersedia  = cycleTimeTersedia - waktuTetap (loading+dumping+manuver+antri)
V_required(travel)  = (2 * jarakSatuArahKm) / travelTimeTersedia
```

**§C.5 PENTING — rekonsiliasi satuan kecepatan (jangan sampai keliru):**
Vm di §C.1 adalah **kecepatan kerja rata-rata** (termasuk berhenti), sedangkan V_required §C.4 adalah **kecepatan travel** (saat bergerak). Keduanya tidak boleh dibandingkan mentah. Konversikan ke basis yang sama sebelum keputusan §C.6 (mis. ubah V_required(travel) → kecepatan kerja rata-rata ekuivalen memakai rasio waktu travel terhadap total cycle, atau ubah Vmax_safe ke basis travel). Implementasi harus eksplisit memilih satu basis & mendokumentasikannya. (Ini titik yang membuat model jujur & benar — jangan dilewati.)

**§C.6 Logika keputusan (jantung modul):** bandingkan `V_required` vs `Vmax_safe` pada basis yang sama:
- `V_required ≤ Vmax_safe` → ✅ AMAN. Rekomendasi: jalankan pada V_required (atau sedikit di bawah Vmax_safe). Target tercapai & ban awet.
- `V_required > Vmax_safe` → ⚠️ KONFLIK. JANGAN sarankan ngebut. Laporkan: target hanya tercapai dengan melanggar batas ban, beserta opsi: (a) tambah N unit, (b) turunkan target ke level aman, (c) kurangi overload agar Vmax_safe naik, (d) perbaiki jalan agar waktuTetap/travel turun. Hitung & tampilkan dampak tiap opsi bila memungkinkan.

## 4. Functional Requirements
| ID | Requirement | Prio |
|----|-------------|------|
| FR-0003-1 | Hitung TKPH_site & TKPH_ban per unit (§C.1–§C.2) dari berat (Modul B) + katalog editable | Must |
| FR-0003-2 | Hitung Vmax_safe per unit dari muatan saat ini (§C.3); turun otomatis saat overload | Must |
| FR-0003-3 | Hitung V_required dari target produksi & cycle time (§C.4) dgn rekonsiliasi satuan (§C.5) | Must |
| FR-0003-4 | Logika keputusan AMAN/KONFLIK + opsi solusi terukur (§C.6) | Must |
| FR-0003-5 | Tampilan panduan per-unit untuk driver: kecepatan maks + alasan (mis. "muatan 104t>91t → maks 28 km/jam") | Should |
| FR-0003-6 | Umpan balik ke Modul A: kecepatan/over-TKPH memengaruhi prediksi umur ban | Should |
| FR-0003-7 | Semua parameter TKPH/kondisi/jam kerja editable & bertanda ASUMSI | Must |

## 5. Acceptance Criteria
| # | Criteria |
|---|----------|
| 1 | Given muatan unit dinaikkan (overload), then Vmax_safe (§C.3) turun |
| 2 | Given target produksi dinaikkan, then V_required (§C.4) naik |
| 3 | Given V_required ≤ Vmax_safe, then status AMAN + rekomendasi kecepatan |
| 4 | Given V_required > Vmax_safe, then status KONFLIK + minimal satu opsi solusi terukur (mis. "tambah 2 unit" atau "turunkan target jadi X ton/hari") |
| 5 | Given basis kecepatan, then unit test memverifikasi rekonsiliasi §C.5 (tak ada perbandingan apel-jeruk) |

## 6. Layar
- **Speed Optimization:** per unit → muatan, Qa, TKPH_site vs TKPH_ban, Vmax_safe; panel target produksi → V_required; banner keputusan AMAN/KONFLIK + opsi. Panel "panduan driver" (kecepatan maks + alasan). Semua input katalog/kondisi editable.

## 7. Integrasi & Batas
- File: `shared/speed/tkph.ts` (§C.1–§C.3), `shared/speed/productionSpeed.ts` (§C.4–§C.5), `shared/speed/decision.ts` (§C.6) + endpoint server + layar client. **Jangan ubah logika Modul A/B yang sudah teruji.**
- Pakai berat dari Modul B; salurkan hasil ke prediksi Modul A.
- **Batas jujur:** bekerja atas data import/contoh. Tampilan "ke driver" adalah keluaran sistem atas data yang di-feed, BUKAN perangkat live di kabin. Arsitektur menyediakan tempat untuk feed live di masa depan; jangan dipalsukan.

## 8. Milestone M9 (tambahkan ke IMPLEMENTATION_PLAN)
- [ ] `shared/speed/*` (§C.1–§C.6) + unit test (AC #1–#5, termasuk rekonsiliasi §C.5).
- [ ] Endpoint server Modul C (pakai data Modul B; salur ke Modul A).
- [ ] Layar **Speed Optimization** (client).
- [ ] Parameter TKPH/kondisi/jam kerja sebagai asumsi editable (sinkron `docs/ASSUMPTIONS.md`).
- [ ] Commit setelah test hijau. JANGAN sentuh logika Modul A/B.
