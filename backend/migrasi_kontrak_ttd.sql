-- ============================================================
-- MIGRASI: TANDA TANGAN KONTRAK (e-signature ala VIDA/Privy)
-- Jalankan di phpMyAdmin pada database yang SUDAH ada.
-- Aman dijalankan; tiap perintah hanya menambah kolom/index baru.
-- CATATAN: jika sebuah kolom sudah pernah ditambahkan, MySQL akan
--          error "Duplicate column" — abaikan baris itu saja.
-- ============================================================

-- Token publik untuk halaman tanda tangan (mirip link onboarding).
ALTER TABLE kontrak
  ADD COLUMN sign_token VARCHAR(64) NULL AFTER status;

ALTER TABLE kontrak
  ADD UNIQUE KEY uq_kontrak_sign_token (sign_token);

-- Hasil tanda tangan (gambar PNG di uploads/ttd/).
ALTER TABLE kontrak
  ADD COLUMN tanda_tangan_path VARCHAR(255) NULL AFTER sign_token;

-- Nama yang diketik penandatangan saat menyetujui kontrak.
ALTER TABLE kontrak
  ADD COLUMN nama_penandatangan VARCHAR(200) NULL AFTER tanda_tangan_path;

-- Waktu penandatanganan.
ALTER TABLE kontrak
  ADD COLUMN ditandatangani_at DATETIME NULL AFTER nama_penandatangan;

-- Snapshot teks kontrak saat ditandatangani (agar isi yang disetujui tidak berubah).
ALTER TABLE kontrak
  ADD COLUMN snapshot_kontrak MEDIUMTEXT NULL AFTER ditandatangani_at;
