<?php
// POST /api/tes/hapus-soal  (admin)
// Body: { id: N }
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/upload.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}
require_auth();

try {
  $db = getDB();
  $body = get_json_body();
  $id = isset($body['id']) ? (int) $body['id'] : 0;
  if (!$id) json_error('Parameter id wajib.', 422);

  $stmt = $db->prepare('SELECT question_image FROM tes_soal WHERE id = ? LIMIT 1');
  $stmt->execute([$id]);
  $row = $stmt->fetch();
  if (!$row) {
    json_error('Soal tidak ditemukan.', 404);
  }

  $imagePath = $row['question_image'] ?? null;
  $deleteImage = false;
  if ($imagePath) {
    $stmt = $db->prepare('SELECT COUNT(*) FROM tes_soal WHERE question_image = ? AND id <> ?');
    $stmt->execute([$imagePath, $id]);
    $deleteImage = ((int) $stmt->fetchColumn()) === 0;
  }

  $stmt = $db->prepare('DELETE FROM tes_soal WHERE id = ?');
  $stmt->execute([$id]);

  if ($deleteImage) {
    delete_uploaded_file($imagePath);
  }

  json_success(null, 'Soal berhasil dihapus.');
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
