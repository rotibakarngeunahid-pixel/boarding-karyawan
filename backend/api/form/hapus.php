<?php
// POST /api/form/hapus   (admin)
// Body: { id: N } — hanya field KUSTOM yang boleh dihapus.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}
require_auth();

try {
  $db = getDB();
  $body = get_json_body();
  $id = isset($body['id']) ? (int) $body['id'] : 0;
  if (!$id) json_error('Parameter id wajib.', 422);

  $stmt = $db->prepare('SELECT is_builtin FROM form_fields WHERE id = ? LIMIT 1');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if (!$row) json_error('Field tidak ditemukan.', 404);
  if ((int) $row['is_builtin'] === 1) {
    json_error('Field bawaan tidak bisa dihapus. Nonaktifkan saja bila tidak dipakai.', 422);
  }

  $del = $db->prepare('DELETE FROM form_fields WHERE id = ?');
  $del->execute([$id]);

  json_success(null, 'Pertanyaan dihapus.');
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
