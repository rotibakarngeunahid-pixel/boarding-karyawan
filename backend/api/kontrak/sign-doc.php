<?php
// GET /api/kontrak/sign-doc?token=XXX   (PUBLIC)
// Mengirim dokumen kontrak (.docx) yang sudah diisi data, untuk DITAMPILKAN
// apa adanya (format asli) di halaman tanda tangan.
// - Bila sudah ditandatangani & ada snapshot .docx -> kirim snapshot (yang disetujui).
// - Bila belum -> render dari template aktif cabang tsb (fallback template Umum).
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/kontrak_document.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}

$token = trim((string) ($_GET['token'] ?? ''));
if ($token === '') json_error('Token wajib disertakan.', 422);

try {
  $db = getDB();

  $k = get_kontrak_document_by_token($db, $token);
  if (!$k) json_error('Link tanda tangan tidak ditemukan.', 404);

  // 1. Snapshot dokumen yang sudah ditandatangani (paling sahih).
  if (!empty($k['snapshot_docx_path'])) {
    $snap = rtrim(UPLOAD_BASE, '/\\') . '/' . $k['snapshot_docx_path'];
    if (is_file($snap)) {
      $bin = file_get_contents($snap);
      if ($bin !== false) {
        header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        header('Content-Disposition: inline; filename="kontrak.docx"');
        header('Content-Length: ' . strlen($bin));
        echo $bin;
        exit;
      }
    }
  }

  // 2. Render dari template aktif untuk cabang kontrak.
  $tpl = get_active_kontrak_template($db, $k['cabang'] ?? null);
  if (!$tpl) json_error('Belum ada template kontrak untuk cabang ini.', 404);

  $ext = strtolower(pathinfo($tpl['filename'], PATHINFO_EXTENSION));
  if ($ext !== 'docx') json_error('Template bukan .docx.', 415); // frontend fallback ke teks

  $path = rtrim(UPLOAD_BASE, '/\\') . '/templates/' . $tpl['filename'];
  $content = fill_docx_template($path, kontrak_placeholder_map($k));

  header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  header('Content-Disposition: inline; filename="kontrak.docx"');
  header('Content-Length: ' . strlen($content));
  echo $content;
  exit;
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
