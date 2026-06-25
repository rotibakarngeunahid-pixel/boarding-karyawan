-- ============================================================
-- RBN BOARDING SYSTEM — DATABASE SCHEMA
-- MySQL 5.7+ / MariaDB 10.2+
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nama          VARCHAR(100) NOT NULL,
  role          ENUM('superadmin','admin') DEFAULT 'admin',
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default superadmin (password: admin123 — GANTI setelah deploy!)
INSERT INTO users (username, password_hash, nama, role) VALUES
('admin', '$2y$12$hWjxwwvRsdBmK/1JqMiltei5HSX/IvR6LjbbKmgP8wsqK4bQuQsXS', 'Administrator', 'superadmin')
ON DUPLICATE KEY UPDATE username = username;

CREATE TABLE IF NOT EXISTS onboarding_invitations (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  token       VARCHAR(64) UNIQUE NOT NULL,
  test_slug   VARCHAR(80) UNIQUE,                 -- link tes pendek: kasir-nkam
  cabang      ENUM('Nusa Kambangan','Soputan','Pamogan') NOT NULL,
  posisi      VARCHAR(100) NOT NULL,
  catatan     TEXT,
  status      ENUM('pending','submitted','approved','rejected') DEFAULT 'pending',
  expires_at  TIMESTAMP NOT NULL,
  created_by  INT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS karyawan (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  invitation_id       INT UNIQUE,

  -- Identitas
  nama_lengkap        VARCHAR(200) NOT NULL,
  nama_panggilan      VARCHAR(100),
  jenis_kelamin       ENUM('Laki-Laki','Perempuan') NOT NULL,
  tanggal_lahir       DATE NOT NULL,
  provinsi_lahir      VARCHAR(100),
  alamat_tinggal      TEXT NOT NULL,
  no_whatsapp         VARCHAR(20) NOT NULL,
  no_ktp              VARCHAR(16),
  foto_ktp_path       VARCHAR(255),
  foto_diri_path      VARCHAR(255),

  -- Pendidikan
  status_pendidikan   ENUM('Sedang menempuh pendidikan','Sudah selesai menempuh pendidikan'),
  nama_sekolah        VARCHAR(200),

  -- Data kerja (diisi dari invitation)
  cabang              ENUM('Nusa Kambangan','Soputan','Pamogan') NOT NULL,
  posisi              VARCHAR(100),
  tanggal_bergabung   DATE,

  -- Hasil tes (snapshot dari tes terakhir yang lulus)
  skor_tes            DECIMAL(5,2) DEFAULT 0,
  lulus_tes           TINYINT(1) DEFAULT 0,
  total_percobaan_tes INT DEFAULT 0,

  status              ENUM('aktif','nonaktif','resigned') DEFAULT 'aktif',
  created_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (invitation_id) REFERENCES onboarding_invitations(id)
);

CREATE TABLE IF NOT EXISTS tes_pengaturan (
  id                      INT PRIMARY KEY DEFAULT 1,
  passing_grade           INT DEFAULT 70,       -- dalam persen
  waktu_pengerjaan_menit  INT DEFAULT 30,
  max_percobaan           INT DEFAULT 3,         -- 0 = tidak terbatas
  updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO tes_pengaturan (id, passing_grade, waktu_pengerjaan_menit, max_percobaan)
VALUES (1, 70, 30, 3)
ON DUPLICATE KEY UPDATE id = id;

CREATE TABLE IF NOT EXISTS tes_soal (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  pertanyaan     TEXT NOT NULL,
  pilihan_a      VARCHAR(500) NOT NULL,
  pilihan_b      VARCHAR(500) NOT NULL,
  pilihan_c      VARCHAR(500) NOT NULL,
  pilihan_d      VARCHAR(500) NOT NULL,
  question_image VARCHAR(255),                     -- gambar opsional per soal
  jawaban_benar  ENUM('a','b','c','d') NOT NULL,
  poin           INT DEFAULT 10,
  urutan         INT DEFAULT 0,
  aktif          TINYINT(1) DEFAULT 1,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed soal dari formulir onboarding contoh
INSERT INTO tes_soal (pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, poin, urutan) VALUES
(
  'Jika pelanggan bertanya "Apa itu roti original kak?", mana jawaban yang benar?',
  'Roti original itu roti bakar dengan mentega dan sedikit olesan manis tipis agar rasanya lebih balance',
  'Roti original itu roti bakar polos dengan mentega saja, jadi rasanya gurih agak asin',
  'Roti original itu roti bakar tanpa topping sama sekali, hanya roti panggang biasa',
  'Roti original itu roti bakar dengan mentega dan susu tipis supaya lebih creamy',
  'a', 10, 1
),
(
  'Apa perbedaan Roti Bakar Kecil (small) dengan Roti Bakar Besar (reguler)?',
  'Roti kecil menggunakan 1 lembar roti, sedangkan roti besar menggunakan 2 lembar roti',
  'Roti kecil dipotong lebih tipis, sedangkan roti besar dipotong lebih tebal',
  'Roti kecil mendapatkan 5 potong roti, sedangkan roti besar mendapatkan 10 potong roti',
  'Roti kecil topping-nya lebih sedikit, sedangkan roti besar topping-nya lebih banyak',
  'a', 10, 2
),
(
  'Mana varian rasa di bawah ini yang TIDAK MENGGUNAKAN SUSU?',
  'Coklat', 'Keju', 'Milo', 'Tiramisu',
  'b', 10, 3
),
(
  'Mana komposisi varian coklat — keju yang benar?',
  'Coklat, dan Keju',
  'Coklat, Keju, dan Susu',
  'Coklat, dan Susu',
  'Keju, dan Susu',
  'b', 10, 4
);

CREATE TABLE IF NOT EXISTS tes_hasil (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  karyawan_id     INT NOT NULL,
  total_soal      INT NOT NULL,
  total_benar     INT NOT NULL,
  total_poin      INT NOT NULL,
  maks_poin       INT NOT NULL,
  skor_persen     DECIMAL(5,2) NOT NULL,
  passing_grade   INT NOT NULL,
  lulus           TINYINT(1) NOT NULL,
  jawaban_json    JSON,        -- array of {soal_id, jawaban_user, jawaban_benar, benar: bool}
  dikerjakan_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (karyawan_id) REFERENCES karyawan(id)
);

CREATE TABLE IF NOT EXISTS kontrak (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  karyawan_id      INT NOT NULL,
  nomor_kontrak    VARCHAR(100) UNIQUE NOT NULL,   -- auto-gen: PKWT/RBN/2024/001
  tanggal_mulai    DATE NOT NULL,
  tanggal_berakhir DATE NOT NULL,
  posisi           VARCHAR(100) NOT NULL,
  cabang           ENUM('Nusa Kambangan','Soputan','Pamogan') NOT NULL,
  gaji_pokok       DECIMAL(12,2),
  status           ENUM('aktif','berakhir','diperbarui','dibatalkan') DEFAULT 'aktif',
  kontrak_sebelumnya_id INT DEFAULT NULL,          -- untuk chain perpanjangan
  catatan          TEXT,
  created_by       INT,
  created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (karyawan_id) REFERENCES karyawan(id),
  FOREIGN KEY (created_by) REFERENCES users(id),
  FOREIGN KEY (kontrak_sebelumnya_id) REFERENCES kontrak(id)
);

CREATE TABLE IF NOT EXISTS kontrak_template (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  filename      VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  aktif         TINYINT(1) DEFAULT 1,
  uploaded_by   INT,
  uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

-- View: kontrak aktif + sisa hari
CREATE OR REPLACE VIEW v_kontrak_aktif AS
SELECT
  k.*,
  kr.nama_lengkap,
  kr.nama_panggilan,
  kr.no_whatsapp,
  DATEDIFF(k.tanggal_berakhir, CURDATE()) AS sisa_hari
FROM kontrak k
JOIN karyawan kr ON k.karyawan_id = kr.id
WHERE k.status = 'aktif';
