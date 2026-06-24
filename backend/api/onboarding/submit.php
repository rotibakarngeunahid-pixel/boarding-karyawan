<?php
// POST /api/onboarding/submit   (PUBLIC, multipart/form-data)
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/upload.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}

$data = $_POST;
$missing = validate_required($data, [
  'token', 'nama_lengkap', 'jenis_kelamin', 'tanggal_lahir',
  'alamat_tinggal', 'no_whatsapp',
]);
if ($missing) {
  json_error('Beberapa field wajib belum diisi.', 422, $missing);
}

$jk_valid = ['Laki-Laki', 'Perempuan'];
if (!in_array($data['jenis_kelamin'], $jk_valid, true)) {
  json_error('Jenis kelamin tidak valid.', 422);
}

try {
  $db = getDB();

  // 1. Verifikasi token masih valid (pending & belum kedaluwarsa)
  $stmt = $db->prepare('SELECT id, cabang, posisi, status, expires_at FROM onboarding_invitations WHERE token = ? LIMIT 1');
  $stmt->execute([$data['token']]);
  $inv = $stmt->fetch();

  if (!$inv) {
    json_error('Token tidak ditemukan.', 404);
  }
  if ($inv['status'] !== 'pending') {
    json_error('Link onboarding sudah pernah digunakan.', 409);
  }
  if (strtotime($inv['expires_at']) <= time()) {
    json_error('Link onboarding sudah kedaluwarsa.', 410);
  }

  // 2 & 3. Upload foto KTP & foto diri
  if (empty($_FILES['foto_ktp']) || empty($_FILES['foto_diri'])) {
    json_error('Foto KTP dan foto diri wajib diunggah.', 422);
  }

  $ktp = handle_upload($_FILES['foto_ktp'], 'ktp');
  if (!$ktp['ok']) {
    json_error('Foto KTP: ' . $ktp['error'], 422);
  }

  $diri = handle_upload($_FILES['foto_diri'], 'foto_diri');
  if (!$diri['ok']) {
    json_error('Foto diri: ' . $diri['error'], 422);
  }

  // 4. INSERT ke karyawan + 5. UPDATE invitation (transaksi)
  $db->beginTransaction();

  $stmt = $db->prepare(
    'INSERT INTO karyawan
      (invitation_id, nama_lengkap, nama_panggilan, jenis_kelamin, tanggal_lahir,
       provinsi_lahir, alamat_tinggal, no_whatsapp, no_ktp, foto_ktp_path, foto_diri_path,
       status_pendidikan, nama_sekolah, cabang, posisi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    $inv['id'],
    $data['nama_lengkap'],
    $data['nama_panggilan'] ?? null,
    $data['jenis_kelamin'],
    $data['tanggal_lahir'],
    $data['provinsi_lahir'] ?? null,
    $data['alamat_tinggal'],
    $data['no_whatsapp'],
    $data['no_ktp'] ?? null,
    $ktp['path'],
    $diri['path'],
    $data['status_pendidikan'] ?? null,
    $data['nama_sekolah'] ?? null,
    $inv['cabang'],
    $inv['posisi'],
  ]);
  $karyawan_id = (int) $db->lastInsertId();

  $upd = $db->prepare("UPDATE onboarding_invitations SET status = 'submitted' WHERE id = ?");
  $upd->execute([$inv['id']]);

  $db->commit();

  json_success([
    'karyawan_id' => $karyawan_id,
  ], 'Data berhasil dikirim.', 201);
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
