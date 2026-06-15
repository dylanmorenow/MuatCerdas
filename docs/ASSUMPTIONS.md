# ASSUMPTIONS — Daftar Asumsi yang Perlu Data Riil

**Untuk:** Tim Astranauts. **Tujuan:** semua angka di program ini sekarang memakai **asumsi/placeholder**. Dokumen ini mendaftarkan **apa saja yang harus dicari datanya**, dari mana, dan seberapa kritis — supaya saat data riil didapat, Anda tinggal mengganti nilainya (di UI atau `shared/assumptions.ts`) tanpa ubah kode.

## Cara baca kolom
- **Placeholder:** nilai sementara yang dipakai sekarang.
- **Lokasi:** tempat mengganti (UI / file).
- **Sumber data riil:** dari mana mendapatkannya.
- **Tipe:** `FAKTA?` (sebenarnya fakta, tinggal verifikasi) · `KPP` (hanya KPP yang punya) · `PUBLIK` (katalog/spesifikasi pabrik) · `ESTIMASI` (tak bisa "dicari", divalidasi lewat pilot).
- **Kritis:** 🔴 sangat (gampang dipatahkan juri bila salah) · 🟡 sedang · ⚪ rendah.

---

## A. Finansial inti (CostParams) — `shared/assumptions.ts` / layar Finansial & ROI
| Parameter | Placeholder | Sumber data riil | Tipe | Kritis |
|---|---|---|---|---|
| `tirePriceIdr` (ban truk hauling) | Rp20 jt | Quote supplier / procurement KPP (Bridgestone/Michelin/Pirelli per ukuran) | KPP/PUBLIK | 🔴 |
| `tiresPerUnit` | 10 | Konfigurasi truk (6×4 = 10 ban) — **verifikasi tiap model** | FAKTA? | 🟡 |
| `kmPerYear` (per truk) | 100.000 | Log odometer/trip armada KPP | KPP | 🔴 |
| `tireLifeActualKm` | 65.000 | Catatan pelepasan ban KPP (umur nyata di laterit) | KPP | 🔴 |
| `tireLifeBestKm` | 100.000 | Spesifikasi pabrik / unit terbaik KPP | PUBLIK/KPP | 🟡 |
| `captureRate` | 0,5 | **Tidak bisa dicari** — estimasi % kerugian yang realistis ditangkap; validasi via pilot | ESTIMASI | 🔴 |
| `fleetSize` (jumlah truk hauling) | 30 | KPP — **konfirmasi arti "54": jumlah truk atau total ban?** | KPP | 🔴 |
| `capexIdr` | Rp500 jt | Estimasi biaya bangun+deploy solusi (tim Anda) | ESTIMASI | 🟡 |
| `opexAnnualIdr` | Rp100 jt | Estimasi biaya operasional tahunan (hosting, maintenance) | ESTIMASI | 🟡 |

## B. Payload HD785 (Modul B) — `shared/assumptions.ts` / import
| Parameter | Placeholder | Sumber data riil | Tipe | Kritis |
|---|---|---|---|---|
| `targetPayloadKg` | 91.000 | Spesifikasi HD785 | FAKTA? | ⚪ |
| HD785 `tareKg` | ±72.000 | Spesifikasi HD785 | FAKTA? | ⚪ |
| `tripsPerYear` (HD785) | placeholder | Data operasi KPP / RKAB | KPP | 🟡 |
| `underloadPct` (rata-rata) | 0,03 | Data PLM HD785 KPP | KPP | 🟡 |
| `fuelCostPerTripIdr` | placeholder | Log bahan bakar KPP | KPP | 🟡 |
| `overloadWearCostFactorIdr` | placeholder | Data biaya maintenance KPP + estimasi teknik | KPP/ESTIMASI | 🔴 |
| Harga & umur ban HD785 | placeholder | Procurement KPP (ban off-highway, beda dari truk jalan) | KPP | 🟡 |
| Ambang status (under<95%, over>110%) | 95% / 110% | Kebijakan KPP (boleh disesuaikan) | KPP | ⚪ |

## C. Prediksi umur ban (Modul A — model)
| Parameter | Placeholder | Sumber data riil | Tipe | Kritis |
|---|---|---|---|---|
| Koefisien regresi (β) | dilatih dari data | **Dipelajari** dari riwayat ban riil — bukan diisi manual; makin banyak data makin akurat | KPP | 🔴 |
| `avgPressureDeviationPct` per record | seed | Log tekanan ban KPP / TPMS | KPP | 🟡 |
| `loadIndex` per record | seed | Turunan dari payload/muatan aktual | KPP | 🟡 |
| `conditionScore` segmen jalan | seed | Survei kondisi jalan KPP | KPP | 🟡 |
| `conditionMultiplier` (fallback heuristik) | estimasi | Estimasi teknik; refine dgn data | ESTIMASI | 🟡 |
| Umur best-practice per merek | dari katalog | Brosur Bridgestone/Michelin/Pirelli per ukuran | PUBLIK | 🟡 |

