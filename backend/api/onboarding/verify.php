<?php
// GET /api/onboarding/verify?token=xxx   (PUBLIC)
// token bisa berupa token panjang lama ATAU test_slug pendek baru (REVISI 6)
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/onboarding.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}

$token = $_GET['token'] ?? '';
if ($token === '') {
  json_error('Token wajib disertakan.', 422);
}

try {
  $db = getDB();
  $inv = find_invitation_by_ref($db, $token);

  if (!$inv) {
    json_success(['valid' => false], 'Token tidak ditemukan.');
  }

  $expired = strtotime($inv['expires_at']) <= time();
  $already_used = !in_array($inv['status'], ['pending'], true);
  $valid = !$expired && !$already_used;

  $reason = null;
  if ($expired)            $reason = 'Link onboarding sudah kedaluwarsa.';
  elseif ($already_used)   $reason = 'Link onboarding sudah pernah digunakan.';

  json_success([
    'valid'      => $valid,
    'reason'     => $reason,
    'invitation' => [
      'cabang'     => $inv['cabang'],
      'posisi'     => $inv['posisi'],
      'catatan'    => $inv['catatan'],
      'status'     => $inv['status'],
      'expires_at' => $inv['expires_at'],
    ],
  ]);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
