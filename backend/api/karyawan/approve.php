<?php
// POST /api/karyawan/approve   (admin)
// Body: { karyawan_id, action: 'approved'|'rejected', catatan? }
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}
require_auth();

$body = get_json_body();
$karyawan_id = isset($body['karyawan_id']) ? (int) $body['karyawan_id'] : 0;
$action = $body['action'] ?? '';

if (!$karyawan_id || !in_array($action, ['approved', 'rejected'], true)) {
  json_error('karyawan_id dan action (approved/rejected) wajib.', 422);
}

try {
  $db = getDB();

  $stmt = $db->prepare('SELECT id, invitation_id FROM karyawan WHERE id = ? LIMIT 1');
  $stmt->execute([$karyawan_id]);
  $kar = $stmt->fetch();
  if (!$kar) {
    json_error('Karyawan tidak ditemukan.', 404);
  }

  $db->beginTransaction();

  // Update status invitation
  if (!empty($kar['invitation_id'])) {
    $sqlInv = 'UPDATE onboarding_invitations SET status = ?';
    $paramsInv = [$action];
    if (isset($body['catatan']) && $body['catatan'] !== '') {
      $sqlInv .= ', catatan = ?';
      $paramsInv[] = $body['catatan'];
    }
    $sqlInv .= ' WHERE id = ?';
    $paramsInv[] = $kar['invitation_id'];
    $stmt = $db->prepare($sqlInv);
    $stmt->execute($paramsInv);
  }

  if ($action === 'approved') {
    // Set tanggal bergabung & pastikan status aktif
    $stmt = $db->prepare("UPDATE karyawan SET tanggal_bergabung = CURDATE(), status = 'aktif' WHERE id = ?");
    $stmt->execute([$karyawan_id]);
  } else {
    // Rejected: nonaktifkan karyawan
    $stmt = $db->prepare("UPDATE karyawan SET status = 'nonaktif' WHERE id = ?");
    $stmt->execute([$karyawan_id]);
  }

  $db->commit();
  json_success(null, $action === 'approved' ? 'Karyawan disetujui.' : 'Karyawan ditolak.');
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
