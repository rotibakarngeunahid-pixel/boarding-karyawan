<?php
// POST /api/tes/upload-gambar   (admin, multipart/form-data)
// REVISI 4 — upload gambar lampiran soal. Field file: 'gambar'. Max 2MB.
// Response: { path, url } -> path disimpan ke kolom question_image saat simpan soal.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/upload.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}
require_auth();

if (empty($_FILES['gambar'])) {
  json_error('File gambar wajib diunggah.', 422);
}

$res = handle_upload($_FILES['gambar'], 'soal', 2 * 1024 * 1024); // max 2MB
if (!$res['ok']) {
  json_error($res['error'], 422);
}

json_success([
  'path' => $res['path'],
  'url'  => $res['url'],
], 'Gambar berhasil diunggah.', 201);
