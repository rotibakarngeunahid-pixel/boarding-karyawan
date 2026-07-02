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
    'TANDATANGAN'      => '', // alias tanpa underscore (dipakai di template)
    'STEMPEL'          => '', // stempel/cap perusahaan (PIHAK PERTAMA)
  ];
}

// Teks acuan untuk menaruh stempel OTOMATIS bila template tidak memuat {{STEMPEL}}.
// = nama PIHAK PERTAMA (pemilik) pada blok tanda tangan.
if (!defined('STEMPEL_ANCHOR_TEXT')) define('STEMPEL_ANCHOR_TEXT', 'Adithya');

/**
 * Sisipkan gambar (stempel / tanda tangan) sebagai paragraf tersendiri TEPAT
 * DI ATAS paragraf yang memuat teks acuan $anchor — tanpa perlu placeholder.
 * Dipakai untuk:
 *  - Stempel: acuan = nama pemilik (PIHAK PERTAMA), mis. "Adithya".
 *  - Tanda tangan karyawan: acuan = placeholder nama karyawan (PIHAK KEDUA).
 * Memakai kemunculan TERAKHIR $anchor karena blok tanda tangan ada di bawah
 * dokumen (nama yang sama juga muncul di tabel identitas atas).
 */
function image_auto_anchor_before(string $xml, string $draw, string $anchor): string {
  if ($anchor === '') return $xml;

  // Coba cari teks acuan secara langsung (bila ada dalam satu run XML).
  $xmlPos = strrpos($xml, $anchor);

  if ($xmlPos === false) {
    // Word sering memecah kata ke beberapa run (spell-check, lang-mark, dsb).
    $chars = preg_split('//u', $anchor, -1, PREG_SPLIT_NO_EMPTY);
    $parts = [];
    foreach ($chars as $c) $parts[] = preg_quote($c, '/');
    $pat = implode('(?:<[^>]*>)*', $parts);
    if (preg_match_all('/' . $pat . '/s', $xml, $m, PREG_OFFSET_CAPTURE)) {
      $xmlPos = end($m[0])[1];
    }
  }

  if ($xmlPos === false) return $xml;

  // Cari awal PARAGRAF <w:p> yang memuat teks acuan.
  $head = substr($xml, 0, $xmlPos);
  $pa = strrpos($head, '<w:p ');
  $pb = strrpos($head, '<w:p>');
  $pStart = max($pa === false ? -1 : $pa, $pb === false ? -1 : $pb);
  if ($pStart < 0) return $xml;

  // Sisipkan paragraf berisi gambar (inline, rata tengah) SEBELUM paragraf acuan,
  // di dalam sel yang sama -> tampil tepat di atas nama.
  $imgPara = '<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r>' . $draw . '</w:r></w:p>';
  return substr($xml, 0, $pStart) . $imgPara . substr($xml, $pStart);
}

/** Stempel otomatis di atas nama pemilik (PIHAK PERTAMA) — tanpa {{STEMPEL}}. */
function stempel_auto_anchor(string $xml, string $draw): string {
  return image_auto_anchor_before($xml, $draw, STEMPEL_ANCHOR_TEXT);
}

/**
 * Tanda tangan karyawan otomatis di atas namanya (PIHAK KEDUA) — tanpa perlu
 * placeholder {{TANDA_TANGAN}}. Acuan = placeholder nama karyawan yang muncul
 * PALING AKHIR (blok tanda tangan), pakai NAMA_PANGGILAN lalu NAMA_LENGKAP.
 * Dipanggil SEBELUM placeholder diganti nilai (jadi masih berupa {{...}}).
 */
function signature_auto_anchor(string $xml, string $draw): string {
  $posP = strrpos($xml, '{{NAMA_PANGGILAN}}');
  $posL = strrpos($xml, '{{NAMA_LENGKAP}}');
  $anchor = '';
  if ($posP !== false && ($posL === false || $posP >= $posL)) {
    $anchor = '{{NAMA_PANGGILAN}}';
  } elseif ($posL !== false) {
    $anchor = '{{NAMA_LENGKAP}}';
  }
  return image_auto_anchor_before($xml, $draw, $anchor);
}

