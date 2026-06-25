<?php
// GET  /api/onboarding        -> list undangan (+ ringkasan karyawan jika sudah submit)
// POST /api/onboarding        -> buat undangan baru
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/onboarding.php';

$method = $_SERVER['REQUEST_METHOD'];
$auth = require_auth();

try {
  $db = getDB();

  if ($method === 'GET') {
    $sql = "SELECT i.*,
                   k.id   AS karyawan_id,
                   k.nama_lengkap,
                   k.no_whatsapp,
                   k.lulus_tes,
                   k.skor_tes
            FROM onboarding_invitations i
            LEFT JOIN karyawan k ON k.invitation_id = i.id
            ORDER BY i.created_at DESC";
    $rows = $db->query($sql)->fetchAll();
    json_success($rows);
  }

  if ($method === 'POST') {
    $body = get_json_body();
    $missing = validate_required($body, ['cabang', 'posisi']);
    if ($missing) {
      json_error('Cabang dan posisi wajib diisi.', 422, $missing);
    }

    $cabang_valid = ['Nusa Kambangan', 'Soputan', 'Pamogan'];
    if (!in_array($body['cabang'], $cabang_valid, true)) {
      json_error('Cabang tidak valid.', 422);
    }

    $expires_in_days = isset($body['expires_in_days']) ? (int) $body['expires_in_days'] : 7;
    if ($expires_in_days < 1) $expires_in_days = 7;

    $token = bin2hex(random_bytes(32));
    $test_slug = generate_test_slug($db, $body['posisi']); // REVISI 6: link pendek
    $expires_at = (new DateTime())->modify("+{$expires_in_days} days")->format('Y-m-d H:i:s');

    $stmt = $db->prepare(
      'INSERT INTO onboarding_invitations (token, test_slug, cabang, posisi, catatan, expires_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      $token,
      $test_slug,
      $body['cabang'],
      $body['posisi'],
      $body['catatan'] ?? null,
      $expires_at,
      $auth['sub'] ?? null,
    ]);

    $id = (int) $db->lastInsertId();
    json_success([
      'id'         => $id,
      'token'      => $token,
      'test_slug'  => $test_slug,
      'cabang'     => $body['cabang'],
      'posisi'     => $body['posisi'],
      'status'     => 'pending',
      'expires_at' => $expires_at,
    ], 'Undangan berhasil dibuat.', 201);
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
