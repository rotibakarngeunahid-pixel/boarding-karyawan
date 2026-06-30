<?php
// GET /api/aset/diag   (diagnosa — TANPA auth, hanya info struktural non-sensitif)
// Untuk memastikan file backend stempel sudah versi terbaru di server.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
@include_once __DIR__ . '/../../helpers/aset.php';
@include_once __DIR__ . '/../../helpers/kontrak_document.php';

$out = [];
try {
  $out['aset_loaded'] = function_exists('get_stempel_binary');
  $out['stamp_file_exists'] = function_exists('get_stempel_path') ? (get_stempel_path() !== null) : null;
  $out['stamp_settings'] = function_exists('get_stempel_settings') ? get_stempel_settings() : null;

  // Versi kode: jumlah parameter fungsi kunci (latest: drawing=7, fill=5).
  $out['docx_build_drawing_params'] = function_exists('docx_build_drawing')
    ? (new ReflectionFunction('docx_build_drawing'))->getNumberOfParameters() : null;
  $out['fill_docx_params'] = function_exists('fill_docx_template')
    ? (new ReflectionFunction('fill_docx_template'))->getNumberOfParameters() : null;

  $out['preview_doc_exists'] = file_exists(__DIR__ . '/../kontrak/preview-doc.php');
  $out['sign_doc_exists'] = file_exists(__DIR__ . '/../kontrak/sign-doc.php');
  $out['zip_ext'] = class_exists('ZipArchive');
  $out['expected'] = ['docx_build_drawing_params' => 7, 'fill_docx_params' => 5];
} catch (Throwable $e) {
  $out['error'] = $e->getMessage();
}

json_success($out);
