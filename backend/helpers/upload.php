<?php
// ============================================================
// HELPER: UPLOAD FILE GAMBAR
// Validasi MIME (jpeg/png/webp), max 5MB, rename aman.
// ============================================================

require_once __DIR__ . '/../config/database.php';

define('UPLOAD_MAX_SIZE', 5 * 1024 * 1024); // 5MB

/**
 * Handle upload satu file gambar.
 *
 * @param array  $file     entri dari $_FILES['xxx']
 * @param string $subdir   subfolder di dalam uploads/ (mis. 'ktp', 'foto_diri', 'soal')
 * @param int    $maxBytes batas ukuran file (default 5MB)
 * @return array { ok: bool, filename?: string, path?: string, url?: string, error?: string }
 */
function handle_upload(array $file, string $subdir, int $maxBytes = UPLOAD_MAX_SIZE): array {
  if (!isset($file['error']) || is_array($file['error'])) {
    return ['ok' => false, 'error' => 'Parameter file tidak valid.'];
  }

  switch ($file['error']) {
    case UPLOAD_ERR_OK:
      break;
    case UPLOAD_ERR_NO_FILE:
      return ['ok' => false, 'error' => 'Tidak ada file yang diunggah.'];
    case UPLOAD_ERR_INI_SIZE:
    case UPLOAD_ERR_FORM_SIZE:
      return ['ok' => false, 'error' => 'Ukuran file melebihi batas server.'];
    default:
      return ['ok' => false, 'error' => 'Gagal mengunggah file.'];
  }

  if ($file['size'] > $maxBytes) {
    $mb = round($maxBytes / (1024 * 1024), 1);
    return ['ok' => false, 'error' => "Ukuran file maksimal {$mb}MB."];
  }

  // Deteksi MIME asli dari isi file, bukan dari ekstensi/klien.
  $finfo = new finfo(FILEINFO_MIME_TYPE);
  $mime = $finfo->file($file['tmp_name']);

  $allowed = [
    'image/jpeg' => 'jpg',
    'image/png'  => 'png',
    'image/webp' => 'webp',
  ];

  if (!isset($allowed[$mime])) {
    return ['ok' => false, 'error' => 'Format file harus JPG, PNG, atau WEBP.'];
  }

  $ext = $allowed[$mime];
  $target_dir = rtrim(UPLOAD_BASE, '/\\') . '/' . trim($subdir, '/\\') . '/';
  if (!is_dir($target_dir)) {
    @mkdir($target_dir, 0755, true);
  }
  if (!is_writable($target_dir)) {
    return ['ok' => false, 'error' => 'Folder upload tidak writable: ' . $subdir];
  }

  $filename = sprintf('%d_%s.%s', time(), bin2hex(random_bytes(8)), $ext);
  $dest = $target_dir . $filename;

  if (!move_uploaded_file($file['tmp_name'], $dest)) {
    return ['ok' => false, 'error' => 'Gagal menyimpan file ke server.'];
  }

  $relative = trim($subdir, '/\\') . '/' . $filename;
  return [
    'ok'       => true,
    'filename' => $filename,
    'path'     => $relative,
    'url'      => rtrim(UPLOAD_URL_BASE, '/') . '/' . $relative,
  ];
}
