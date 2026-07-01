<?php
// GET /api/kontrak/preview-doc   (admin)
//  ?kontrak_id=N           -> dokumen kontrak (.docx) berisi data kontrak asli
//  ?mode=template&cabang=X -> dokumen template cabang (.docx) berisi DATA CONTOH
// Mengirim .docx untuk ditampilkan apa adanya (format asli) di panel admin.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/kontrak_document.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

try {
  $db = getDB();

  $kontrak_id = isset($_GET['kontrak_id']) ? (int) $_GET['kontrak_id'] : 0;

  if ($kontrak_id > 0) {
    $k = get_kontrak_document_data($db, $kontrak_id);
    if (!$k) json_error('Kontrak tidak ditemukan.', 404);

    // Bila sudah ditandatangani & ada snapshot .docx -> kirim snapshot itu
    // (sudah memuat tanda tangan karyawan + stempel). Jadi admin pun melihat
    // tanda tangan karyawan di atas namanya, persis dokumen yang disetujui.
    if (!empty($k['snapshot_docx_path'])) {
      $snap = rtrim(UPLOAD_BASE, '/\\') . '/' . $k['snapshot_docx_path'];
      if (is_file($snap)) {
        $bin = file_get_contents($snap);
        if ($bin !== false) {
          header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
          header('Content-Disposition: inline; filename="kontrak.docx"');
          header('Cache-Control: no-store, no-cache, must-revalidate');
          header('Pragma: no-cache');
          header('Content-Length: ' . strlen($bin));
          echo $bin;
          exit;
        }
      }
    }
  } else {
    // Mode preview template per cabang -> data contoh.
    $cabang = isset($_GET['cabang']) ? trim((string) $_GET['cabang']) : '';
    $k = [
      'nama_lengkap'     => 'Budi Santoso',
      'nama_panggilan'   => 'Budi',
      'jenis_kelamin'    => 'Laki-Laki',
      'no_whatsapp'      => '081234567890',
      'no_ktp'           => '5101234567890001',
      'alamat_tinggal'   => 'Jl. Contoh No. 1, Denpasar',
      'provinsi_lahir'   => 'Bali',
      'tanggal_lahir'    => '2000-01-15',
      'posisi'           => 'Crew',
      'cabang'           => $cabang,
      'nomor_kontrak'    => 'PKWT/RBN/' . date('Y') . '/001',
      'tanggal_mulai'    => date('Y-m-d'),
      'tanggal_berakhir' => date('Y-m-d', strtotime('+3 months')),
      'gaji_pokok'       => 2500000,
      'catatan'          => 'Ini data CONTOH untuk mengecek tampilan template kontrak.',
    ];
  }

  $tpl = get_active_kontrak_template($db, $k['cabang'] ?? null);
  if (!$tpl) json_error('Belum ada template kontrak untuk cabang ini.', 404);

  $ext = strtolower(pathinfo($tpl['filename'], PATHINFO_EXTENSION));
  if ($ext !== 'docx') json_error('Template bukan .docx.', 415); // frontend fallback ke teks

  $path = rtrim(UPLOAD_BASE, '/\\') . '/templates/' . $tpl['filename'];

  // Mode atur-posisi (pos=1): render stempel di posisi NATURAL (offset 0) sebagai
  // acuan editor seret, sehingga "yang dilihat = yang dirender".
  $pos = isset($_GET['pos']) && $_GET['pos'] === '1';
  $map = kontrak_placeholder_map($k);
  if ($pos) {
    $ss = get_stempel_settings();
    $content = fill_docx_template(
      $path, $map, null, get_stempel_binary(),
      ['width' => (int) $ss['width'], 'offx' => 0, 'offy' => 0]
    );
  } else {
    $content = fill_docx_template($path, $map, null, get_stempel_binary());
  }

  header('Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  header('Content-Disposition: inline; filename="kontrak.docx"');
  // Jangan cache: preview harus selalu ikut perubahan template/stempel terbaru.
  header('Cache-Control: no-store, no-cache, must-revalidate');
  header('Pragma: no-cache');
  header('Content-Length: ' . strlen($content));
  echo $content;
  exit;
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
