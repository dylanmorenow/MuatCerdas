# MODULE_D_DRIVER_AND_MAPPING — Role-Based Access, Driver Surface & Road Mapping

**Author:** Tim Astranauts · **Status:** Draft (tambahan untuk sistem yang sudah ada; dikerjakan SETELAH Modul C)
**Terkait:** `docs/PRD.md`, `docs/MODULE_C_SPEED.md`, `docs/TECH_DESIGN.md`, `docs/ASSUMPTIONS.md`
**Cara pakai:** taruh di `docs/`, tambah `@docs/MODULE_D_DRIVER_AND_MAPPING.md` ke `CLAUDE.md`, kerjakan sebagai **M10**.

> Menambahkan **dua peran (admin & driver)** lewat login, **antarmuka khusus driver**, dan **prototipe pemetaan kondisi jalan** (konsep LIDAR). Jangan rusak Modul A/B/C yang sudah teruji. **Batas jujur:** peta jalan adalah **prototipe atas data simulasi/contoh** (mewakili keluaran LIDAR); hardware LIDAR & feed live = pekerjaan masa depan dengan batas integrasi — **jangan dipalsukan**.

## 0. Catatan desain (jujur)
Sebelumnya RBAC sengaja di-luar-scope. Kini ada alasan produk nyata: dua tipe pengguna berbeda. Maka cukup **DUA peran** (`admin`, `driver`) — bukan matriks izin kompleks, bukan multi-tenant.

## 1. Role-Based Access
- Login menentukan peran: **`admin`** (surveyor/pengelola maintenance, keuangan, operasi) atau **`driver`** (operator unit).
- Setelah login, aplikasi mengarahkan ke surface sesuai peran. Driver **hanya** melihat data unit & dirinya; admin melihat seluruh armada.
- Implementasi tipis: tambah field `role` & (untuk driver) `unitId` pada user; proteksi route berdasarkan peran. Tidak perlu izin granular.

## 2. Surface ADMIN
Berisi semua yang sudah ada (Modul A Tire, Modul B Payload, Finansial/ROI, Dashboard, Data/Import, Calibration) **+ monitor kecepatan (Modul C)** untuk seluruh armada (TKPH, Vmax_safe, status AMAN/KONFLIK per unit, ringkasan armada).

## 3. Surface DRIVER (per unit, ringkas & operasional)
Hanya untuk unit & identitas driver yang login. Menampilkan:
1. **Kecepatan yang diharuskan** — dari Modul C (Vmax_safe & rekomendasi), beserta alasan singkat (mis. "muatan 104t > 91t → maks 28 km/jam").
2. **Massa muatan** — payload unit saat ini vs target 91 t (indikator hijau/kuning/merah dari Modul B).
3. **Identitas** — nama driver, ID unit, shift.
4. **Kondisi unit (detail)** — status ban (dari Modul A: sisa umur/peringatan), kalibrasi, flag perawatan.
5. **Target produksi** — target hari ini & kontribusi/progres unit.
6. **Peta jalan track (prototipe)** — lihat §4.

Desain driver: besar, sederhana, terbaca sekilas (dipakai saat operasi). Minim teks, banyak indikator.

## 4. Prototipe Pemetaan Kondisi Jalan (konsep LIDAR)
**Konsep:** tidak semua truk dipasang LIDAR (mahal). Hanya **truk paling depan (lead) dan truk paling akhir** yang membawa LIDAR untuk **memetakan kondisi jalan KM 33 → port secara berkala**; hasil peta dipakai SEMUA truk. Ini hemat biaya namun tetap memberi data jalan terkini.

**Nilai integrasi (bukan sekadar peta):** peta kondisi jalan inilah **sumber data `conditionScore` segmen jalan** yang sudah dipakai Modul A (keausan ban) & Modul C (kecepatan/cycle time). Jadi prototipe ini mendemonstrasikan **lapisan akuisisi data** yang selama ini diasumsikan — mengubahnya dari "peta hiasan" menjadi fungsional.

**Yang dibangun (prototipe, jujur):**
- Visualisasi rute KM 33 → Jetty dibagi menjadi **segmen**; tiap segmen diberi warna sesuai kondisi (mis. baik / berlubang / berlumpur / batu tajam) berdasarkan data segmen (`conditionScore`).
- Tanda truk mana yang sedang "memetakan" (lead/last). Indikator "terakhir diperbarui".
- Sumber data: **simulasi/contoh** yang mewakili keluaran LIDAR (atau import). **Bukan** koneksi LIDAR live.
- Teknis: gunakan **visualisasi skematik rute** (strip/garis bersegmen, SVG) sebagai default — ringan, jalan offline, jujur sebagai prototipe. Peta geografis nyata (Leaflet + polyline rute) opsional bila ada waktu.

