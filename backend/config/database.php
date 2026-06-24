<?php
// ============================================================
// RBN BOARDING SYSTEM — DATABASE & APP CONFIG
// ============================================================

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'rbn_boarding');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'ganti_dengan_secret_panjang_random_minimal_32_karakter');
define('UPLOAD_BASE', __DIR__ . '/../uploads/');
define('UPLOAD_URL_BASE', getenv('UPLOAD_URL_BASE') ?: 'https://api.boarding.rotibakarngeunah.my.id/uploads/');

function getDB(): PDO {
  static $pdo = null;
  if ($pdo === null) {
    $pdo = new PDO(
      "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
      DB_USER, DB_PASS,
      [
        PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES   => false,
      ]
    );
  }
  return $pdo;
}
