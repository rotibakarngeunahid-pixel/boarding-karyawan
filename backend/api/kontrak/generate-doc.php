<?php
// GET /api/kontrak/generate-doc?kontrak_id=N   (admin)  — REVISI 3
// Ambil template aktif (.docx/.doc), isi placeholder {{...}} dari data kontrak+karyawan,
// lalu kirim sebagai file unduhan.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

$kontrak_id = isset($_GET['kontrak_id']) ? (int) $_GET['kontrak_id'] : 0;
if (!$kontrak_id) json_error('Parameter kontrak_id wajib.', 422);

function fmt_tanggal_id(?string $v): string {
  if (!$v) return '-';
  $bulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  $ts = strtotime($v);
  if (!$ts) return '-';
  return (int) date('j', $ts) . ' ' . $bulan[(int) date('n', $ts)] . ' ' . date('Y', $ts);
}

try {
  $db = getDB();

  // Data kontrak + karyawan
  $stmt = $db->prepare(
    'SELECT k.*, kr.nama_lengkap, kr.nama_panggilan, kr.jenis_kelamin, kr.no_whatsapp,
            kr.no_ktp, kr.alamat_tinggal, kr.provinsi_lahir, kr.tanggal_lahir
     FROM kontrak k JOIN karyawan kr ON kr.id = k.karyawan_id
     WHERE k.id = ? LIMIT 1'
  );
  $stmt->execute([$kontrak_id]);
  $k = $stmt->fetch();
  if (!$k) json_error('Kontrak tidak ditemukan.', 404);

  // Template aktif
  $tpl = $db->query('SELECT * FROM kontrak_template WHERE aktif = 1 ORDER BY id DESC LIMIT 1')->fetch();
  if (!$tpl) json_error('Belum ada template kontrak yang diunggah. Upload dulu di menu Kontrak.', 400);

  $path = rtrim(UPLOAD_BASE, '/\\') . '/templates/' . $tpl['filename'];
  if (!is_file($path)) json_error('File template tidak ditemukan di server.', 404);

  $gaji = $k['gaji_pokok'] !== null && $k['gaji_pokok'] !== ''
    ? 'Rp ' . number_format((float) $k['gaji_pokok'], 0, ',', '.')
    : '-';

  // Peta placeholder -> nilai
  $map = [
    'NAMA_LENGKAP'     => (string) $k['nama_lengkap'],
    'NAMA_PANGGILAN'   => (string) ($k['nama_panggilan'] ?? ''),
    'JENIS_KELAMIN'    => (string) ($k['jenis_kelamin'] ?? ''),
    'NO_WHATSAPP'      => (string) ($k['no_whatsapp'] ?? ''),
    'NO_KTP'           => (string) ($k['no_ktp'] ?? ''),
    'ALAMAT'           => (string) ($k['alamat_tinggal'] ?? ''),
    'PROVINSI_LAHIR'   => (string) ($k['provinsi_lahir'] ?? ''),
    'TANGGAL_LAHIR'    => fmt_tanggal_id($k['tanggal_lahir']),
    'POSISI'           => (string) $k['posisi'],
    'CABANG'           => (string) $k['cabang'],
    'NOMOR_KONTRAK'    => (string) $k['nomor_kontrak'],
    'TANGGAL_MULAI'    => fmt_tanggal_id($k['tanggal_mulai']),
    'TANGGAL_BERAKHIR' => fmt_tanggal_id($k['tanggal_berakhir']),
    'GAJI_POKOK'       => $gaji,
    'TANGGAL_HARI_INI' => fmt_tanggal_id(date('Y-m-d')),
  ];

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

    // Ganti {{KEY}} walau placeholder terpecah antar-tag XML:
    // tangkap {{...}}, bersihkan tag di dalamnya untuk dapat KEY, lalu ganti seluruhnya.
    $xml = preg_replace_callback('/\{\{(.*?)\}\}/s', function ($m) use ($map) {
      $key = strtoupper(trim(preg_replace('/<[^>]+>/', '', $m[1])));
      if (array_key_exists($key, $map)) {
        return htmlspecialchars($map[$key], ENT_QUOTES | ENT_XML1, 'UTF-8');
      }
      return $m[0]; // biarkan jika placeholder tak dikenal
    }, $xml);

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
  foreach ($map as $key => $val) {
    $content = str_replace('{{' . $key . '}}', $val, $content);
  }
  header('Content-Type: application/msword');
  header('Content-Disposition: attachment; filename="' . $out_name . '"');
  header('Content-Length: ' . strlen($content));
  echo $content;
  exit;
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
