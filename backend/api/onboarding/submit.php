<?php
// POST /api/onboarding/submit   (PUBLIC, multipart/form-data)
// Validasi & simpan DINAMIS berdasarkan definisi form_fields + aturan kondisional.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/upload.php';
require_once __DIR__ . '/../../helpers/onboarding.php';
require_once __DIR__ . '/../../helpers/form.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}

$data = $_POST;
if (empty($data['token'])) {
  json_error('Token wajib ada.', 422, ['token']);
}

try {
  $db = getDB();

  // 1. Verifikasi token/slug masih valid (pending & belum kedaluwarsa)
  $inv = find_invitation_by_ref($db, $data['token']);
  if (!$inv) {
    json_error('Token tidak ditemukan.', 404);
  }
  if ($inv['status'] !== 'pending') {
    json_error('Link onboarding sudah pernah digunakan.', 409);
  }
  if (strtotime($inv['expires_at']) <= time()) {
    json_error('Link onboarding sudah kedaluwarsa.', 410);
  }

  // 2-3. Validasi & kumpulkan jawaban form (dinamis) + upload file
  $collected = collect_karyawan_columns($db, $_POST, $_FILES, false);
  $columns = $collected['columns'];
  $custom  = $collected['custom'];

  // 4. Kolom dari invitation (bukan bagian form) + data tambahan
  $columns['invitation_id'] = $inv['id'];
  $columns['cabang']        = $inv['cabang'];
  $columns['posisi']        = $inv['posisi'];
  $columns['data_tambahan'] = $custom ? json_encode(array_values($custom), JSON_UNESCAPED_UNICODE) : null;

  // 5. INSERT dinamis + tandai invitation submitted (transaksi)
  $cols = array_keys($columns);
  $placeholders = implode(', ', array_fill(0, count($cols), '?'));
  $sql = 'INSERT INTO karyawan (' . implode(', ', $cols) . ') VALUES (' . $placeholders . ')';

  $db->beginTransaction();

  $stmt = $db->prepare($sql);
  $stmt->execute(array_values($columns));
  $karyawan_id = (int) $db->lastInsertId();

  $upd = $db->prepare("UPDATE onboarding_invitations SET status = 'submitted' WHERE id = ?");
  $upd->execute([$inv['id']]);

  $db->commit();

  json_success(['karyawan_id' => $karyawan_id], 'Data berhasil dikirim.', 201);
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
