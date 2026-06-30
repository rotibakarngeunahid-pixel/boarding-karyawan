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

/**
 * Cabang dari template aktif PERTAMA yang memuat placeholder {{STEMPEL}}.
 * Dipakai editor "Atur Posisi" agar menampilkan template yang benar.
 * @return string|null nama cabang, '' tidak dipakai (null = template Umum), atau null bila tak ada.
 */
function stempel_preview_cabang(PDO $db): ?string {
  $rows = $db->query(
    'SELECT cabang, filename FROM kontrak_template WHERE aktif = 1
     ORDER BY (cabang IS NULL) DESC, cabang ASC, id DESC'
  )->fetchAll();
  foreach ($rows as $r) {
    $p = rtrim(UPLOAD_BASE, '/\\') . '/templates/' . $r['filename'];
    if (!is_file($p)) continue;
    $zip = new ZipArchive();
    if ($zip->open($p) !== true) continue;
    $x = (string) $zip->getFromName('word/document.xml');
    $zip->close();
    $xn = preg_replace_callback('/\{\{.*?\}\}/s', function ($m) {
      return preg_replace('/<[^>]+>/', '', $m[0]);
    }, $x);
    if (strpos($xn, 'STEMPEL') !== false) return $r['cabang']; // null = Umum
  }
  return null;
}

/** Biner gambar stempel (untuk disisipkan ke .docx) atau null. */
function get_stempel_binary(): ?string {
  $p = get_stempel_path();
  if (!$p) return null;
  $b = @file_get_contents($p);
  return ($b === false || $b === '') ? null : $b;
}

// ── Pengaturan posisi/ukuran stempel (disimpan di JSON sidecar) ──
function stempel_meta_path(): string {
  return aset_dir() . 'stempel_meta.json';
}

/** Ambil pengaturan stempel: width (px), offx (px), offy (px). Dengan default rapi. */
function get_stempel_settings(): array {
  $def = ['width' => 120, 'offx' => 0, 'offy' => 0];
  $p = stempel_meta_path();
  if (is_file($p)) {
    $j = json_decode((string) @file_get_contents($p), true);
    if (is_array($j)) {
      return [
        'width' => isset($j['width']) ? max(40, min(400, (int) $j['width'])) : $def['width'],
        'offx'  => isset($j['offx'])  ? max(-400, min(400, (int) $j['offx'])) : 0,
        'offy'  => isset($j['offy'])  ? max(-400, min(400, (int) $j['offy'])) : 0,
      ];
    }
  }
  return $def;
}

/** Simpan pengaturan stempel. */
function save_stempel_settings(array $s): bool {
  $dir = aset_dir();
  if (!is_dir($dir)) @mkdir($dir, 0755, true);
  $clean = [
    'width' => max(40, min(400, (int) ($s['width'] ?? 120))),
    'offx'  => max(-400, min(400, (int) ($s['offx'] ?? 0))),
    'offy'  => max(-400, min(400, (int) ($s['offy'] ?? 0))),
  ];
  return @file_put_contents(stempel_meta_path(), json_encode($clean)) !== false;
}
