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
  // Kandidat baru masuk sebagai 'nonaktif' (pending review) — jadi AKTIF saat
  // di-approve admin. Tetap tampil di list Karyawan (list tidak memfilter status).
  $columns['status']        = 'nonaktif';
  $columns['data_tambahan'] = $custom ? json_encode(array_values($custom), JSON_UNESCAPED_UNICODE) : null;

  // 5. INSERT/UPDATE (transaksi). invitation_id UNIQUE: bila submit sebelumnya
  //    sempat membuat record (mis. retry setelah koneksi putus), UPDATE record
  //    itu alih-alih gagal duplicate key — kandidat tidak pernah "hilang".
  $db->beginTransaction();

  $cek = $db->prepare('SELECT id FROM karyawan WHERE invitation_id = ? LIMIT 1');
  $cek->execute([$inv['id']]);
  $existing_id = (int) ($cek->fetchColumn() ?: 0);

  if ($existing_id) {
    $sets = implode(', ', array_map(function ($c) { return $c . ' = ?'; }, array_keys($columns)));
    $stmt = $db->prepare('UPDATE karyawan SET ' . $sets . ' WHERE id = ?');
    $stmt->execute(array_merge(array_values($columns), [$existing_id]));
    $karyawan_id = $existing_id;
  } else {
    $cols = array_keys($columns);
    $placeholders = implode(', ', array_fill(0, count($cols), '?'));
    $stmt = $db->prepare('INSERT INTO karyawan (' . implode(', ', $cols) . ') VALUES (' . $placeholders . ')');
    $stmt->execute(array_values($columns));
    $karyawan_id = (int) $db->lastInsertId();
  }

  $upd = $db->prepare("UPDATE onboarding_invitations SET status = 'submitted' WHERE id = ?");
  $upd->execute([$inv['id']]);

  $db->commit();

  json_success(['karyawan_id' => $karyawan_id], 'Data berhasil dikirim.', 201);
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
