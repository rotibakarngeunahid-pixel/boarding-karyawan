<?php
// GET /api/kontrak/preview-template?cabang=X   (admin)
// Preview template kontrak aktif untuk sebuah cabang memakai DATA CONTOH.
// cabang kosong = preview template "Umum".
// Berguna untuk mengecek tampilan template sebelum dipakai kontrak asli.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/kontrak_document.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
  json_error('Method not allowed.', 405);
}
require_auth();

$cabang = isset($_GET['cabang']) ? trim((string) $_GET['cabang']) : '';

try {
  $db = getDB();

  // Data contoh untuk mengisi placeholder template.
  $k = [
    'nama_lengkap'     => 'Budi Santoso',
    'nama_panggilan'   => 'Budi',
    'jenis_kelamin'    => 'Laki-Laki',
    'no_whatsapp'      => '081234567890',
    'no_ktp'           => '5101234567890001',
    'alamat_tinggal'   => 'Jl. Contoh No. 1, Denpasar',
    'provinsi_lahir'   => 'Bali',
    'tanggal_lahir'    => '2000-01-15',
    'posisi'           => 'Crew',
    // cabang '' -> render_kontrak_preview memakai template Umum (fallback).
    'cabang'           => $cabang,
    'nomor_kontrak'    => 'PKWT/RBN/' . date('Y') . '/001',
    'tanggal_mulai'    => date('Y-m-d'),
    'tanggal_berakhir' => date('Y-m-d', strtotime('+3 months')),
    'gaji_pokok'       => 2500000,
    'catatan'          => 'Ini data CONTOH untuk mengecek tampilan template kontrak.',
  ];

  $rendered = render_kontrak_preview($db, $k);
  $rendered['contoh'] = true; // tandai: ini preview dengan data contoh
  json_success($rendered);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
