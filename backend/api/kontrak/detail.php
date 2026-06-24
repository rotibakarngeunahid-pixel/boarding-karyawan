<?php
// GET /api/kontrak/detail?id=N   (admin)
// Detail kontrak + info karyawan + chain perpanjangan
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
    'SELECT k.*, kr.nama_lengkap, kr.nama_panggilan, kr.no_whatsapp, kr.cabang AS karyawan_cabang,
            DATEDIFF(k.tanggal_berakhir, CURDATE()) AS sisa_hari
     FROM kontrak k
     JOIN karyawan kr ON kr.id = k.karyawan_id
     WHERE k.id = ? LIMIT 1'
  );
  $stmt->execute([$id]);
  $kontrak = $stmt->fetch();
  if (!$kontrak) {
    json_error('Kontrak tidak ditemukan.', 404);
  }

  // Bangun chain perpanjangan: telusuri ke belakang via kontrak_sebelumnya_id
  $chain = [];
  $stmt = $db->prepare('SELECT id, nomor_kontrak, tanggal_mulai, tanggal_berakhir, status, kontrak_sebelumnya_id FROM kontrak WHERE id = ?');

  $cursor = $kontrak['kontrak_sebelumnya_id'];
  $guard = 0;
  while ($cursor && $guard < 50) {
    $stmt->execute([(int) $cursor]);
    $prev = $stmt->fetch();
    if (!$prev) break;
    $chain[] = $prev;
    $cursor = $prev['kontrak_sebelumnya_id'];
    $guard++;
  }
  $chain = array_reverse($chain); // urut dari paling lama

  // Kontrak penerus (yang menjadikan kontrak ini sebagai sebelumnya)
  $stmt = $db->prepare('SELECT id, nomor_kontrak, tanggal_mulai, tanggal_berakhir, status FROM kontrak WHERE kontrak_sebelumnya_id = ?');
  $stmt->execute([$id]);
  $penerus = $stmt->fetchAll();

  json_success([
    'kontrak'       => $kontrak,
    'chain_sebelum' => $chain,
    'penerus'       => $penerus,
  ]);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
