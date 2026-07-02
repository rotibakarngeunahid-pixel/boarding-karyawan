# PRD: Revisi Sistem Boarding RBN
**Tanggal:** 2 Juli 2026  
**Project:** Sistem Manajemen Onboarding & Kontrak Kerja - Roti Bakar Ngeunah  
**Status:** Draft untuk Review

---

## 1. Ubah Form Tanggal Lahir (Input Step-by-Step)

### Latar Belakang
Saat ini form tanggal lahir menggunakan satu input HTML `<input type="date">` yang standar. Hal ini dapat menyebabkan kebingungan terutama pada pengguna mobile atau yang terbiasa dengan format step-by-step.

### User Story
Sebagai calon karyawan mengisi formulir onboarding, saya ingin mengisi tanggal lahir **secara bertahap** agar lebih jelas: **tahun → bulan → tanggal**, bukan dalam satu field sekaligus.

### Requirement
1. **Urutan input:** Tahun (4 digit) → Bulan (dropdown 1-12) → Tanggal (dropdown 1-31)
2. **Validasi:**
   - Tahun: rentang wajar (mis. 1950–2010)
   - Bulan: 1–12
   - Tanggal: 1–31, sesuaikan dengan jumlah hari bulan (Feb ada 28/29 hari)
3. **Output:** Simpan dalam format ISO `YYYY-MM-DD` ke database (tidak berubah)
4. **Field key:** Tetap `tanggal_lahir` (backward compatible)

### Scope
- **File terkena dampak:** `components/shared/DynamicField.tsx`
- **Komponen baru (opsional):** Bisa buat komponen terpisah `DatePickerStepwise.tsx` untuk reusability
- **Impact:** Hanya form onboarding publik & halaman admin "Tambah Karyawan Manual"

### Acceptance Criteria
- [ ] Form menampilkan 3 input: Tahun, Bulan, Tanggal (bukan satu input date)
- [ ] Validasi bulan dan tanggal benar (Feb 29 di tahun kabisat, dll)
- [ ] Data tersimpan dalam format `YYYY-MM-DD` di database
- [ ] Backlog lama (data dari input `<date>` lama) tetap terbaca dengan benar
- [ ] Tampil responsif di mobile dan desktop

---

## 2. Perbaiki List Karyawan (Kandidat Tidak Muncul setelah Submit Form)

### Latar Belakang
Calon karyawan sudah mengisi formulir onboarding lengkap hingga selesai, namun nama mereka tidak muncul di tabel Karyawan admin (`/karyawan`). Ini menghalangi admin untuk melihat siapa saja yang sudah submit dan melacak progres mereka.

### Root Cause Analisis
Kemungkinan penyebab:
1. API endpoint submit form (`/api/onboarding/submit.php`) tidak membuat record `karyawan` baru
2. Status submission tidak ter-track dengan baik di database (tabel `onboarding_submissions` vs `karyawan`)
3. Filter atau query di `listKaryawan()` mengesampingkan candidates yang baru submit

### User Story
Sebagai admin, setelah seorang kandidat berhasil submit formulir onboarding, saya ingin **langsung melihat namanya di list Karyawan** agar dapat memantau siapa saja yang sudah mendaftar dan siap untuk tahap berikutnya.

### Requirement
1. **Saat formulir onboarding disubmit (publik):**
   - Buat atau update record di tabel `karyawan` dengan status `nonaktif` (default pending)
   - Catat hubungan ke `invitation_id` (dari undangan yang dipakai)
   - Simpan semua jawaban form (field kustom → tabel `karyawan_data_tambahan` atau JSON di kolom)
2. **List Karyawan** (`GET /api/karyawan/index.php`):
   - Tampilkan semua karyawan termasuk yang baru submit (status `nonaktif`)
   - Jangan filter ketat — hanya filter user-requested (cabang, status, tes)
3. **Indikator status:** Badge "Belum Tes" harus muncul untuk karyawan yang baru submit
4. **Tidak ada data yang hilang:** Jangan hapus atau reset data lama

### Scope
- **Files terkena dampak:**
  - Backend: `backend/api/onboarding/submit.php` (buat/update karyawan record)
  - Backend: `backend/api/karyawan/index.php` (pastikan query benar)
  - Frontend: `app/karyawan/page.tsx` (display sudah benar, API yang diperbaiki)
- **Database schema:** Verifikasi kolom `invitation_id`, status, dll.

