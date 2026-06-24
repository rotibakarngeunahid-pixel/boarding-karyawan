<?php
// POST /api/kontrak/perpanjang   (admin)
// Body: { kontrak_id, tanggal_mulai_baru, tanggal_berakhir_baru, gaji_pokok?, catatan? }
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/kontrak.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}
$auth = require_auth();

$body = get_json_body();
$missing = validate_required($body, ['kontrak_id', 'tanggal_mulai_baru', 'tanggal_berakhir_baru']);
if ($missing) {
  json_error('Field perpanjangan belum lengkap.', 422, $missing);
}
if (strtotime($body['tanggal_berakhir_baru']) <= strtotime($body['tanggal_mulai_baru'])) {
  json_error('Tanggal berakhir harus setelah tanggal mulai.', 422);
}

try {
  $db = getDB();

  $stmt = $db->prepare('SELECT * FROM kontrak WHERE id = ? LIMIT 1');
  $stmt->execute([(int) $body['kontrak_id']]);
  $lama = $stmt->fetch();
  if (!$lama) {
    json_error('Kontrak tidak ditemukan.', 404);
  }

  $db->beginTransaction();

  // 1. Tandai kontrak lama sebagai diperbarui
  $stmt = $db->prepare("UPDATE kontrak SET status = 'diperbarui' WHERE id = ?");
  $stmt->execute([(int) $lama['id']]);

  // 2. Buat kontrak baru sebagai penerus
  $nomor = generate_nomor_kontrak($db);
  $stmt = $db->prepare(
    'INSERT INTO kontrak
      (karyawan_id, nomor_kontrak, tanggal_mulai, tanggal_berakhir, posisi, cabang,
       gaji_pokok, status, kontrak_sebelumnya_id, catatan, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    (int) $lama['karyawan_id'],
    $nomor,
    $body['tanggal_mulai_baru'],
    $body['tanggal_berakhir_baru'],
    $lama['posisi'],
    $lama['cabang'],
    isset($body['gaji_pokok']) && $body['gaji_pokok'] !== '' ? (float) $body['gaji_pokok'] : $lama['gaji_pokok'],
    'aktif',
    (int) $lama['id'],
    $body['catatan'] ?? null,
    $auth['sub'] ?? null,
  ]);
  $baru_id = (int) $db->lastInsertId();

  $db->commit();

  $row = $db->query("SELECT * FROM kontrak WHERE id = $baru_id")->fetch();
  json_success($row, "Kontrak diperpanjang. Nomor baru: $nomor.", 201);
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
