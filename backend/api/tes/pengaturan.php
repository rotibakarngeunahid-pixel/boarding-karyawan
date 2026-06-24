<?php
// /api/tes/pengaturan
//  GET (admin): ambil pengaturan tes
//  PUT (admin): update passing_grade, waktu_pengerjaan_menit, max_percobaan
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
require_auth();

try {
  $db = getDB();

  if ($method === 'GET') {
    $row = $db->query('SELECT passing_grade, waktu_pengerjaan_menit, max_percobaan FROM tes_pengaturan WHERE id = 1')->fetch();
    if (!$row) {
      $row = ['passing_grade' => 70, 'waktu_pengerjaan_menit' => 30, 'max_percobaan' => 3];
    }
    $row['passing_grade'] = (int) $row['passing_grade'];
    $row['waktu_pengerjaan_menit'] = (int) $row['waktu_pengerjaan_menit'];
    $row['max_percobaan'] = (int) $row['max_percobaan'];
    json_success($row);
  }

  if ($method === 'PUT') {
    $body = get_json_body();
    $passing = isset($body['passing_grade']) ? (int) $body['passing_grade'] : 70;
    $waktu   = isset($body['waktu_pengerjaan_menit']) ? (int) $body['waktu_pengerjaan_menit'] : 30;
    $maks    = isset($body['max_percobaan']) ? (int) $body['max_percobaan'] : 3;

    if ($passing < 0 || $passing > 100) json_error('Passing grade harus 0-100.', 422);
    if ($waktu < 1) json_error('Waktu pengerjaan minimal 1 menit.', 422);
    if ($maks < 0) json_error('Max percobaan tidak boleh negatif.', 422);

    $stmt = $db->prepare(
      'INSERT INTO tes_pengaturan (id, passing_grade, waktu_pengerjaan_menit, max_percobaan)
       VALUES (1, ?, ?, ?)
       ON DUPLICATE KEY UPDATE passing_grade=VALUES(passing_grade),
         waktu_pengerjaan_menit=VALUES(waktu_pengerjaan_menit),
         max_percobaan=VALUES(max_percobaan)'
    );
    $stmt->execute([$passing, $waktu, $maks]);
    json_success([
      'passing_grade' => $passing,
      'waktu_pengerjaan_menit' => $waktu,
      'max_percobaan' => $maks,
    ], 'Pengaturan tes disimpan.');
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
