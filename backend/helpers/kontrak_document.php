<?php
// Helper pembuatan dokumen/preview kontrak kerja.

require_once __DIR__ . '/aset.php'; // get_stempel_binary()

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

/**
 * Template kontrak aktif untuk sebuah cabang.
 * Prioritas: template khusus cabang -> template Umum (cabang IS NULL).
 */
function get_active_kontrak_template(PDO $db, ?string $cabang = null): ?array {
  if ($cabang !== null && $cabang !== '') {
    $stmt = $db->prepare(
      'SELECT * FROM kontrak_template WHERE aktif = 1 AND cabang = ? ORDER BY id DESC LIMIT 1'
    );
    $stmt->execute([$cabang]);
    $row = $stmt->fetch();
    if ($row) return $row;
  }
  $row = $db->query(
    'SELECT * FROM kontrak_template WHERE aktif = 1 AND cabang IS NULL ORDER BY id DESC LIMIT 1'
  )->fetch();
  return $row ?: null;
}

function kontrak_placeholder_map(array $k): array {
  $gaji = $k['gaji_pokok'] !== null && $k['gaji_pokok'] !== ''
    ? 'Rp ' . number_format((float) $k['gaji_pokok'], 0, ',', '.')
    : '-';

  // Lama kontrak dalam bulan (dari selisih tanggal mulai & berakhir).
  $durasiBulan = '';
  if (!empty($k['tanggal_mulai']) && !empty($k['tanggal_berakhir'])) {
    $d1 = date_create((string) $k['tanggal_mulai']);
    $d2 = date_create((string) $k['tanggal_berakhir']);
    if ($d1 && $d2) {
      $diff = date_diff($d1, $d2);
      $months = $diff->y * 12 + $diff->m + ($diff->d > 0 ? 1 : 0);
      $durasiBulan = (string) max(0, $months);
    }
  }

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
    'DURASI_BULAN'     => $durasiBulan,
    'TANGGAL_HARI_INI' => kontrak_fmt_tanggal_id(date('Y-m-d')),
    // Placeholder gambar. Default kosong; diisi gambar saat dirender.
    'TANDA_TANGAN'     => '', // tanda tangan karyawan (saat sudah TTD)
    'STEMPEL'          => '', // stempel/cap perusahaan (PIHAK PERTAMA)
  ];
}

/** Markup gambar inline (wp:inline) untuk menggantikan placeholder. */
function docx_build_drawing(string $rid, int $cx, int $cy, int $docprId, string $name): string {
  return '<w:drawing><wp:inline distT="0" distB="0" distL="0" distR="0" '
    . 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
    . '<wp:extent cx="' . $cx . '" cy="' . $cy . '"/>'
    . '<wp:docPr id="' . $docprId . '" name="' . $name . '"/>'
    . '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
    . '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    . '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    . '<pic:nvPicPr><pic:cNvPr id="' . $docprId . '" name="' . $name . '"/><pic:cNvPicPr/></pic:nvPicPr>'
    . '<pic:blipFill><a:blip r:embed="' . $rid . '" '
    . 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>'
    . '<a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
    . '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' . $cx . '" cy="' . $cy . '"/></a:xfrm>'
    . '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
    . '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
}

/**
 * Isi placeholder {{...}} ke dalam file .docx (mempertahankan format asli:
 * tabel, bold, heading, dll.) lalu kembalikan biner .docx hasilnya.
 * Mencakup body + header + footer dokumen. Dapat menyisipkan gambar tanda
 * tangan ({{TANDA_TANGAN}}) dan stempel ({{STEMPEL}}) secara inline.
 *
 * @throws RuntimeException bila gagal.
 */
