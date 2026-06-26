<?php
// Helper pembuatan dokumen/preview kontrak kerja.

function kontrak_fmt_tanggal_id(?string $value): string {
  if (!$value) return '-';
  $bulan = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  $ts = strtotime($value);
  if (!$ts) return '-';
  return (int) date('j', $ts) . ' ' . $bulan[(int) date('n', $ts)] . ' ' . date('Y', $ts);
}

function get_kontrak_document_data(PDO $db, int $kontrakId): ?array {
  $stmt = $db->prepare(
    'SELECT k.*, kr.nama_lengkap, kr.nama_panggilan, kr.jenis_kelamin, kr.no_whatsapp,
            kr.no_ktp, kr.alamat_tinggal, kr.provinsi_lahir, kr.tanggal_lahir
     FROM kontrak k JOIN karyawan kr ON kr.id = k.karyawan_id
     WHERE k.id = ? LIMIT 1'
  );
  $stmt->execute([$kontrakId]);
  $row = $stmt->fetch();
  return $row ?: null;
}

function get_kontrak_document_by_token(PDO $db, string $token): ?array {
  $stmt = $db->prepare(
    'SELECT k.*, kr.nama_lengkap, kr.nama_panggilan, kr.jenis_kelamin, kr.no_whatsapp,
            kr.no_ktp, kr.alamat_tinggal, kr.provinsi_lahir, kr.tanggal_lahir
     FROM kontrak k JOIN karyawan kr ON kr.id = k.karyawan_id
     WHERE k.sign_token = ? LIMIT 1'
  );
  $stmt->execute([$token]);
  $row = $stmt->fetch();
  return $row ?: null;
}

function get_active_kontrak_template(PDO $db): ?array {
  $row = $db->query('SELECT * FROM kontrak_template WHERE aktif = 1 ORDER BY id DESC LIMIT 1')->fetch();
  return $row ?: null;
}

function kontrak_placeholder_map(array $k): array {
  $gaji = $k['gaji_pokok'] !== null && $k['gaji_pokok'] !== ''
    ? 'Rp ' . number_format((float) $k['gaji_pokok'], 0, ',', '.')
    : '-';

  return [
    'NAMA_LENGKAP'     => (string) $k['nama_lengkap'],
    'NAMA_PANGGILAN'   => (string) ($k['nama_panggilan'] ?? ''),
    'JENIS_KELAMIN'    => (string) ($k['jenis_kelamin'] ?? ''),
    'NO_WHATSAPP'      => (string) ($k['no_whatsapp'] ?? ''),
    'NO_KTP'           => (string) ($k['no_ktp'] ?? ''),
    'ALAMAT'           => (string) ($k['alamat_tinggal'] ?? ''),
    'PROVINSI_LAHIR'   => (string) ($k['provinsi_lahir'] ?? ''),
    'TANGGAL_LAHIR'    => kontrak_fmt_tanggal_id($k['tanggal_lahir'] ?? null),
    'POSISI'           => (string) $k['posisi'],
    'CABANG'           => (string) $k['cabang'],
    'NOMOR_KONTRAK'    => (string) $k['nomor_kontrak'],
    'TANGGAL_MULAI'    => kontrak_fmt_tanggal_id($k['tanggal_mulai'] ?? null),
    'TANGGAL_BERAKHIR' => kontrak_fmt_tanggal_id($k['tanggal_berakhir'] ?? null),
    'GAJI_POKOK'       => $gaji,
    'TANGGAL_HARI_INI' => kontrak_fmt_tanggal_id(date('Y-m-d')),
  ];
}

function replace_kontrak_placeholders(string $content, array $map, bool $forXml = false): string {
  return preg_replace_callback('/\{\{(.*?)\}\}/s', function ($m) use ($map, $forXml) {
    $key = strtoupper(trim(preg_replace('/<[^>]+>/', '', $m[1])));
    if (!array_key_exists($key, $map)) {
      return $m[0];
    }
    return $forXml ? htmlspecialchars($map[$key], ENT_QUOTES | ENT_XML1, 'UTF-8') : $map[$key];
  }, $content);
}