## D. Rute & operasional
| Parameter | Placeholder | Sumber data riil | Tipe | Kritis |
|---|---|---|---|---|
| Jarak rute CPP KM33 → Jetty | ±35 km | Verifikasi rute bermuatan aktual (bukan estimasi Google) | KPP | 🟡 |
| `conditionScore`, kecepatan loaded/empty per segmen | seed | Survei/telematik KPP | KPP | 🟡 |
| Jam kerja efektif per hari/shift | placeholder | RKAB / jadwal operasi KPP | KPP | 🔴 |
| Waktu tetap (loading/dumping/manuver/antri) | estimasi | Observasi lapangan / studi cycle time | KPP/ESTIMASI | 🟡 |

## E. Target produksi (rantai RKAB) — dipakai Modul C
> Ini rantai asumsi paling panjang & paling bisa dipertanyakan. Idealnya ganti dengan **RKAB site Indexim yang sebenarnya**.
| Parameter | Placeholder | Sumber data riil | Tipe | Kritis |
|---|---|---|---|---|
| RKAB nasional 2026 | 600 vs 700 jt ton | Sumber resmi (ESDM/MODI), bukan screenshot berita | PUBLIK | 🔴 |
| Pangsa Indexim (3,79%) | turunan | **Asumsi turunan — verifikasi/ganti dgn RKAB Indexim langsung** | ESTIMASI | 🔴 |
| Rasio realisasi/target (60%) | turunan | Data historis Indexim | KPP | 🔴 |
| Target produksi harian (ton/hari) | turunan (≈62k–121k) | Hasil rantai di atas; ganti bila ada RKAB riil | turunan | 🔴 |

## F. Modul C — TKPH / kecepatan (BARU)
| Parameter | Placeholder | Sumber data riil | Tipe | Kritis |
|---|---|---|---|---|
| `TKPH_katalog` per tipe ban | **WAJIB DICARI** | Brosur TKPH/TMPH Bridgestone/Michelin sesuai ukuran (13.00R24, 315/80R22.5, 385/65R22.5, 325/95R24) | PUBLIK | 🔴 |
| `faktorKoreksiSuhu` (ambient) | dari tabel | Panduan TKPH pabrik (situs tropis/Kalimantan) | PUBLIK | 🟡 |
| `faktorKoreksiSitus` | dari tabel | Panduan TKPH pabrik | PUBLIK | 🟡 |
| Beban ban kosong (TKE) & bermuatan (TKL) per posisi | turunan | Berat truk + payload + distribusi beban as/poros (spesifikasi truk) | PUBLIK/KPP | 🟡 |
| Kecepatan desain maks truk | dari spesifikasi | Spec sheet Scania/Volvo | PUBLIK | ⚪ |

---

## G. Modul D — Pemetaan Jalan (LIDAR)
| Parameter | Placeholder | Sumber data riil | Tipe | Kritis |
|---|---|---|---|---|
| Cakupan LIDAR (truk mana dipasang) | lead + last | Keputusan operasional KPP | KPP/ESTIMASI | 🟡 |
| Granularitas segmen jalan (jumlah/panjang segmen) | asumsi | Survei rute / desain | ESTIMASI | ⚪ |
| Kategori kondisi jalan & ambang | baik/berlubang/berlumpur/batu tajam | Standar KPP / survei | KPP/ESTIMASI | 🟡 |
| Frekuensi update peta | asumsi | Operasi (berapa sering lead/last lewat) | KPP | ⚪ |

## Prioritas tindakan (kalau waktu terbatas, kejar yang 🔴 dulu)
1. **TKPH katalog ban** (F) — fondasi seluruh Modul C; tanpa ini Modul C tak punya angka nyata.
2. **fleetSize & arti "54"** (A) — penentu skala penghematan; klarifikasi sekarang.
3. **tirePriceIdr, kmPerYear, tireLifeActualKm** (A) — penentu angka headline kerugian ban.
4. **Rantai RKAB / target produksi** (E) — verifikasi dengan RKAB Indexim riil bila bisa.
5. **captureRate** (A) — siapkan pembenaran 50% (estimasi konservatif), bukan angka cari.

## Catatan jujur
- Yang bertipe **ESTIMASI** (captureRate, capex/opex, faktor koreksi, conditionMultiplier) **tidak bisa "dicari" jadi data pasti** — itu asumsi yang divalidasi lewat pilot/justifikasi, bukan angka lookup. Sampaikan ke juri sebagai estimasi konservatif, jangan dibesar-besarkan.
- Yang bertipe **KPP** hanya bisa didapat dari internal KPP — kalau tidak punya, tetap pakai placeholder bertanda jelas, jangan mengarang seolah data nyata.
- Begitu data riil masuk: ganti di layar Finansial/ASUMSI (untuk CostParams) atau import data (untuk record), lalu jalankan ulang `npm run test` agar sanity tetap konsisten.
