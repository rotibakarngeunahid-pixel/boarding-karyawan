<?php
// GET /api/kontrak/expiring?hari=30   (admin)
// Kontrak aktif yang berakhir dalam N hari (termasuk yang sudah lewat / sisa_hari negatif)
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

$hari = isset($_GET['hari']) ? (int) $_GET['hari'] : 30;
if ($hari < 0) $hari = 30;

try {
  $db = getDB();
  $stmt = $db->prepare(
    'SELECT * FROM v_kontrak_aktif WHERE sisa_hari <= ? ORDER BY sisa_hari ASC'
  );
  $stmt->execute([$hari]);
  json_success($stmt->fetchAll());
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
