<?php
// /api/kontrak/sign   (PUBLIC — diakses karyawan via link tanda tangan)
//  GET  ?token=XXX  -> info kontrak + teks yang harus dibaca + status tanda tangan
//  POST ?token=XXX  -> simpan tanda tangan (body JSON: { nama_penandatangan, signature, setuju })
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/kontrak_document.php';
require_once __DIR__ . '/../../helpers/signature.php';

$method = $_SERVER['REQUEST_METHOD'];

$token = '';
if ($method === 'GET') {
  $token = trim((string) ($_GET['token'] ?? ''));
} else {
  $token = trim((string) ($_GET['token'] ?? ''));
}

try {
  $db = getDB();

  // ── GET: tampilkan kontrak untuk dibaca & ditandatangani ──
  if ($method === 'GET') {
    if ($token === '') json_error('Token wajib disertakan.', 422);

    $k = get_kontrak_document_by_token($db, $token);
    if (!$k) {
      json_success(['valid' => false], 'Link tanda tangan tidak ditemukan.');
    }

    $signed = !empty($k['tanda_tangan_path']);
    $ttdUrl = $signed ? rtrim(UPLOAD_URL_BASE, '/') . '/' . $k['tanda_tangan_path'] : null;

    // Teks yang ditampilkan: snapshot bila sudah ditandatangani, jika belum -> render dari template/standar.
    if ($signed && !empty($k['snapshot_kontrak'])) {
      $text = $k['snapshot_kontrak'];
    } else {
      $rendered = render_kontrak_preview($db, $k);
      $text = $rendered['text'];
    }

    json_success([
      'valid'              => true,
      'signed'            => $signed,
      'nomor_kontrak'      => $k['nomor_kontrak'],
      'nama_lengkap'       => $k['nama_lengkap'],
      'posisi'             => $k['posisi'],
      'cabang'             => $k['cabang'],
      'tanggal_mulai'      => $k['tanggal_mulai'],
      'tanggal_berakhir'   => $k['tanggal_berakhir'],
      'text'               => $text,
      'nama_penandatangan' => $k['nama_penandatangan'],
      'ditandatangani_at'  => $k['ditandatangani_at'],
      'tanda_tangan_url'   => $ttdUrl,
    ]);
  }

  // ── POST: simpan tanda tangan ──
  if ($method === 'POST') {
    if ($token === '') json_error('Token wajib disertakan.', 422);

    $body = get_json_body();
    $nama      = trim((string) ($body['nama_penandatangan'] ?? ''));
    $signature = (string) ($body['signature'] ?? '');
    $setuju    = !empty($body['setuju']);

    if (!$setuju) {
      json_error('Anda harus menyetujui isi kontrak terlebih dahulu.', 422);
    }
    if ($nama === '') {
      json_error('Nama lengkap penandatangan wajib diisi.', 422, ['nama_penandatangan']);
    }
    if ($signature === '') {
      json_error('Tanda tangan belum dibuat.', 422, ['signature']);
    }

    $k = get_kontrak_document_by_token($db, $token);
    if (!$k) {
      json_error('Link tanda tangan tidak ditemukan.', 404);
    }
    if (!empty($k['tanda_tangan_path'])) {
      json_error('Kontrak ini sudah ditandatangani.', 409);
    }

    // Simpan gambar tanda tangan.
    $saved = save_signature_data_url($signature, 'ttd');
    if (!$saved['ok']) {
      json_error($saved['error'], 422);
    }

    // Snapshot teks kontrak saat ditandatangani (isi yang disetujui jadi permanen).
    $rendered = render_kontrak_preview($db, $k);

    $stmt = $db->prepare(
      'UPDATE kontrak
         SET tanda_tangan_path = ?, nama_penandatangan = ?, ditandatangani_at = NOW(), snapshot_kontrak = ?
       WHERE id = ?'
    );
    $stmt->execute([$saved['path'], $nama, $rendered['text'], (int) $k['id']]);

    json_success([
      'signed'           => true,
      'tanda_tangan_url' => $saved['url'],
    ], 'Terima kasih, kontrak berhasil ditandatangani.', 201);
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
