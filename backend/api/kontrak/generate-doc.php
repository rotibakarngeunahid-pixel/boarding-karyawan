<?php
// GET /api/kontrak/generate-doc?kontrak_id=N   (admin)  — REVISI 3
// Ambil template aktif (.docx/.doc), isi placeholder {{...}} dari data kontrak+karyawan,
// lalu kirim sebagai file unduhan.
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

  // Data kontrak + karyawan
  $k = get_kontrak_document_data($db, $kontrak_id);
  if (!$k) json_error('Kontrak tidak ditemukan.', 404);

  // Template aktif untuk cabang kontrak (fallback ke template Umum).
  $tpl = get_active_kontrak_template($db, $k['cabang'] ?? null);
  if (!$tpl) json_error('Belum ada template kontrak yang diunggah. Upload dulu di menu Kontrak.', 400);

  $path = rtrim(UPLOAD_BASE, '/\\') . '/templates/' . $tpl['filename'];
  if (!is_file($path)) json_error('File template tidak ditemukan di server.', 404);

  // Peta placeholder -> nilai
  $map = kontrak_placeholder_map($k);

  $ext = strtolower(pathinfo($tpl['filename'], PATHINFO_EXTENSION));
  $out_name = 'Kontrak_' . preg_replace('/[^A-Za-z0-9]+/', '_', $k['nomor_kontrak']) . '.' . $ext;

  if ($ext === 'docx') {
    // .docx = arsip zip; teks ada di word/document.xml
    $tmp = tempnam(sys_get_temp_dir(), 'kontrak');
    copy($path, $tmp);

    $zip = new ZipArchive();
    if ($zip->open($tmp) !== true) {
      json_error('Gagal membuka template .docx.', 500);
    }
    $xml = $zip->getFromName('word/document.xml');
    if ($xml === false) {
      $zip->close();
      @unlink($tmp);
      json_error('Isi template .docx tidak ditemukan.', 500);
    }

    // Ganti {{KEY}} walau placeholder terpecah antar-tag XML.
    $xml = replace_kontrak_placeholders($xml, $map, true);

    $zip->addFromString('word/document.xml', $xml);
    $zip->close();

    header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    header('Content-Disposition: attachment; filename="' . $out_name . '"');
    header('Content-Length: ' . filesize($tmp));
    readfile($tmp);
    @unlink($tmp);
    exit;
  }

  // .doc (format lama biner) — best effort: ganti placeholder yang tersimpan sebagai teks polos.
  $content = file_get_contents($path);
  if ($content === false) {
    json_error('Gagal membaca template kontrak.', 500);
  }
  $content = replace_kontrak_placeholders($content, $map, false);
  header('Content-Type: application/msword');
  header('Content-Disposition: attachment; filename="' . $out_name . '"');
  header('Content-Length: ' . strlen($content));
  echo $content;
  exit;
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
