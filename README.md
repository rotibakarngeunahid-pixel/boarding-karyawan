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
├── frontend/     # Next.js 14 → Vercel (Root Directory: frontend)
└── backend/      # PHP → cPanel public_html/boarding-api/
```

---

## Fitur

- **Onboarding**: admin membuat undangan ber-token (per cabang/posisi, ada masa berlaku). Calon karyawan mengisi formulir publik + upload foto KTP & foto diri tanpa login.
- **Tes Product Knowledge**: soal pilihan ganda dengan passing grade, timer, dan batas percobaan. Admin bisa CRUD soal + drag-and-drop urutan.
- **Karyawan**: tabel + filter (cabang/status/status tes) + pencarian, detail bertab (identitas, riwayat tes, kontrak, approval), export CSV.
- **Kontrak (PKWT)**: nomor otomatis `PKWT/RBN/{tahun}/{urut}`, perpanjangan berantai, monitoring kontrak yang akan berakhir (banner 7 & 30 hari di dashboard), export CSV.

---

## Setup Backend (cPanel)

1. **Upload** seluruh folder `backend/` ke `public_html/boarding-api/` (atau ke subdomain `api.boarding.…`).
2. **Buat database** MySQL via cPanel → phpMyAdmin, lalu jalankan `backend/init.sql` (sudah termasuk seed admin & soal contoh).
3. **Kredensial DB** — set environment variable di cPanel, atau edit langsung `backend/config/database.php`:
   ```
   DB_HOST=localhost
   DB_NAME=namauser_rbnboarding
   DB_USER=namauser_rbn
   DB_PASS=passworddb
   JWT_SECRET=string_random_minimal_32_karakter
   UPLOAD_URL_BASE=https://api.boarding.rotibakarngeunah.my.id/uploads/
   ```
4. **Folder upload** `uploads/ktp/` dan `uploads/foto_diri/` harus writable (`chmod 755`).
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

1. Connect repo GitHub, set **Root Directory** = `frontend`.
2. Environment variables di Vercel:
   ```
   NEXT_PUBLIC_API_URL=https://api.boarding.rotibakarngeunah.my.id
   NEXT_PUBLIC_APP_URL=https://boarding.rotibakarngeunah.my.id
   JWT_SECRET=sama_dengan_backend_jwt_secret
   ```
3. Deploy.

### Development lokal

```bash
# Backend (butuh PHP + MySQL lokal)
cd backend
php -S localhost:8000          # API di http://localhost:8000

# Frontend
cd frontend
cp .env.local.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:8000
npm install
npm run dev                    # http://localhost:3000
```

---

## Endpoint API (ringkas)

| Method | Path | Akses |
|---|---|---|
| POST | `/api/auth/login.php` | publik |
| GET/POST | `/api/onboarding/index.php` | admin |
| GET | `/api/onboarding/verify.php?token=` | publik |
| POST | `/api/onboarding/submit.php` | publik (multipart) |
| GET/POST/PUT/DELETE | `/api/tes/soal.php` | publik (GET soal) / admin (mutasi) |
| GET/PUT | `/api/tes/pengaturan.php` | admin |
| POST | `/api/tes/kerjakan.php` | publik |
| GET | `/api/tes/hasil.php` | admin |
| GET/PUT | `/api/karyawan/index.php` | admin |
| GET | `/api/karyawan/detail.php?id=` | admin |
| POST | `/api/karyawan/approve.php` | admin |
| GET | `/api/kontrak/index.php` | admin |
| POST | `/api/kontrak/buat.php` | admin |
| GET | `/api/kontrak/detail.php?id=` | admin |
| POST | `/api/kontrak/perpanjang.php` | admin |
| GET | `/api/kontrak/expiring.php?hari=` | admin |

Semua response berformat `{ success: bool, data?, message?, errors? }`.

### Catatan keamanan auth
Token JWT disimpan di **dua tempat**: cookie `httpOnly` `rbn_auth_token` (dipakai `middleware.ts` untuk proteksi route) dan `localStorage` `rbn_token` (dipakai client untuk header `Authorization: Bearer`). Backend tetap memverifikasi JWT pada setiap endpoint admin — middleware hanya guard UX. Saat production, kunci CORS ke domain frontend yang fix dan gunakan `JWT_SECRET` yang sama di kedua sisi.

---

## Cabang & data referensi
Cabang: **Nusa Kambangan**, **Soputan**, **Pamogan**. Pengaturan tes default: passing grade 70%, waktu 30 menit, maks 3 percobaan (0 = tak terbatas).