### Acceptance Criteria
- [ ] Calon karyawan yang submit form muncul di list dengan status tertentu (misal "nonaktif")
- [ ] Nama, cabang, posisi sudah terisi dari form
- [ ] Admin dapat filter & cari kandidat baru
- [ ] Data historis tidak hilang atau tertimpa
- [ ] API response time tetap wajar (<1s)

---

## 3. Hapus Tampilan Jawaban Benar saat Test Salah (Retry Tanpa Kunci Jawaban)

### Latar Belakang
Saat kandidat gagal ujian (tidak lulus), halaman hasil tes menampilkan **jawaban benar** untuk setiap soal yang dijawab salah. Ini bertentangan dengan prinsip ujian yang adil — jika kandidat boleh melihat jawaban, maka percobaan berikutnya bukan lagi ujian asli.

### User Story
Sebagai penyelenggara tes, saya ingin **kandidat yang gagal tidak melihat jawaban benar**, agar ketika mereka retry, mereka benar-benar mengingat atau belajar kembali, bukan cuma menghafal jawaban yang sudah dilihat.

### Current Behavior
**Halaman hasil (failed)** menampilkan:
```
Jawaban kamu: [A] ✗
Jawaban benar: [C] ✓
```

### Desired Behavior
**Halaman hasil (failed)** menampilkan:
```
Jawaban kamu: [A] ✗
(tidak ada jawaban benar)
```

**Halaman hasil (passed)** tetap menampilkan pembahasan lengkap (opsional, bisa diskusi lebih lanjut).

### Requirement
1. **Saat gagal tes (lulus == false):**
   - Tampilkan soal & jawaban user
   - **Jangan tampilkan jawaban benar** bahkan untuk soal yang salah
   - Tampilkan pesan: "Silakan coba lagi untuk meningkatkan skor"
2. **Saat lulus tes (lulus == true):**
   - Bisa tetap tampilkan pembahasan lengkap (opsional)
   - Atau opsi kedua: juga sembunyikan jawaban benar (pilihan admin)
3. **Data tetap tersimpan:** Snapshot jawaban di database tidak berubah (untuk audit/review)

### Scope
- **File terkena dampak:** `app/onboarding/[token]/tes/page.tsx` (baris ~184-211)
- **Backend:** Tidak perlu perubahan (API sudah kirim data lengkap, cuma frontend yang filter tampilan)
- **Database:** Tidak berubah (audit log tetap lengkap)

### Acceptance Criteria
- [ ] Halaman hasil gagal TIDAK menampilkan jawaban benar
- [ ] Halaman hasil lulus bisa menampilkan pembahasan (sesuai kebijakan)
- [ ] Tombol "Coba Lagi" tetap berfungsi
- [ ] Data lengkap tetap tersimpan di server untuk review admin
- [ ] Responsive di mobile & desktop

---

## 4. Sejajarkan Posisi Tanda Tangan & Stempel di Dokumen Kontrak

### Latar Belakang
Di halaman tanda tangan kontrak, stempel & tanda tangan tidak sejajar dengan benar. Tanda tangan muncul di bawah nama, sedangkan stempel seharusnya di sebelahnya (atau tepat di posisi placeholder), namun keduanya **tidak sejajar vertikal maupun horizontal**.

### User Story
Sebagai karyawan menandatangani kontrak, saya ingin stempel & tanda tangan **sejajar dan rapi** agar dokumen terlihat profesional dan sesuai format kontrak standar.