/** Markup gambar MENGAMBANG (wp:anchor, wrapNone) -> bisa menimpa teks. */
function docx_build_anchor_drawing(string $rid, int $cx, int $cy, int $id, string $name, int $offX, int $offY): string {
  return '<w:drawing><wp:anchor simplePos="0" behindDoc="0" distT="0" distB="0" distL="0" distR="0" '
    . 'allowOverlap="1" layoutInCell="1" locked="0" relativeHeight="251658240" '
    . 'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing">'
    . '<wp:simplePos x="0" y="0"/>'
    . '<wp:positionH relativeFrom="column"><wp:posOffset>' . $offX . '</wp:posOffset></wp:positionH>'
    . '<wp:positionV relativeFrom="paragraph"><wp:posOffset>' . $offY . '</wp:posOffset></wp:positionV>'
    . '<wp:extent cx="' . $cx . '" cy="' . $cy . '"/>'
    . '<wp:effectExtent l="0" t="0" r="0" b="0"/>'
    . '<wp:wrapNone/>'
    . '<wp:docPr id="' . $id . '" name="' . $name . '"/>'
    . '<wp:cNvGraphicFramePr/>'
    . '<a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
    . '<a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    . '<pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">'
    . '<pic:nvPicPr><pic:cNvPr id="' . $id . '" name="' . $name . '"/><pic:cNvPicPr/></pic:nvPicPr>'
    . '<pic:blipFill><a:blip r:embed="' . $rid . '" '
    . 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>'
    . '<a:stretch><a:fillRect/></a:stretch></pic:blipFill>'
    . '<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="' . $cx . '" cy="' . $cy . '"/></a:xfrm>'
    . '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
    . '</pic:pic></a:graphicData></a:graphic></wp:anchor></w:drawing>';
}

/** Markup gambar INLINE (wp:inline) untuk tanda tangan — mengikuti alur teks. */
function docx_build_drawing(string $rid, int $cx, int $cy, int $docprId, string $name, int $offX = 0, int $offY = 0): string {
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
    . '<pic:spPr><a:xfrm><a:off x="' . $offX . '" y="' . $offY . '"/><a:ext cx="' . $cx . '" cy="' . $cy . '"/></a:xfrm>'
    . '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>'
    . '</pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing>';
}

/**
 * Perkecil gambar besar (mis. stempel 1024×1024 ~1.8MB) sebelum ditanam ke .docx.
 * Tujuan: dokumen preview/kontrak jadi ringan (puluhan KB, bukan MB) sehingga
 * ANDAL & cepat dirender docx-preview di semua perangkat (HP/koneksi lambat) —
 * penyebab utama "stempel tidak muncul" adalah preview berat lalu gagal dimuat.
 * Transparansi PNG dipertahankan. Bila gagal/tak perlu -> kembalikan biner asli.
 */
function docx_downscale_image(string $bin, int $maxSide = 480): string {
  if (!function_exists('imagecreatefromstring') || !function_exists('getimagesizefromstring')) return $bin;
  $info = @getimagesizefromstring($bin);
  if (!$info || ($info[0] ?? 0) <= 0 || ($info[1] ?? 0) <= 0) return $bin;
  $w = (int) $info[0];
  $h = (int) $info[1];
  $long = max($w, $h);
  if ($long <= $maxSide) return $bin; // sudah cukup kecil, biarkan.

  $isJpg = (($info[2] ?? 0) === IMAGETYPE_JPEG);
  $src = @imagecreatefromstring($bin);
  if (!$src) return $bin;

  $scale = $maxSide / $long;
  $nw = max(1, (int) round($w * $scale));
  $nh = max(1, (int) round($h * $scale));
  $dst = imagecreatetruecolor($nw, $nh);
  if (!$isJpg) {
    imagealphablending($dst, false);
    imagesavealpha($dst, true);
    $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
    imagefilledrectangle($dst, 0, 0, $nw, $nh, $transparent);
  }
  imagecopyresampled($dst, $src, 0, 0, 0, 0, $nw, $nh, $w, $h);

  ob_start();
  $ok = $isJpg ? imagejpeg($dst, null, 85) : imagepng($dst, null, 6);
  $out = ob_get_clean();
  imagedestroy($src);
  imagedestroy($dst);
  return ($ok && $out !== false && $out !== '') ? $out : $bin;
}

