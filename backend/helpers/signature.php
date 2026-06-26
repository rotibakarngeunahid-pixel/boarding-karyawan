<?php
// ============================================================
// HELPER: SIMPAN TANDA TANGAN (data URL base64 -> file PNG)
// Dipakai halaman tanda tangan kontrak publik.
// ============================================================

require_once __DIR__ . '/../config/database.php';

define('SIGNATURE_MAX_SIZE', 2 * 1024 * 1024); // 2MB hasil canvas

/**
 * Simpan gambar tanda tangan dari data URL base64 (mis. "data:image/png;base64,....").
 *
 * @param string $dataUrl data URL hasil canvas.toDataURL()
 * @param string $subdir  subfolder di dalam uploads/ (default 'ttd')
 * @return array { ok: bool, filename?, path?, url?, error? }
 */
function save_signature_data_url(string $dataUrl, string $subdir = 'ttd'): array {
  if (!preg_match('#^data:image/(png|jpeg|jpg|webp);base64,#i', $dataUrl, $m)) {
    return ['ok' => false, 'error' => 'Format tanda tangan tidak valid.'];
  }

  $extMap = ['png' => 'png', 'jpeg' => 'jpg', 'jpg' => 'jpg', 'webp' => 'webp'];
  $ext = $extMap[strtolower($m[1])] ?? 'png';

  $base64 = substr($dataUrl, strpos($dataUrl, ',') + 1);
  $binary = base64_decode(strtr($base64, ' ', '+'), true);
  if ($binary === false || $binary === '') {
    return ['ok' => false, 'error' => 'Gagal membaca data tanda tangan.'];
  }
  if (strlen($binary) > SIGNATURE_MAX_SIZE) {
    return ['ok' => false, 'error' => 'Ukuran tanda tangan terlalu besar.'];
  }

  // Pastikan benar-benar gambar yang valid.
  if (function_exists('getimagesizefromstring')) {
    $info = @getimagesizefromstring($binary);
    if ($info === false) {
      return ['ok' => false, 'error' => 'Data tanda tangan bukan gambar yang valid.'];
    }
  }

  $target_dir = rtrim(UPLOAD_BASE, '/\\') . '/' . trim($subdir, '/\\') . '/';
  if (!is_dir($target_dir)) {
    @mkdir($target_dir, 0755, true);
  }
  if (!is_writable($target_dir)) {
    return ['ok' => false, 'error' => 'Folder upload tidak writable: ' . $subdir];
  }

  $filename = sprintf('ttd_%d_%s.%s', time(), bin2hex(random_bytes(8)), $ext);
  $dest = $target_dir . $filename;
  if (file_put_contents($dest, $binary) === false) {
    return ['ok' => false, 'error' => 'Gagal menyimpan tanda tangan ke server.'];
  }

  $relative = trim($subdir, '/\\') . '/' . $filename;
  return [
    'ok'       => true,
    'filename' => $filename,
    'path'     => $relative,
    'url'      => rtrim(UPLOAD_URL_BASE, '/') . '/' . $relative,
  ];
}
