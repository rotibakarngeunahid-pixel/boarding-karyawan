<?php
// GET /api/kontrak/preview?kontrak_id=N   (admin)
// Mengembalikan preview teks kontrak dari template aktif bila tersedia.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/kontrak_document.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

$kontrak_id = isset($_GET['kontrak_id']) ? (int) $_GET['kontrak_id'] : 0;
if (!$kontrak_id) json_error('Parameter kontrak_id wajib.', 422);

try {
  $db = getDB();

  $k = get_kontrak_document_data($db, $kontrak_id);
  if (!$k) json_error('Kontrak tidak ditemukan.', 404);

  json_success(render_kontrak_preview($db, $k));
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
