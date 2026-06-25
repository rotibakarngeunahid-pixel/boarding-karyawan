-- ============================================================
-- MIGRASI: FORM BUILDER ONBOARDING + LOGIKA KONDISIONAL
-- Jalankan di phpMyAdmin pada database yang SUDAH ada.
-- Aman dijalankan ulang (INSERT pakai ON DUPLICATE KEY).
-- CATATAN: baris ALTER TABLE karyawan di bawah akan error
--          "Duplicate column" jika sudah pernah dijalankan — abaikan saja.
-- ============================================================

-- 1. Tabel definisi field form onboarding
CREATE TABLE IF NOT EXISTS form_fields (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  field_key      VARCHAR(64)  UNIQUE NOT NULL,         -- kunci unik; builtin = nama kolom karyawan
  label          VARCHAR(200) NOT NULL,                -- teks pertanyaan yang tampil
  tipe           VARCHAR(20)  NOT NULL DEFAULT 'text', -- text/textarea/number/tel/date/select/radio/file
  opsi           TEXT         NULL,                    -- JSON array (untuk select/radio): ["A","B"]
  placeholder    VARCHAR(200) NULL,
  bantuan        VARCHAR(300) NULL,                    -- teks bantuan kecil di bawah field
  wajib          TINYINT(1) DEFAULT 0,
  aktif          TINYINT(1) DEFAULT 1,
  is_builtin     TINYINT(1) DEFAULT 0,                 -- builtin tidak bisa dihapus
  is_locked      TINYINT(1) DEFAULT 0,                 -- field inti: selalu wajib & aktif (NOT NULL di DB)
  kolom_db       VARCHAR(64) NULL,                     -- builtin -> kolom karyawan; kustom -> NULL
  urutan         INT DEFAULT 0,
  -- aturan kondisional (operator: '=' atau '!=')
  show_if_field  VARCHAR(64)  NULL,
  show_if_op     VARCHAR(4)   NULL,
  show_if_value  VARCHAR(200) NULL,
  wajib_if_field VARCHAR(64)  NULL,
  wajib_if_op    VARCHAR(4)   NULL,
  wajib_if_value VARCHAR(200) NULL,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Kolom penyimpanan jawaban field KUSTOM (snapshot JSON)
ALTER TABLE karyawan ADD COLUMN data_tambahan TEXT NULL;

-- 3. Seed field bawaan (sesuai form saat ini). is_locked=1 = field inti NOT NULL.
INSERT INTO form_fields
  (field_key, label, tipe, opsi, placeholder, wajib, aktif, is_builtin, is_locked, kolom_db, urutan,
   show_if_field, show_if_op, show_if_value)
VALUES
  ('nama_lengkap',      'Nama Lengkap',           'text',     NULL, NULL, 1, 1, 1, 1, 'nama_lengkap',      1, NULL, NULL, NULL),
  ('nama_panggilan',    'Nama Panggilan',         'text',     NULL, NULL, 0, 1, 1, 0, 'nama_panggilan',    2, NULL, NULL, NULL),
  ('jenis_kelamin',     'Jenis Kelamin',          'radio',    '["Laki-Laki","Perempuan"]', NULL, 1, 1, 1, 1, 'jenis_kelamin', 3, NULL, NULL, NULL),
  ('tanggal_lahir',     'Tanggal Lahir',          'date',     NULL, NULL, 1, 1, 1, 1, 'tanggal_lahir',     4, NULL, NULL, NULL),
  ('provinsi_lahir',    'Provinsi Tempat Lahir',  'select',   NULL, NULL, 0, 1, 1, 0, 'provinsi_lahir',    5, NULL, NULL, NULL),
  ('alamat_tinggal',    'Alamat Tempat Tinggal',  'textarea', NULL, NULL, 1, 1, 1, 1, 'alamat_tinggal',    6, NULL, NULL, NULL),
  ('no_whatsapp',       'No. WhatsApp',           'tel',      NULL, '08xxxxxxxxxx', 1, 1, 1, 1, 'no_whatsapp', 7, NULL, NULL, NULL),
  ('status_pendidikan', 'Status Pendidikan',      'radio',    '["Sedang menempuh pendidikan","Sudah selesai menempuh pendidikan"]', NULL, 1, 1, 1, 0, 'status_pendidikan', 8, NULL, NULL, NULL),
  ('nama_sekolah',      'Nama Sekolah / Tempat Kuliah', 'text', NULL, NULL, 0, 1, 1, 0, 'nama_sekolah',  9, 'status_pendidikan', '=',  'Sudah selesai menempuh pendidikan'),
  ('no_ktp',            'No. KTP',                'text',     NULL, 'Ketik 0 jika belum punya', 0, 1, 1, 0, 'no_ktp', 10, 'status_pendidikan', '!=', 'Sedang menempuh pendidikan'),
  ('foto_ktp',          'Foto KTP',               'file',     NULL, NULL, 1, 1, 1, 0, 'foto_ktp_path',    11, 'status_pendidikan', '!=', 'Sedang menempuh pendidikan'),
  ('foto_diri',         'Foto Diri',              'file',     NULL, NULL, 1, 1, 1, 0, 'foto_diri_path',   12, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE field_key = field_key;

-- Field nama_sekolah juga wajib bila "sudah selesai" (preserve perilaku lama)
UPDATE form_fields
   SET wajib_if_field = 'status_pendidikan', wajib_if_op = '=', wajib_if_value = 'Sudah selesai menempuh pendidikan'
 WHERE field_key = 'nama_sekolah';