function kontrak_default_preview(array $k, array $map): string {
  $catatan = isset($k['catatan']) && trim((string) $k['catatan']) !== ''
    ? "\n\nCatatan:\n" . trim((string) $k['catatan'])
    : '';

  return trim(
    "PERJANJIAN KERJA WAKTU TERTENTU\n" .
    "Nomor: {$map['NOMOR_KONTRAK']}\n\n" .
    "Pada tanggal {$map['TANGGAL_HARI_INI']}, Roti Bakar Ngeunah membuat perjanjian kerja dengan:\n\n" .
    "Nama: {$map['NAMA_LENGKAP']}\n" .
    "No. KTP: {$map['NO_KTP']}\n" .
    "No. WhatsApp: {$map['NO_WHATSAPP']}\n" .
    "Alamat: {$map['ALAMAT']}\n\n" .
    "Karyawan ditempatkan sebagai {$map['POSISI']} di cabang {$map['CABANG']} untuk masa kerja " .
    "{$map['TANGGAL_MULAI']} sampai {$map['TANGGAL_BERAKHIR']}.\n\n" .
    "Gaji pokok: {$map['GAJI_POKOK']}." .
    $catatan
  );
}

/**
 * Bangun teks preview kontrak untuk data $k: pakai template aktif bila ada,
 * jika gagal/tidak ada -> format standar. Dipakai preview.php & sign.php.
 *
 * @return array{text:string, using_template:bool, template_name:?string, warning:?string, placeholders:array}
 */
function render_kontrak_preview(PDO $db, array $k): array {
  $map = kontrak_placeholder_map($k);
  $tpl = get_active_kontrak_template($db);
  $usingTemplate = false;
  $templateName = null;
  $warning = null;

  if ($tpl) {
    $templateName = $tpl['original_name'];
    $path = rtrim(UPLOAD_BASE, '/\\') . '/templates/' . $tpl['filename'];
    if (is_file($path)) {
      try {
        $text = kontrak_preview_from_template($path, $tpl['filename'], $map);
        $usingTemplate = true;
      } catch (Throwable $e) {
        $text = kontrak_default_preview($k, $map);
        $warning = $e->getMessage();
      }
    } else {
      $text = kontrak_default_preview($k, $map);
      $warning = 'File template tidak ditemukan di server.';
    }
  } else {
    $text = kontrak_default_preview($k, $map);
  }

  return [
    'text'           => $text,
    'using_template' => $usingTemplate,
    'template_name'  => $templateName,
    'warning'        => $warning,
    'placeholders'   => $map,
  ];
}

function kontrak_preview_from_template(string $path, string $filename, array $map): string {
  $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

  if ($ext === 'docx') {
    $zip = new ZipArchive();
    if ($zip->open($path) !== true) {
      throw new RuntimeException('Gagal membuka template .docx.');
    }
    $xml = $zip->getFromName('word/document.xml');
    $zip->close();

    if ($xml === false || $xml === '') {
      throw new RuntimeException('Isi dokumen template tidak ditemukan.');
    }

    $xml = replace_kontrak_placeholders($xml, $map, true);
    $xml = preg_replace('/<w:tab\s*\/>/', "\t", $xml);
    $xml = preg_replace('/<w:br[^>]*\/>/', "\n", $xml);
    $xml = preg_replace('/<\/w:p>/', "\n", $xml);
    $text = html_entity_decode(strip_tags($xml), ENT_QUOTES | ENT_XML1, 'UTF-8');
  } else {
    $content = file_get_contents($path);
    if ($content === false) {
      throw new RuntimeException('Gagal membaca template kontrak.');
    }
    $text = replace_kontrak_placeholders($content, $map, false);
    $text = strip_tags($text);
  }

  $text = preg_replace("/[ \t]+\n/", "\n", $text);
  $text = preg_replace("/\n{3,}/", "\n\n", trim($text));
  return $text !== '' ? $text : 'Template tidak memiliki teks yang dapat dipreview.';
}
