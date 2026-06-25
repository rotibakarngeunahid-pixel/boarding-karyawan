<?php
// GET /api/form/public   (PUBLIC)
// Daftar field aktif untuk merender form onboarding.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/form.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}

try {
  $db = getDB();
  json_success(load_form_fields($db, true));
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
