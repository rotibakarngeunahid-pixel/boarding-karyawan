<?php
// POST /api/kontrak/buat   (admin)
// Body: { karyawan_id, tanggal_mulai, tanggal_berakhir, posisi, cabang, gaji_pokok?, catatan? }
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/kontrak.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}
$auth = require_auth();

$body = get_json_body();
$missing = validate_required($body, ['karyawan_id', 'tanggal_mulai', 'tanggal_berakhir', 'posisi', 'cabang']);
if ($missing) {
  json_error('Field kontrak belum lengkap.', 422, $missing);
}

$cabang_valid = ['Nusa Kambangan', 'Soputan', 'Pamogan'];
if (!in_array($body['cabang'], $cabang_valid, true)) {
  json_error('Cabang tidak valid.', 422);
}
if (strtotime($body['tanggal_berakhir']) <= strtotime($body['tanggal_mulai'])) {
  json_error('Tanggal berakhir harus setelah tanggal mulai.', 422);
}

try {
  $db = getDB();

  $stmt = $db->prepare('SELECT id FROM karyawan WHERE id = ? LIMIT 1');
  $stmt->execute([(int) $body['karyawan_id']]);
  if (!$stmt->fetch()) {
    json_error('Karyawan tidak ditemukan.', 404);
  }

  $nomor = generate_nomor_kontrak($db);

  $stmt = $db->prepare(
    'INSERT INTO kontrak
      (karyawan_id, nomor_kontrak, tanggal_mulai, tanggal_berakhir, posisi, cabang, gaji_pokok, catatan, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    (int) $body['karyawan_id'],
    $nomor,
    $body['tanggal_mulai'],
    $body['tanggal_berakhir'],
    $body['posisi'],
    $body['cabang'],
    isset($body['gaji_pokok']) && $body['gaji_pokok'] !== '' ? (float) $body['gaji_pokok'] : null,
    $body['catatan'] ?? null,
    $auth['sub'] ?? null,
  ]);

  $id = (int) $db->lastInsertId();
  $stmt = $db->prepare('SELECT * FROM kontrak WHERE id = ? LIMIT 1');
  $stmt->execute([$id]);
  $row = $stmt->fetch();

  json_success($row, "Kontrak $nomor berhasil dibuat.", 201);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
