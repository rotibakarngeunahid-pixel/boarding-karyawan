-- ============================================================
-- MIGRASI: SIMPAN DOKUMEN KONTRAK (.docx) YANG DITANDATANGANI
-- Jalankan di phpMyAdmin pada database yang SUDAH ada.
-- Aman dijalankan; hanya menambah 1 kolom.
-- CATATAN: error "Duplicate column" = sudah pernah dijalankan, abaikan.
-- ============================================================

-- Menyimpan path dokumen kontrak (hasil isi template) saat ditandatangani,
-- agar yang ditampilkan ke karyawan = persis yang mereka setujui.
ALTER TABLE kontrak
  ADD COLUMN snapshot_docx_path VARCHAR(255) NULL AFTER snapshot_kontrak;
