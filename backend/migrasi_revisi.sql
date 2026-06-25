-- ============================================================
-- MIGRASI REVISI (jalankan di phpMyAdmin pada database yang SUDAH ada)
-- Aman dijalankan; tiap perintah hanya menambah kolom/tabel baru.
-- ============================================================

-- REVISI 4 — gambar opsional per soal tes
ALTER TABLE tes_soal
  ADD COLUMN question_image VARCHAR(255) NULL AFTER pilihan_d;

-- REVISI 6 — slug link tes yang pendek & profesional
ALTER TABLE onboarding_invitations
  ADD COLUMN test_slug VARCHAR(80) NULL AFTER token,
  ADD UNIQUE KEY uq_test_slug (test_slug);

-- REVISI 3 — template kontrak kerja (.doc/.docx)
CREATE TABLE IF NOT EXISTS kontrak_template (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  filename      VARCHAR(255) NOT NULL,   -- nama file tersimpan di uploads/templates/
  original_name VARCHAR(255) NOT NULL,   -- nama asli saat diupload
  aktif         TINYINT(1) DEFAULT 1,
  uploaded_by   INT,
  uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
