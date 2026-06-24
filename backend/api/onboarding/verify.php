<?php
// GET /api/onboarding/verify?token=xxx   (PUBLIC)
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}

$token = $_GET['token'] ?? '';
if ($token === '') {
  json_error('Token wajib disertakan.', 422);
}

try {
  $db = getDB();
  $stmt = $db->prepare(
    'SELECT id, cabang, posisi, catatan, status, expires_at
     FROM onboarding_invitations WHERE token = ? LIMIT 1'
  );
  $stmt->execute([$token]);
  $inv = $stmt->fetch();

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
