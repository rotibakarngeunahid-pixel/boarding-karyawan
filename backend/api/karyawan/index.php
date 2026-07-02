<?php
// /api/karyawan
//  GET (admin): list + filter ?cabang= ?status= ?search= ?status_tes=
//  POST (admin): input karyawan manual (multipart, field mengikuti Formulir Onboarding)
//  PUT (admin): ?id=N update status karyawan
//  DELETE (admin): ?id=N hard delete karyawan + data terkait
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/delete.php';
require_once __DIR__ . '/../../helpers/form.php';
require_once __DIR__ . '/../../helpers/cabang.php';

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
    $rows = $stmt->fetchAll();

    // Driver PDO sebagian hosting (libmysqlclient) mengembalikan SEMUA angka
    // sebagai string ("0") -> badge status tes di frontend salah baca
    // (perbandingan ketat === 0 gagal, string "0" truthy). Cast eksplisit.
    foreach ($rows as &$r) {
      $r['id']                  = (int) $r['id'];
      $r['invitation_id']       = $r['invitation_id'] !== null ? (int) $r['invitation_id'] : null;
      $r['skor_tes']            = (float) $r['skor_tes'];
      $r['lulus_tes']           = (int) $r['lulus_tes'];
      $r['total_percobaan_tes'] = (int) $r['total_percobaan_tes'];
    }
    unset($r);
    json_success($rows);
  }

  if ($method === 'POST') {
    // Input karyawan manual (tanpa undangan onboarding). Multipart: field mengikuti
    // definisi Formulir Onboarding + field kerja yang diisi admin langsung.
    $cabang = trim((string) ($_POST['cabang'] ?? ''));
    if ($cabang === '' || !cabang_is_valid($db, $cabang)) {
      json_error('Cabang wajib dipilih dan harus valid.', 422, ['cabang']);
    }

    $status = $_POST['status'] ?? 'aktif';
    if (!in_array($status, ['aktif', 'nonaktif', 'resigned'], true)) {
      $status = 'aktif';
    }

    // Kumpulkan & validasi jawaban form (file opsional untuk input manual admin).
    $collected = collect_karyawan_columns($db, $_POST, $_FILES, true);
    $columns = $collected['columns'];
    $custom  = $collected['custom'];

    // Field kerja yang diisi admin (bukan bagian Formulir Onboarding).
    $columns['invitation_id'] = null;
    $columns['cabang']        = $cabang;
    $columns['posisi']        = trim((string) ($_POST['posisi'] ?? '')) ?: null;
    $columns['status']        = $status;
    $tgl = trim((string) ($_POST['tanggal_bergabung'] ?? ''));
    $columns['tanggal_bergabung'] = $tgl !== '' ? $tgl : null;
    $columns['data_tambahan'] = $custom ? json_encode(array_values($custom), JSON_UNESCAPED_UNICODE) : null;

    $cols = array_keys($columns);
    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
    $sql = 'INSERT INTO karyawan (' . implode(', ', $cols) . ') VALUES (' . $placeholders . ')';

    $stmt = $db->prepare($sql);
    $stmt->execute(array_values($columns));
    $karyawan_id = (int) $db->lastInsertId();

    json_success(['karyawan_id' => $karyawan_id], 'Karyawan berhasil ditambahkan.', 201);
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
