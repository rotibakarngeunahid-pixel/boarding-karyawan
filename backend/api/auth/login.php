<?php
// POST /api/auth/login
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}

$body = get_json_body();
$missing = validate_required($body, ['username', 'password']);
if ($missing) {
  json_error('Username dan password wajib diisi.', 422, $missing);
}

try {
  $db = getDB();
  $stmt = $db->prepare('SELECT id, username, password_hash, nama, role FROM users WHERE username = ? LIMIT 1');
  $stmt->execute([$body['username']]);
  $user = $stmt->fetch();

  if (!$user || !password_verify($body['password'], $user['password_hash'])) {
    json_error('Username atau password salah.', 401);
  }

  $token = jwt_encode([
    'sub'  => (int) $user['id'],
    'role' => $user['role'],
    'nama' => $user['nama'],
  ], 28800); // 8 jam

  json_success([
    'token' => $token,
    'user'  => [
      'id'   => (int) $user['id'],
      'nama' => $user['nama'],
      'role' => $user['role'],
    ],
  ], 'Login berhasil.');
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
