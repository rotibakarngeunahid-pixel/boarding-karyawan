<?php
// /api/karyawan
//  GET (admin): list + filter ?cabang= ?status= ?search= ?status_tes=
//  PUT (admin): ?id=N update status karyawan
//  DELETE (admin): ?id=N hard delete karyawan + data terkait
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/delete.php';

$method = get_effective_method();
require_auth();

try {
  $db = getDB();

  if ($method === 'GET') {
    $where = [];
    $params = [];

    if (!empty($_GET['cabang'])) {
      $where[] = 'k.cabang = ?';
      $params[] = $_GET['cabang'];
    }
    if (!empty($_GET['status'])) {
      $where[] = 'k.status = ?';
      $params[] = $_GET['status'];
    }
    if (isset($_GET['status_tes']) && $_GET['status_tes'] !== '') {
      if ($_GET['status_tes'] === 'belum') {
        $where[] = 'k.total_percobaan_tes = 0';
      } else {
        $where[] = 'k.lulus_tes = ?';
        $params[] = $_GET['status_tes'] === 'lulus' ? 1 : 0;
      }
    }
    if (!empty($_GET['search'])) {
      $where[] = '(k.nama_lengkap LIKE ? OR k.nama_panggilan LIKE ? OR k.no_whatsapp LIKE ?)';
      $like = '%' . $_GET['search'] . '%';
      array_push($params, $like, $like, $like);
    }

    $sql = 'SELECT k.*, i.status AS invitation_status
            FROM karyawan k
            LEFT JOIN onboarding_invitations i ON i.id = k.invitation_id';
    if ($where) {
      $sql .= ' WHERE ' . implode(' AND ', $where);
    }
    $sql .= ' ORDER BY k.created_at DESC';

    $stmt = $db->prepare($sql);
    $stmt->execute($params);
    json_success($stmt->fetchAll());
  }

  if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) json_error('Parameter id wajib.', 422);

    $body = get_json_body();
    $status = $body['status'] ?? '';
    if (!in_array($status, ['aktif', 'nonaktif', 'resigned'], true)) {
      json_error('Status tidak valid.', 422);
    }

    $stmt = $db->prepare('UPDATE karyawan SET status = ? WHERE id = ?');
    $stmt->execute([$status, $id]);
    json_success(null, 'Status karyawan diperbarui.');
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) { $b = get_json_body(); $id = isset($b['id']) ? (int) $b['id'] : 0; }
    if (!$id) json_error('Parameter id wajib.', 422);

    $db->beginTransaction();
    $result = hard_delete_karyawan($db, $id, true);
    if (!$result['deleted']) {
      $db->rollBack();
      json_error('Karyawan tidak ditemukan.', 404);
    }
    $db->commit();

    delete_uploaded_files($result['files']);
    json_success(null, 'Karyawan berhasil dihapus.');
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
