<?php
// GET /api/kontrak/preview?kontrak_id=N   (admin)
// Mengembalikan preview teks kontrak dari template aktif bila tersedia.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/kontrak_document.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

$kontrak_id = isset($_GET['kontrak_id']) ? (int) $_GET['kontrak_id'] : 0;
if (!$kontrak_id) json_error('Parameter kontrak_id wajib.', 422);

try {
  $db = getDB();

  $k = get_kontrak_document_data($db, $kontrak_id);
  if (!$k) json_error('Kontrak tidak ditemukan.', 404);

  $map = kontrak_placeholder_map($k);
  $tpl = get_active_kontrak_template($db);
  $usingTemplate = false;
  $templateName = null;
  $warning = null;

  if ($tpl) {
    $templateName = $tpl['original_name'];
    $path = rtrim(UPLOAD_BASE, '/\\') . '/templates/' . $tpl['filename'];
    if (is_file($path)) {
      try {
        $text = kontrak_preview_from_template($path, $tpl['filename'], $map);
        $usingTemplate = true;
      } catch (Throwable $e) {
        $text = kontrak_default_preview($k, $map);
        $warning = $e->getMessage();
      }
    } else {
      $text = kontrak_default_preview($k, $map);
      $warning = 'File template tidak ditemukan di server.';
    }
  } else {
    $text = kontrak_default_preview($k, $map);
  }

  json_success([
    'text'           => $text,
    'using_template' => $usingTemplate,
    'template_name'  => $templateName,
    'warning'        => $warning,
    'placeholders'   => $map,
  ]);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
