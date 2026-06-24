<?php
// GET /api/karyawan/detail?id=N   (admin)
// Data lengkap karyawan + riwayat tes + riwayat kontrak
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

$id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
if (!$id) json_error('Parameter id wajib.', 422);

try {
  $db = getDB();

  $stmt = $db->prepare(
    'SELECT k.*, i.token AS invitation_token, i.status AS invitation_status, i.catatan AS invitation_catatan
     FROM karyawan k
     LEFT JOIN onboarding_invitations i ON i.id = k.invitation_id
     WHERE k.id = ? LIMIT 1'
  );
  $stmt->execute([$id]);
  $karyawan = $stmt->fetch();
  if (!$karyawan) {
    json_error('Karyawan tidak ditemukan.', 404);
  }

  // Lengkapi URL foto
  $karyawan['foto_ktp_url']  = $karyawan['foto_ktp_path']  ? rtrim(UPLOAD_URL_BASE, '/') . '/' . $karyawan['foto_ktp_path']  : null;
  $karyawan['foto_diri_url'] = $karyawan['foto_diri_path'] ? rtrim(UPLOAD_URL_BASE, '/') . '/' . $karyawan['foto_diri_path'] : null;

  // Riwayat tes
  $stmt = $db->prepare('SELECT * FROM tes_hasil WHERE karyawan_id = ? ORDER BY dikerjakan_at DESC');
  $stmt->execute([$id]);
  $tes = $stmt->fetchAll();
  foreach ($tes as &$t) {
    $t['jawaban_json'] = $t['jawaban_json'] ? json_decode($t['jawaban_json'], true) : [];
    $t['lulus'] = (int) $t['lulus'];
  }
  unset($t);

  // Riwayat kontrak + sisa hari
  $stmt = $db->prepare(
    'SELECT k.*, DATEDIFF(k.tanggal_berakhir, CURDATE()) AS sisa_hari
     FROM kontrak k WHERE k.karyawan_id = ? ORDER BY k.tanggal_mulai DESC'
  );
  $stmt->execute([$id]);
  $kontrak = $stmt->fetchAll();

  json_success([
    'karyawan' => $karyawan,
    'tes'      => $tes,
    'kontrak'  => $kontrak,
  ]);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
