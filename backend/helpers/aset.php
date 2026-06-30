<?php
// ============================================================
// HELPER: ASET (stempel/cap perusahaan)
// Disimpan sebagai file tunggal di uploads/assets/stempel.<ext>.
// Tidak butuh tabel DB (tanpa migrasi tambahan).
// ============================================================

require_once __DIR__ . '/../config/database.php';

function aset_dir(): string {
  return rtrim(UPLOAD_BASE, '/\\') . '/assets/';
}

/** Path absolut file stempel (png/jpg) atau null bila belum ada. */
function get_stempel_path(): ?string {
  $dir = aset_dir();
  foreach (['png', 'jpg', 'jpeg'] as $ext) {
    $p = $dir . 'stempel.' . $ext;
    if (is_file($p)) return $p;
  }
  return null;
}

/** Info stempel untuk admin (url, filename) atau null. */
function get_stempel_info(): ?array {
  $p = get_stempel_path();
  if (!$p) return null;
  $fname = basename($p);
  return [
    'filename'    => $fname,
    'url'         => rtrim(UPLOAD_URL_BASE, '/') . '/assets/' . $fname,
    'uploaded_at' => @date('c', @filemtime($p) ?: time()),
  ];
}

/** Biner gambar stempel (untuk disisipkan ke .docx) atau null. */
function get_stempel_binary(): ?string {
  $p = get_stempel_path();
  if (!$p) return null;
  $b = @file_get_contents($p);
  return ($b === false || $b === '') ? null : $b;
}
