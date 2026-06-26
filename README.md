# RBN Boarding System

Sistem manajemen karyawan **Roti Bakar Ngeunah (RBN)** — mengelola seluruh siklus hidup karyawan: undangan onboarding → tes product knowledge → data karyawan → kontrak kerja (PKWT) → monitoring expiry kontrak.

## Arsitektur

| Layer | Teknologi | Deploy |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS | Vercel |
| Backend | PHP 8.1+ REST API (PDO, tanpa framework) | cPanel Shared Hosting |
| Database | MySQL 5.7+ / MariaDB 10.2+ | cPanel phpMyAdmin |
| Auth | JWT HS256 (cookie httpOnly + Authorization header) | — |

```
onboarding-karyawan/
├── app/ components/ lib/ types/   # Next.js 14 (di ROOT repo) → Vercel
├── package.json next.config.mjs …
└── backend/                        # PHP → cPanel public_html/boarding-api/
```

> **Catatan:** App Next.js berada di **root repo** (bukan subfolder), supaya Vercel
> langsung mendeteksi & build tanpa perlu setel *Root Directory*. Backend PHP ada
> di subfolder `backend/` dan dideploy terpisah ke cPanel (Vercel mengabaikannya).

---

## Fitur

- **Onboarding**: admin membuat undangan ber-token (per cabang/posisi, ada masa berlaku). Calon karyawan mengisi formulir publik + upload foto KTP & foto diri tanpa login.
- **Tes Product Knowledge**: soal pilihan ganda dengan passing grade, timer, dan batas percobaan. Admin bisa CRUD soal + drag-and-drop urutan.
- **Karyawan**: tabel + filter (cabang/status/status tes) + pencarian, detail bertab (identitas, riwayat tes, kontrak, approval), export CSV. **Input manual** oleh admin (tanpa undangan onboarding) lewat tombol *Tambah Karyawan* — formnya mengikuti definisi Formulir Onboarding.
- **Kontrak (PKWT)**: nomor otomatis `PKWT/RBN/{tahun}/{urut}`, perpanjangan berantai, monitoring kontrak yang akan berakhir (banner 7 & 30 hari di dashboard), export CSV.
- **Tanda tangan kontrak (e-signature)**: tiap kontrak punya link tanda tangan publik (mirip VIDA/Privy). Karyawan membuka link, membaca isi kontrak, lalu menandatangani dengan **corat-coret di kanvas** (mouse/sentuh). Tanda tangan + waktu + snapshot isi kontrak tersimpan, dan tampil di detail kontrak admin.

---

## Setup Backend (cPanel)

1. **Upload** seluruh folder `backend/` ke `public_html/boarding-api/` (atau ke subdomain `api.boarding.…`).
2. **Buat database** MySQL via cPanel → phpMyAdmin, lalu jalankan `backend/init.sql` (sudah termasuk seed admin & soal contoh). Pada database yang **sudah ada**, jalankan juga file migrasi sesuai fitur: `migrasi_revisi.sql`, `migrasi_form_builder.sql`, dan **`migrasi_kontrak_ttd.sql`** (kolom tanda tangan kontrak).
3. **Kredensial DB** — set environment variable di cPanel, atau edit langsung `backend/config/database.php`:
   ```
   DB_HOST=localhost
   DB_NAME=namauser_rbnboarding
   DB_USER=namauser_rbn
   DB_PASS=passworddb
   JWT_SECRET=string_random_minimal_32_karakter
   UPLOAD_URL_BASE=https://api.boarding.rotibakarngeunah.my.id/uploads/
   ```
