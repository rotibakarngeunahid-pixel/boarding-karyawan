<?php
// ============================================================
// HELPER: JWT (HS256) — implementasi manual tanpa library
// Cocok untuk cPanel shared hosting tanpa composer.
// ============================================================

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/response.php';

function base64url_encode(string $data): string {
  return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function base64url_decode(string $data): string {
  $remainder = strlen($data) % 4;
  if ($remainder) {
    $data .= str_repeat('=', 4 - $remainder);
  }
  return base64_decode(strtr($data, '-_', '+/'));
}

/**
 * Generate JWT HS256.
 * @param array $payload klaim (mis. ['sub'=>1,'role'=>'admin'])
 * @param int   $ttl     time-to-live dalam detik (default 8 jam)
 */
function jwt_encode(array $payload, int $ttl = 28800): string {
  $header = ['alg' => 'HS256', 'typ' => 'JWT'];
  $now = time();
  $payload['iat'] = $now;
  $payload['exp'] = $now + $ttl;

  $segments = [
    base64url_encode(json_encode($header, JSON_UNESCAPED_SLASHES)),
    base64url_encode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
  ];
  $signing_input = implode('.', $segments);
  $signature = hash_hmac('sha256', $signing_input, JWT_SECRET, true);
  $segments[] = base64url_encode($signature);

  return implode('.', $segments);
}

/**
 * Verifikasi & decode JWT.
 * @return array|false payload jika valid, false jika tidak.
 */
function verify_jwt(?string $token) {
  if (!$token) return false;
  $parts = explode('.', $token);
  if (count($parts) !== 3) return false;

  [$h, $p, $s] = $parts;
  $signing_input = $h . '.' . $p;
  $expected = base64url_encode(hash_hmac('sha256', $signing_input, JWT_SECRET, true));

  if (!hash_equals($expected, $s)) return false;

  $payload = json_decode(base64url_decode($p), true);
  if (!is_array($payload)) return false;
  if (isset($payload['exp']) && time() >= $payload['exp']) return false;

  return $payload;
}

/**
 * Ambil token dari header Authorization: Bearer xxx
 */
function get_bearer_token(): ?string {
  $headers = null;
  if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
    $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
  } elseif (function_exists('apache_request_headers')) {
    $req = apache_request_headers();
    $req = array_change_key_case($req, CASE_LOWER);
    if (isset($req['authorization'])) {
      $headers = trim($req['authorization']);
    }
  }
  if ($headers && preg_match('/Bearer\s+(.*)$/i', $headers, $m)) {
    return $m[1];
  }
  return null;
}

/**
 * Guard endpoint admin. Hentikan request (401) jika token tidak valid.
 * @return array payload JWT terverifikasi.
 */
function require_auth(): array {
  $token = get_bearer_token();
  $payload = verify_jwt($token);
  if ($payload === false) {
    json_error('Unauthorized — token tidak valid atau kedaluwarsa.', 401);
  }
  return $payload;
}
