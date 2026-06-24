<?php
// GET /api/tes/hasil   (admin)
//  ?karyawan_id=N (opsional)
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

try {
  $db = getDB();
  $karyawan_id = isset($_GET['karyawan_id']) ? (int) $_GET['karyawan_id'] : 0;

  $sql = 'SELECT h.*, k.nama_lengkap, k.cabang
          FROM tes_hasil h
          JOIN karyawan k ON k.id = h.karyawan_id';
  $params = [];
  if ($karyawan_id) {
    $sql .= ' WHERE h.karyawan_id = ?';
    $params[] = $karyawan_id;
  }
  $sql .= ' ORDER BY h.dikerjakan_at DESC';

  $stmt = $db->prepare($sql);
  $stmt->execute($params);
  $rows = $stmt->fetchAll();

  // Decode jawaban_json agar siap dipakai frontend
  foreach ($rows as &$r) {
    $r['jawaban_json'] = $r['jawaban_json'] ? json_decode($r['jawaban_json'], true) : [];
    $r['lulus'] = (int) $r['lulus'];
  }
  unset($r);

  json_success($rows);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