4. **Folder upload** `uploads/ktp/`, `uploads/foto_diri/`, `uploads/templates/`, dan `uploads/ttd/` (tanda tangan) harus ada & writable (`chmod 755`). Folder dibuat otomatis saat upload pertama bila induk `uploads/` writable.
5. Pastikan **mod_rewrite** & **mod_headers** aktif (untuk `.htaccess` CORS + preflight).
6. **CORS** — di `backend/.htaccess`, saat production ganti `Access-Control-Allow-Origin "*"` dengan domain Vercel yang fix.
7. **Ganti password admin** default. Generate hash baru:
   ```bash
   php -r "echo password_hash('passwordbaru', PASSWORD_BCRYPT, ['cost'=>12]);"
   ```
   lalu `UPDATE users SET password_hash='...' WHERE username='admin';`

**Login default:** `admin` / `admin123` — **wajib diganti setelah deploy.**

---

## Setup Frontend (Vercel)

1. Connect repo GitHub — **Root Directory dibiarkan default (root)**, Vercel otomatis mendeteksi Next.js.
2. Environment variables di Vercel (Settings → Environment Variables):
   ```
   NEXT_PUBLIC_API_URL=https://api.boarding.rotibakarngeunah.my.id
   NEXT_PUBLIC_APP_URL=https://boarding-karyawan.vercel.app
   JWT_SECRET=sama_dengan_backend_jwt_secret
   ```
   Tanpa `NEXT_PUBLIC_API_URL`, situs tetap tampil tapi panggilan API gagal (set setelah backend live).
3. Deploy (otomatis tiap push ke `main`).

### Development lokal

```bash
# Backend (butuh PHP + MySQL lokal)
cd backend
php -S localhost:8000          # API di http://localhost:8000

# Frontend (di root repo)
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                    # http://localhost:3000
```

---

## Endpoint API (ringkas)

| Method | Path | Akses |
|---|---|---|
| POST | `/api/auth/login.php` | publik |
| GET/POST/DELETE | `/api/onboarding/index.php` | admin |
| GET | `/api/onboarding/verify.php?token=` | publik |
| POST | `/api/onboarding/submit.php` | publik (multipart) |
| GET/POST/PUT/DELETE | `/api/tes/soal.php` | publik (GET soal) / admin (mutasi) |
| GET/PUT | `/api/tes/pengaturan.php` | admin |
| POST | `/api/tes/kerjakan.php` | publik |
| GET | `/api/tes/hasil.php` | admin |
| GET/POST/PUT/DELETE | `/api/karyawan/index.php` | admin (POST = input manual, multipart) |
| GET | `/api/karyawan/detail.php?id=` | admin |
| POST | `/api/karyawan/approve.php` | admin |
| GET/DELETE | `/api/kontrak/index.php` | admin |
| POST | `/api/kontrak/buat.php` | admin |
| GET | `/api/kontrak/detail.php?id=` | admin |
| GET | `/api/kontrak/preview.php?kontrak_id=` | admin |
| POST | `/api/kontrak/perpanjang.php` | admin |
| GET | `/api/kontrak/expiring.php?hari=` | admin |
| GET/POST | `/api/kontrak/sign.php?token=` | publik (baca & tanda tangan kontrak) |

Semua response berformat `{ success: bool, data?, message?, errors? }`.

Untuk hosting yang memblokir HTTP `DELETE`, endpoint hapus juga menerima `POST` dengan query
`_method=DELETE`, misalnya `/api/karyawan/index.php?id=1&_method=DELETE`.

### Catatan keamanan auth
Token JWT disimpan di **dua tempat**: cookie `httpOnly` `rbn_auth_token` (dipakai `middleware.ts` untuk proteksi route) dan `localStorage` `rbn_token` (dipakai client untuk header `Authorization: Bearer`). Backend tetap memverifikasi JWT pada setiap endpoint admin — middleware hanya guard UX. Saat production, kunci CORS ke domain frontend yang fix dan gunakan `JWT_SECRET` yang sama di kedua sisi.

---

## Cabang & data referensi
Cabang: **Nusa Kambangan**, **Soputan**, **Pamogan**. Pengaturan tes default: passing grade 70%, waktu 30 menit, maks 3 percobaan (0 = tak terbatas).
