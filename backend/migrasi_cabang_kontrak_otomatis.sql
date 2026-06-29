-- ============================================================
-- MIGRASI: CABANG DINAMIS + KONTRAK OTOMATIS SAAT LOLOS TES
--          + TEMPLATE KONTRAK PER CABANG
-- Jalankan di phpMyAdmin pada database yang SUDAH ada.
-- Aman dijalankan; tiap perintah hanya menambah tabel/kolom baru
-- atau mengubah tipe kolom (tidak menghapus data).
-- CATATAN: baris "ADD COLUMN" akan error "Duplicate column" jika
--          sudah pernah dijalankan — abaikan baris itu saja.
-- ============================================================

-- 1. Tabel daftar cabang (bisa ditambah/ubah admin, mis. "Buduk").
CREATE TABLE IF NOT EXISTS cabang (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  nama       VARCHAR(100) UNIQUE NOT NULL,
  aktif      TINYINT(1) DEFAULT 1,
  urutan     INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed cabang yang sudah ada.
INSERT INTO cabang (nama, urutan) VALUES
  ('Nusa Kambangan', 1),
  ('Soputan', 2),
  ('Pamogan', 3)
ON DUPLICATE KEY UPDATE nama = nama;

-- 2. Ubah kolom cabang dari ENUM (terkunci 3 pilihan) menjadi VARCHAR
--    supaya cabang baru bisa dipakai. Data lama tetap aman.
ALTER TABLE onboarding_invitations MODIFY COLUMN cabang VARCHAR(100) NOT NULL;
ALTER TABLE karyawan               MODIFY COLUMN cabang VARCHAR(100) NOT NULL;
ALTER TABLE kontrak                MODIFY COLUMN cabang VARCHAR(100) NOT NULL;

-- 3. Term kontrak default pada undangan onboarding.
--    Dipakai untuk membuat kontrak OTOMATIS saat kandidat LOLOS tes.
ALTER TABLE onboarding_invitations
  ADD COLUMN kontrak_durasi_bulan INT NULL AFTER catatan;
ALTER TABLE onboarding_invitations
  ADD COLUMN kontrak_gaji_pokok DECIMAL(12,2) NULL AFTER kontrak_durasi_bulan;
ALTER TABLE onboarding_invitations
  ADD COLUMN kontrak_catatan TEXT NULL AFTER kontrak_gaji_pokok;

-- 4. Template kontrak per cabang. cabang = NULL berarti template "Umum"
--    (dipakai bila cabang tsb belum punya template sendiri).
ALTER TABLE kontrak_template
  ADD COLUMN cabang VARCHAR(100) NULL AFTER original_name;