function fill_docx_template(
  string $path,
  array $map,
  ?string $signaturePng = null,
  ?string $stempelPng = null
): string {
  if (!is_file($path)) throw new RuntimeException('File template tidak ditemukan di server.');

  $tmp = tempnam(sys_get_temp_dir(), 'kontrak');
  if (!$tmp || !copy($path, $tmp)) {
    if ($tmp) @unlink($tmp);
    throw new RuntimeException('Gagal menyiapkan dokumen.');
  }

  $zip = new ZipArchive();
  if ($zip->open($tmp) !== true) {
    @unlink($tmp);
    throw new RuntimeException('Gagal membuka template .docx.');
  }

  // Gambar yang akan disisipkan: placeholder => [binary, lebar target px].
  $imgs = [];
  if ($signaturePng !== null && $signaturePng !== '') $imgs['TANDA_TANGAN'] = ['bin' => $signaturePng, 'w' => 190];
  if ($stempelPng   !== null && $stempelPng   !== '') $imgs['STEMPEL']      = ['bin' => $stempelPng,   'w' => 120];

  $drawings = [];  // placeholder => markup
  $relNodes = [];
  $ctExts   = [];  // ext => contentType
  $idc = 0;
  foreach ($imgs as $ph => $img) {
    $info = function_exists('getimagesizefromstring') ? @getimagesizefromstring($img['bin']) : false;
    if (!$info || $info[0] <= 0 || $info[1] <= 0) continue;
    $ext = (($info[2] ?? 0) === IMAGETYPE_JPEG) ? 'jpg' : 'png';
    $ctExts[$ext] = ($ext === 'jpg') ? 'image/jpeg' : 'image/png';
    $idc++;
    $rid = 'rIdRbnImg' . $idc;
    $media = 'rbn_' . strtolower($ph) . '_' . $idc . '.' . $ext;
    $w = (int) $img['w'];
    $h = (int) round($w * ($info[1] / $info[0]));
    if ($h < 24) $h = 24;
    if ($h > 260) $h = 260;
    $cx = $w * 9525;
    $cy = $h * 9525;
    $zip->addFromString('word/media/' . $media, $img['bin']);
    $relNodes[] = '<Relationship Id="' . $rid . '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/' . $media . '"/>';
    $drawings[$ph] = docx_build_drawing($rid, $cx, $cy, 1000 + $idc, ucfirst(strtolower($ph)));
  }

  // Tulis relationships SEKALI (hindari masalah getFromName setelah addFromString).
  if ($relNodes) {
    $relName = 'word/_rels/document.xml.rels';
    $rels = $zip->getFromName($relName);
    if ($rels === false || $rels === '') {
      $rels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        . '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        . implode('', $relNodes) . '</Relationships>';
    } else {
      $rels = preg_replace('#</Relationships>#', implode('', $relNodes) . '</Relationships>', $rels, 1);
    }
    $zip->addFromString($relName, $rels);
  }

  // Tulis content-types SEKALI (pastikan Default untuk png/jpg ada).
  if ($ctExts) {
    $ct = $zip->getFromName('[Content_Types].xml');
    if ($ct !== false && $ct !== '') {
      $inject = '';
      foreach ($ctExts as $ext => $type) {
        if (strpos($ct, 'Extension="' . $ext . '"') === false) {
          $inject .= '<Default Extension="' . $ext . '" ContentType="' . $type . '"/>';
        }
      }
      if ($inject !== '') {
        $ct = preg_replace('/(<Types[^>]*>)/', '$1' . $inject, $ct, 1);
        $zip->addFromString('[Content_Types].xml', $ct);
      }
    }
  }

  for ($i = 0; $i < $zip->numFiles; $i++) {
    $name = $zip->getNameIndex($i);
    if ($name && preg_match('#^word/(document|header\d*|footer\d*)\.xml$#', $name)) {
      $xml = $zip->getFromName($name);
      if ($xml === false || $xml === '') continue;

      // Sisipkan gambar di placeholder masing-masing (hanya di body dokumen).
      if ($drawings && $name === 'word/document.xml') {
        foreach ($drawings as $ph => $draw) {
          $xml = preg_replace('/<w:t[^>]*>\s*\{\{\s*' . $ph . '\s*\}\}\s*<\/w:t>/u', $draw, $xml, 1);
        }
      }

      // Sisa placeholder teks (gambar yang tak terpakai -> dikosongkan via map).
      $zip->addFromString($name, replace_kontrak_placeholders($xml, $map, true));
    }
  }
  $zip->close();

  $content = file_get_contents($tmp);
  @unlink($tmp);
  if ($content === false) throw new RuntimeException('Gagal membaca dokumen hasil.');
  return $content;
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
  $tpl = get_active_kontrak_template($db, $k['cabang'] ?? null);
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