### Current Behavior (dari screenshot)
```
Pasal 10 - PENUTUP
[teks paragraf]

Bundaran Dalung, Denpasar, 2 Juli 2026

┌─────────────────────────┬─────────────────────────┐
│    PIHAK PERTAMA        │    PIHAK KEDUA          │
│  [stempel perusahaan]   │  [tanda tangan user]    │
│  (Dwi Adithya)          │  (Adithya)              │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

**Masalah:** Stempel & tanda tangan tidak sejajar horizontal atau vertikal.

### Desired Behavior
```
┌─────────────────────────┬─────────────────────────┐
│    PIHAK PERTAMA        │    PIHAK KEDUA          │
│                         │                         │
│  [stempel]              │  [tanda tangan]         │
│  (Dwi Adithya)          │  (Adithya)              │
│                         │                         │
└─────────────────────────┴─────────────────────────┘
```

**Ideal:** Sejajar vertikal (baseline sama, kedua gambar pada tinggi yang sama).

### Root Cause
Kemungkinan penyebab:
1. Template Word placeholder `{{STEMPEL}}` & tanda tangan tidak konsisten tingginya
2. Ukuran/scale stempel & tanda tangan berbeda
3. Margin/padding CSS tidak konsisten

### Requirement
1. **Stempel & tanda tangan harus sejajar** — vertical-align yang sama dalam dokumen
2. **Ukuran konsisten:**
   - Stempel: width ~120px (sudah diatur)
   - Tanda tangan: lebar ~150px, tinggi proporsional
3. **Margin standar:** Top/bottom/left/right harus konsisten
4. **Dokumentasi placeholder:** Template Word harus jelas di mana stempel & TTD ditempatkan

### Scope
- **File terkena dampak:**
  - Frontend: `app/kontrak/tanda-tangan/[token]/page.tsx` (preview & render)
  - Frontend: `components/shared/StempelCard.tsx` (konfigurasi stempel)
  - Backend: `backend/api/kontrak/sign.php` (injeksi stempel & TTD ke dokumen)
  - Template: `backend/uploads/templates/` (template kontrak dengan placeholder)
- **Database:** Setting offset stempel di tabel (jika ada: `stempel_offset_x`, `stempel_offset_y`)

### Acceptance Criteria
- [ ] Stempel & tanda tangan vertikal sejajar (baseline/center align sama)
- [ ] Ukuran keduanya konsisten & proporsional
- [ ] Tampil sempurna di dokumen preview (browser) & download Word
- [ ] Template Word sudah jelas placeholder-nya untuk kedua elemen
- [ ] Tidak menggeser layout dokumen lain
- [ ] Responsif di mobile (preview jelas diperkecil tapi tetap rapi)

---

## Timeline & Prioritas

| No. | Fitur | Priority | Est. Hours |
|-----|-------|----------|-----------|
| 1   | Date picker step-wise | Medium | 6 jam |
| 2   | Perbaiki list karyawan | High | 8 jam |
| 3   | Hapus jawaban benar saat gagal | Low | 2 jam |
| 4   | Sejajarkan stempel & TTD | Medium | 5 jam |

**Total: ~21 jam**

### Rekomendasi Urutan
1. **Prioritas 1:** Perbaiki list karyawan (High impact, High frustration)
2. **Prioritas 2:** Date picker (Medium, banyak UX improvement)
3. **Prioritas 3:** Sejajarkan stempel (Medium UX, tampilan profesional)
4. **Prioritas 4:** Hapus jawaban benar (Low impact, tapi penting integritas tes)

---

## Testing Plan

### 1. Date Picker Step-Wise
- [ ] Isi tahun/bulan/tanggal dengan nilai valid → data tersimpan benar
- [ ] Test bulan Februari di tahun kabisat (2024) & non-kabisat (2023)
- [ ] Mobile: ketik angka vs dropdown pilih
- [ ] Edit karyawan lama (dari `<date>` HTML) → masih terbaca

### 2. List Karyawan
- [ ] Submit formulir onboarding baru → muncul di list dengan 5 detik
- [ ] Filter & cari kandidat baru
- [ ] Ekspor CSV → nama kandidat tercantum
- [ ] Check database: karyawan_id valid, invitation_id link, data field tersimpan

### 3. Hapus Jawaban Benar
- [ ] Jawab salah → hasil tidak tampil jawaban benar
- [ ] Jawab benar → lulus, cek pembahasan (jika ditampilkan)
- [ ] Click "Coba Lagi" → soal fresh, tanpa bocor jawaban

### 4. Sejajarkan Stempel & TTD
- [ ] Preview browser: stempel & TTD sejajar
- [ ] Download Word: kedua elemen tetap sejajar
- [ ] Test berbagai ukuran stempel (kecil-besar)
- [ ] Mobile preview: jelas & rapi

---

## Notes & Open Questions

1. **Date picker:** Apakah ingin add *input error messages* jika tanggal invalid (mis. Feb 30)?
2. **List karyawan:** Apakah perlu tab/status baru untuk "Pending Review" vs "Nonaktif" existing?
3. **Jawaban benar:** Apakah lulus juga sembunyikan jawaban benar, atau hanya saat gagal?
4. **Stempel:** Ada data offset di database, atau hardcoded di template Word?

---

## Referensi Codebase

- **Date picker:** `components/shared/DynamicField.tsx:71-86` (current date input)
- **List karyawan:** `app/karyawan/page.tsx:44-54` (API call), `lib/api.ts` (listKaryawan)
- **Test result:** `app/onboarding/[token]/tes/page.tsx:184-211` (detail jawaban)
- **Stempel & TTD:** `components/shared/StempelCard.tsx`, `app/kontrak/tanda-tangan/[token]/page.tsx`

---

**Status:** ✏️ Draft  
**Owner:** Developer  
**QA Lead:** TBD  
**Approval:** TBD (Product Owner)
