<?php
// ============================================================
// HELPER: JSON RESPONSE
// Struktur baku: { success, data?, message?, errors? }
// ============================================================

function json_response($data = null, int $code = 200, ?string $message = null, ?array $errors = null): void {
  http_response_code($code);
  header('Content-Type: application/json; charset=utf-8');

  $payload = ['success' => $code >= 200 && $code < 300];
  if ($data !== null)    $payload['data'] = $data;
  if ($message !== null) $payload['message'] = $message;
  if ($errors !== null)  $payload['errors'] = $errors;

  echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

function json_success($data = null, ?string $message = null, int $code = 200): void {
  json_response($data, $code, $message);
}

function json_error(string $message, int $code = 400, ?array $errors = null): void {
  json_response(null, $code, $message, $errors);
}

/**
 * Ambil body request sebagai array.
 * Mendukung JSON dan form-data.
 */
function get_json_body(): array {
  $raw = file_get_contents('php://input');
  if ($raw === '' || $raw === false) {
    return $_POST ?: [];
  }
  $decoded = json_decode($raw, true);
  return is_array($decoded) ? $decoded : ($_POST ?: []);
}

/**
 * Validasi field wajib ada & tidak kosong.
 * Mengembalikan array nama field yang hilang.
 */
function validate_required(array $data, array $fields): array {
  $missing = [];
  foreach ($fields as $field) {
    if (!isset($data[$field]) || (is_string($data[$field]) && trim($data[$field]) === '')) {
      $missing[] = $field;
    }
  }
  return $missing;
}
