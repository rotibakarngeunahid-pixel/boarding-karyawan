<?php
// GET /api/kontrak   (admin)
//  ?status= ?cabang= ?karyawan_id=
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

try {
  $db = getDB();

  $where = [];
  $params = [];
  if (!empty($_GET['status'])) {
    $where[] = 'k.status = ?';
    $params[] = $_GET['status'];
  }
  if (!empty($_GET['cabang'])) {
    $where[] = 'k.cabang = ?';
    $params[] = $_GET['cabang'];
  }
  if (!empty($_GET['karyawan_id'])) {
    $where[] = 'k.karyawan_id = ?';
    $params[] = (int) $_GET['karyawan_id'];
  }

  $sql = 'SELECT k.*, kr.nama_lengkap, kr.nama_panggilan, kr.no_whatsapp,
                 DATEDIFF(k.tanggal_berakhir, CURDATE()) AS sisa_hari
          FROM kontrak k
          JOIN karyawan kr ON kr.id = k.karyawan_id';
  if ($where) {
    $sql .= ' WHERE ' . implode(' AND ', $where);
  }
  $sql .= ' ORDER BY k.tanggal_berakhir ASC';

  $stmt = $db->prepare($sql);
  $stmt->execute($params);
  json_success($stmt->fetchAll());
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
