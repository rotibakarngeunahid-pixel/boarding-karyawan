<?php
// /api/cabang   (admin)
//  GET    ?aktif=1   -> daftar cabang (semua / hanya aktif)
//  POST    { nama, urutan? }            -> tambah cabang
//  PUT    ?id=N { nama?, aktif?, urutan? } -> ubah cabang
//  DELETE ?id=N                         -> hapus cabang (hanya bila tidak dipakai)
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/cabang.php';

$method = get_effective_method();
require_auth();

try {
  $db = getDB();

  if ($method === 'GET') {
    $activeOnly = isset($_GET['aktif']) && $_GET['aktif'] === '1';
    json_success(get_cabang_list($db, $activeOnly));
  }

  if ($method === 'POST') {
    $body = get_json_body();
    $nama = trim((string) ($body['nama'] ?? ''));
    if ($nama === '') json_error('Nama cabang wajib diisi.', 422, ['nama']);
    if (cabang_is_valid($db, $nama)) json_error('Cabang dengan nama itu sudah ada.', 409);

    $urutan = isset($body['urutan']) ? (int) $body['urutan'] : 0;
    $stmt = $db->prepare('INSERT INTO cabang (nama, urutan) VALUES (?, ?)');
    $stmt->execute([$nama, $urutan]);

    json_success([
      'id'     => (int) $db->lastInsertId(),
      'nama'   => $nama,
      'aktif'  => 1,
      'urutan' => $urutan,
    ], 'Cabang berhasil ditambahkan.', 201);
  }

  if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) json_error('Parameter id wajib.', 422);

    $body = get_json_body();
    $sets = [];
    $params = [];

    if (isset($body['nama'])) {
      $nama = trim((string) $body['nama']);
      if ($nama === '') json_error('Nama cabang tidak boleh kosong.', 422, ['nama']);
      $chk = $db->prepare('SELECT 1 FROM cabang WHERE nama = ? AND id <> ? LIMIT 1');
      $chk->execute([$nama, $id]);
      if ($chk->fetchColumn()) json_error('Nama cabang sudah dipakai cabang lain.', 409);
      $sets[] = 'nama = ?';
      $params[] = $nama;
    }
    if (array_key_exists('aktif', $body)) {
      $sets[] = 'aktif = ?';
      $params[] = !empty($body['aktif']) ? 1 : 0;
    }
    if (isset($body['urutan'])) {
      $sets[] = 'urutan = ?';
      $params[] = (int) $body['urutan'];
    }
    if (!$sets) json_error('Tidak ada perubahan yang dikirim.', 422);

    $params[] = $id;
    $stmt = $db->prepare('UPDATE cabang SET ' . implode(', ', $sets) . ' WHERE id = ?');
    $stmt->execute($params);
    json_success(null, 'Cabang berhasil diperbarui.');
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) { $b = get_json_body(); $id = isset($b['id']) ? (int) $b['id'] : 0; }
    if (!$id) json_error('Parameter id wajib.', 422);

    $stmt = $db->prepare('SELECT nama FROM cabang WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) json_error('Cabang tidak ditemukan.', 404);

    $used = cabang_usage_count($db, $row['nama']);
    if ($used > 0) {
      json_error(
        'Cabang "' . $row['nama'] . '" masih dipakai ' . $used . ' data. Nonaktifkan saja (jangan dihapus) agar data lama tetap aman.',
        409
      );
    }

    $db->prepare('DELETE FROM cabang WHERE id = ?')->execute([$id]);
    json_success(null, 'Cabang berhasil dihapus.');
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