/**
 * Tambahkan bantalan TRANSPARAN di ATAS gambar (px pada resolusi alami gambar).
 * Dipakai untuk MENYAMAKAN TINGGI TAMPIL stempel & tanda tangan: gambar yang
 * lebih pendek diberi bantalan sehingga kotak keduanya sama tinggi, bagian
 * bawah rata, dan nama PIHAK PERTAMA & PIHAK KEDUA tetap SEJAJAR di baris
 * tabel yang sama. Output selalu PNG (menjaga transparansi).
 * GD tak tersedia / gagal -> null (pemanggil memakai gambar asli).
 */
function docx_pad_image_top(string $bin, int $padNatural): ?string {
  if ($padNatural <= 0) return $bin;
  if (!function_exists('imagecreatefromstring')) return null;
  $src = @imagecreatefromstring($bin);
  if (!$src) return null;
  $w = imagesx($src);
  $h = imagesy($src);
  $dst = imagecreatetruecolor($w, $h + $padNatural);
  imagealphablending($dst, false);
  imagesavealpha($dst, true);
  $transparent = imagecolorallocatealpha($dst, 0, 0, 0, 127);
  imagefilledrectangle($dst, 0, 0, $w, $h + $padNatural, $transparent);
  imagealphablending($dst, true);
  imagecopy($dst, $src, 0, $padNatural, 0, 0, $w, $h);
  ob_start();
  $ok = imagepng($dst, null, 6);
  $out = ob_get_clean();
  imagedestroy($src);
  imagedestroy($dst);
  return ($ok && $out !== false && $out !== '') ? $out : null;
}

/**
 * Isi placeholder {{...}} ke dalam file .docx (mempertahankan format asli:
 * tabel, bold, heading, dll.) lalu kembalikan biner .docx hasilnya.
 * Mencakup body + header + footer dokumen. Dapat menyisipkan gambar tanda
 * tangan ({{TANDA_TANGAN}}, inline) dan stempel ({{STEMPEL}}, anchor floating).
 *
 * @throws RuntimeException bila gagal.
 */
