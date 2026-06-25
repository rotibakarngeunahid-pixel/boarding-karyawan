<?php
// /api/kontrak   (admin)
//  GET    ?status= ?cabang= ?karyawan_id=
//  DELETE ?id=N hard delete kontrak
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/delete.php';

$method = $_SERVER['REQUEST_METHOD'];
if ($method === 'POST' && strtoupper($_GET['_method'] ?? '') === 'DELETE') {
  $method = 'DELETE';
}
require_auth();

try {
  $db = getDB();

  if ($method === 'GET') {
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
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) json_error('Parameter id wajib.', 422);

    $db->beginTransaction();
    $deleted = hard_delete_kontrak($db, $id);
    if (!$deleted) {
      $db->rollBack();
      json_error('Kontrak tidak ditemukan.', 404);
    }
    $db->commit();

    json_success(null, 'Kontrak berhasil dihapus.');
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