**Batas integrasi masa depan:** sediakan endpoint/adaptor `roadMapSource` sehingga feed LIDAR nyata bisa disambung kelak tanpa mengubah Modul A/C. Jangan mensimulasikan "streaming live LIDAR" seolah nyata.

## 5. Functional Requirements
| ID | Requirement | Prio |
|----|-------------|------|
| FR-0004-1 | Login dengan peran (`admin`/`driver`); route diproteksi sesuai peran | Must |
| FR-0004-2 | Driver hanya mengakses data unit & identitasnya sendiri | Must |
| FR-0004-3 | Admin surface = seluruh modul A/B/C + monitor kecepatan armada | Must |
| FR-0004-4 | Driver surface menampilkan: kecepatan diharuskan, massa muatan, identitas, kondisi unit detail, target produksi | Must |
| FR-0004-5 | Prototipe peta jalan KM33→port: segmen berwarna per kondisi, dari data simulasi/contoh; tanda truk pemeta (lead/last) | Should |
| FR-0004-6 | Data kondisi segmen dari peta tersambung sebagai `conditionScore` yang dipakai Modul A & C | Should |
| FR-0004-7 | Batas integrasi `roadMapSource` (adaptor) untuk feed LIDAR masa depan; tidak ada feed live palsu | Should |

## 6. Acceptance Criteria
| # | Criteria |
|---|----------|
| 1 | Given login sebagai admin, then melihat seluruh modul + monitor kecepatan armada |
| 2 | Given login sebagai driver, then hanya melihat surface driver untuk unitnya; tidak bisa membuka layar admin |
| 3 | Given driver login, then tampil kecepatan diharuskan, massa muatan vs target, identitas, kondisi unit, target produksi |
| 4 | Given data segmen jalan, then peta menampilkan tiap segmen dgn warna kondisi & menandai truk pemeta |
| 5 | Given conditionScore dari peta berubah, then prediksi Modul A & perhitungan Modul C ikut memakai nilai itu (konsisten) |
| 6 | Given peta, then jelas berlabel "prototipe / data simulasi", bukan klaim LIDAR live |

## 7. Layar
- **Login** (pilih/otentikasi peran).
- **Driver Dashboard** (poin §3, layout besar & sederhana) + **Road Map** (prototipe §4).
- Admin: layar existing + **Speed Monitor** (Modul C) tergabung.

## 8. Tech Notes
- Auth tipis: session/JWT + field `role` (+ `unitId` untuk driver). Seed satu admin & beberapa driver contoh. Boleh ada mode demo yang melewati login bila perlu, tapi peran tetap dapat dipilih.
- Driver UI: komponen besar, indikator warna; reuse data Modul A/B/C (jangan duplikasi logika).
- Peta: default **skematik SVG** rute bersegmen; opsional Leaflet bila waktu cukup. Data segmen reuse entitas `RoadSegment` (PRD §11) + `conditionScore`.

## 9. Integrasi & Batas
- JANGAN ubah logika Modul A/B/C; modul ini menambah lapisan akses + surface + visualisasi.
- Peta & driver view membaca data yang sama (satu sumber kebenaran). 
- **Batas jujur (ulangi ke juri):** driver view & peta adalah keluaran sistem atas data yang di-feed/contoh; bukan perangkat live di kabin, bukan LIDAR live. Arsitektur siap disambung; tidak dipalsukan.

## 10. Milestone M10 (tambahkan ke IMPLEMENTATION_PLAN, SETELAH M9)
- [ ] Auth tipis + peran (`admin`/`driver`) + proteksi route (FR-0004-1/2).
- [ ] Driver Dashboard (FR-0004-4) reuse Modul A/B/C.
- [ ] Speed Monitor armada di admin (FR-0004-3) — bila belum dari M9.
- [ ] Prototipe Road Map skematik + data segmen + tanda truk pemeta (FR-0004-5/6).
- [ ] Adaptor `roadMapSource` (batas integrasi, FR-0004-7) — tanpa feed live palsu.
- [ ] Unit/integration test AC #1–#6. Commit setelah hijau. JANGAN sentuh logika A/B/C.

## 11. Asumsi baru (tambahkan ke docs/ASSUMPTIONS.md)
| Parameter | Placeholder | Sumber riil | Tipe | Kritis |
|---|---|---|---|---|
| Cakupan LIDAR (truk mana dipasang) | lead + last | Keputusan operasional KPP | KPP/ESTIMASI | 🟡 |
| Granularitas segmen jalan (jumlah/ panjang segmen) | asumsi | Survei rute / desain | ESTIMASI | ⚪ |
| Kategori kondisi jalan & ambang | baik/berlubang/berlumpur/batu tajam | Standar KPP / survei | KPP/ESTIMASI | 🟡 |
| Frekuensi update peta | asumsi | Operasi (berapa sering lead/last lewat) | KPP | ⚪ |