function fill_docx_template(
  string $path,
  array $map,
  ?string $signaturePng = null,
  ?string $stempelPng = null,
  ?array $stempelOverride = null
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

  // Gambar yang akan disisipkan: placeholder => [binary, lebar px, geser px].
  $imgs = [];
  if ($signaturePng !== null && $signaturePng !== '') {
    $imgs['TANDA_TANGAN'] = ['bin' => $signaturePng, 'w' => 150, 'offx' => 0, 'offy' => 0];
  }
  if ($stempelPng !== null && $stempelPng !== '') {
    // Stempel dipasang PERSIS di titik placeholder {{STEMPEL}} (offset 0,0).
    // Tidak ada fitur atur posisi: penempatan sepenuhnya ditentukan oleh lokasi
    // {{STEMPEL}} di template. Hanya lebar yang dibaca dari pengaturan.
    $ss = $stempelOverride ?? (function_exists('get_stempel_settings')
      ? get_stempel_settings()
      : ['width' => 120]);
    // Perkecil stempel besar dulu -> dokumen ringan & preview andal di semua perangkat.
    $stempelPng = docx_downscale_image($stempelPng, 480);
    $imgs['STEMPEL'] = ['bin' => $stempelPng, 'w' => (int) ($ss['width'] ?? 120), 'offx' => 0, 'offy' => 0];
  }

  // SEJAJARKAN stempel & tanda tangan: samakan TINGGI TAMPIL kedua gambar dengan
  // bantalan transparan di ATAS gambar yang lebih pendek. Keduanya duduk di sel
  // kiri/kanan baris tabel yang sama -> tinggi sama = kedua gambar (dan nama di
  // bawahnya) sejajar rata bawah.
  if (count($imgs) > 1 && function_exists('getimagesizefromstring')) {
    $disp = [];
    foreach ($imgs as $ph => $img) {
      $ii = @getimagesizefromstring($img['bin']);
      if (!$ii || $ii[0] <= 0 || $ii[1] <= 0) continue;
      $h = (int) round(((int) $img['w']) * ($ii[1] / $ii[0]));
      $disp[$ph] = ['w' => (int) $img['w'], 'h' => max(24, min(260, $h)), 'natw' => (int) $ii[0]];
    }
    if (count($disp) > 1) {
      $targetH = min(260, max(array_column($disp, 'h')));
      foreach ($disp as $ph => $d) {
        if ($d['h'] >= $targetH) continue;
        // Selisih tinggi tampil -> px pada resolusi alami gambar tsb.
        $padNatural = (int) round(($targetH - $d['h']) * ($d['natw'] / $d['w']));
        $padded = docx_pad_image_top($imgs[$ph]['bin'], $padNatural);
        if ($padded !== null) $imgs[$ph]['bin'] = $padded;
      }
    }
  }

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
    $offX = (int) round(((int) ($img['offx'] ?? 0)) * 9525);
    $offY = (int) round(((int) ($img['offy'] ?? 0)) * 9525);
    // Stempel & tanda tangan sama-sama INLINE (mengikuti alur teks). Mode inline
    // paling ANDAL dirender docx-preview di semua perangkat; mode "mengambang"
    // (anchor/wrapNone) sering tak tampil di HP karena gambar di kotak 0×0 yang
    // ter-clip. Inline sedikit menambah tinggi baris — itu wajar & aman.
    $drawings[$ph] = docx_build_drawing($rid, $cx, $cy, 1000 + $idc, ucfirst(strtolower($ph)), $offX, $offY);
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

      // Normalisasi: satukan placeholder yang terpecah antar-run (Word sering
      // memecah {{...}} ke beberapa bagian) agar mudah dicocokkan.
      $xml = preg_replace_callback('/\{\{.*?\}\}/s', function ($m) {
        return preg_replace('/<[^>]+>/', '', $m[0]); // buang tag di dalam {{...}}
      }, $xml);

      // Sisipkan gambar di placeholder masing-masing (hanya di body dokumen).
      // Pecah run agar teks di sekitar placeholder (mis. nama di baris sama) tetap utuh.
      if ($drawings && $name === 'word/document.xml') {
        foreach ($drawings as $ph => $draw) {
          // Terima juga alias tanpa underscore: {{TANDATANGAN}} == {{TANDA_TANGAN}}.
          $phPat = ($ph === 'TANDA_TANGAN') ? 'TANDA_?TANGAN' : preg_quote($ph, '#');
          $cnt = 0;
          $xml = preg_replace_callback(
            '#<w:r\b([^>]*)>(\s*<w:rPr>.*?</w:rPr>)?\s*<w:t([^>]*)>([^<]*)\{\{\s*' . $phPat . '\s*\}\}([^<]*)</w:t>\s*</w:r>#us',
            function ($m) use ($draw) {
              $rAttr = $m[1];
              $rPr = $m[2] ?? '';
              $tAttr = $m[3];
              $pre = $m[4];
              $post = $m[5];
              $out = '';
              if ($pre !== '') $out .= '<w:r' . $rAttr . '>' . $rPr . '<w:t' . $tAttr . '>' . $pre . '</w:t></w:r>';
              $out .= '<w:r' . $rAttr . '>' . $rPr . $draw . '</w:r>';
              if ($post !== '') $out .= '<w:r' . $rAttr . '>' . $rPr . '<w:t' . $tAttr . '>' . $post . '</w:t></w:r>';
              return $out;
            },
            $xml,
            1,
            $cnt
          );
          // Bila placeholder tidak ada di template, taruh gambar OTOMATIS di blok
          // tanda tangan (tepat di atas nama) -> tak perlu menulis placeholder.
          if ($cnt === 0) {
            if ($ph === 'STEMPEL') {
              // Stempel di atas nama pemilik (PIHAK PERTAMA).
              $xml = stempel_auto_anchor($xml, $draw);
            } elseif ($ph === 'TANDA_TANGAN') {
              // Tanda tangan karyawan di atas namanya (PIHAK KEDUA).
              $xml = signature_auto_anchor($xml, $draw);
            }
          }
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
