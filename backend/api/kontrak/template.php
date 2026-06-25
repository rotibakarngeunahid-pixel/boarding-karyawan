<?php
// /api/kontrak/template   (admin)  — REVISI 3
//  GET  -> info template kontrak yang sedang aktif
//  POST -> upload template .doc/.docx baru (multipart, field file: 'template')
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$auth = require_auth();

try {
  $db = getDB();

  if ($method === 'GET') {
    $row = $db->query(
      'SELECT id, original_name, uploaded_at FROM kontrak_template WHERE aktif = 1 ORDER BY id DESC LIMIT 1'
    )->fetch();
    json_success($row ?: null);
  }

  if ($method === 'POST') {
    if (empty($_FILES['template'])) {
      json_error('File template wajib diunggah.', 422);
    }
    $file = $_FILES['template'];
    if ($file['error'] !== UPLOAD_ERR_OK) {
      json_error('Gagal mengunggah file (kode ' . $file['error'] . ').', 422);
    }
    if ($file['size'] > 5 * 1024 * 1024) {
      json_error('Ukuran template maksimal 5MB.', 422);
    }

    $orig = $file['name'];
    $ext = strtolower(pathinfo($orig, PATHINFO_EXTENSION));
    if (!in_array($ext, ['doc', 'docx'], true)) {
      json_error('Template harus berformat .doc atau .docx.', 422);
    }

    $dir = rtrim(UPLOAD_BASE, '/\\') . '/templates/';
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    if (!is_writable($dir)) {
      json_error('Folder uploads/templates/ tidak writable.', 500);
    }

    $filename = sprintf('template_%d_%s.%s', time(), bin2hex(random_bytes(6)), $ext);
    if (!move_uploaded_file($file['tmp_name'], $dir . $filename)) {
      json_error('Gagal menyimpan template ke server.', 500);
    }

    // Nonaktifkan template lama, simpan yang baru sebagai aktif.
    $db->beginTransaction();
    $db->exec('UPDATE kontrak_template SET aktif = 0');
    $stmt = $db->prepare(
      'INSERT INTO kontrak_template (filename, original_name, aktif, uploaded_by) VALUES (?, ?, 1, ?)'
    );
    $stmt->execute([$filename, $orig, $auth['sub'] ?? null]);
    $db->commit();

    json_success([
      'id'            => (int) $db->lastInsertId(),
      'original_name' => $orig,
    ], 'Template kontrak berhasil diunggah.', 201);
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
