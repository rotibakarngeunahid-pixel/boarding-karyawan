<?php
// /api/aset/stempel   (admin)
//  GET  -> info stempel aktif (url) atau null
//  POST -> upload gambar stempel (multipart field 'stempel', PNG/JPG, maks 2MB)
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/aset.php';

$method = $_SERVER['REQUEST_METHOD'];
require_auth();

try {
  if ($method === 'GET') {
    json_success(get_stempel_info());
  }

  if ($method === 'POST') {
    if (empty($_FILES['stempel'])) {
      json_error('File stempel wajib diunggah.', 422);
    }
    $file = $_FILES['stempel'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
      json_error('Gagal mengunggah file (kode ' . ($file['error'] ?? '?') . ').', 422);
    }
    if ($file['size'] > 2 * 1024 * 1024) {
      json_error('Ukuran stempel maksimal 2MB.', 422);
    }

    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($ext, ['png', 'jpg', 'jpeg'], true)) {
      json_error('Stempel harus berformat PNG atau JPG.', 422, ['stempel']);
    }

    // Pastikan benar-benar gambar png/jpeg.
    $info = @getimagesize($file['tmp_name']);
    if (!$info || !in_array($info[2], [IMAGETYPE_PNG, IMAGETYPE_JPEG], true)) {
      json_error('File bukan gambar PNG/JPG yang valid.', 422, ['stempel']);
    }

    $dir = aset_dir();
    if (!is_dir($dir)) @mkdir($dir, 0755, true);
    if (!is_writable($dir)) {
      json_error('Folder uploads/assets/ tidak writable.', 500);
    }

    // Hapus stempel lama (apapun ekstensinya).
    foreach (['png', 'jpg', 'jpeg'] as $e) {
      $old = $dir . 'stempel.' . $e;
      if (is_file($old)) @unlink($old);
    }

    $norm = ($ext === 'jpeg') ? 'jpg' : $ext;
    $dest = $dir . 'stempel.' . $norm;
    if (!move_uploaded_file($file['tmp_name'], $dest)) {
      json_error('Gagal menyimpan stempel ke server.', 500);
    }

    json_success([
      'filename' => 'stempel.' . $norm,
      'url'      => rtrim(UPLOAD_URL_BASE, '/') . '/assets/stempel.' . $norm,
    ], 'Stempel berhasil diunggah.', 201);
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
