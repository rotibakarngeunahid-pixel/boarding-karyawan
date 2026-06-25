<?php
// POST /api/kontrak/hapus  (admin)
// Body: { id: N }
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/delete.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}
require_auth();

try {
  $db = getDB();
  $body = get_json_body();
  $id = isset($body['id']) ? (int) $body['id'] : 0;
  if (!$id) json_error('Parameter id wajib.', 422);

  $db->beginTransaction();
  $deleted = hard_delete_kontrak($db, $id);
  if (!$deleted) {
    $db->rollBack();
    json_error('Kontrak tidak ditemukan.', 404);
  }
  $db->commit();

  json_success(null, 'Kontrak berhasil dihapus.');
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
