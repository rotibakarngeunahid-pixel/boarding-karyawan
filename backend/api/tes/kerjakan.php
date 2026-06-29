<?php
// POST /api/tes/kerjakan   (PUBLIC)
// Body: { karyawan_id, jawaban: [{ soal_id, jawaban: 'a'|'b'|'c'|'d' }] }
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/kontrak.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}

$body = get_json_body();
$karyawan_id = isset($body['karyawan_id']) ? (int) $body['karyawan_id'] : 0;
$jawaban = $body['jawaban'] ?? null;

if (!$karyawan_id || !is_array($jawaban)) {
  json_error('karyawan_id dan jawaban wajib disertakan.', 422);
}

try {
  $db = getDB();

  // Validasi karyawan
  $stmt = $db->prepare('SELECT id, total_percobaan_tes FROM karyawan WHERE id = ? LIMIT 1');
  $stmt->execute([$karyawan_id]);
  $kar = $stmt->fetch();
  if (!$kar) {
    json_error('Karyawan tidak ditemukan.', 404);
  }

  $pengaturan = $db->query('SELECT * FROM tes_pengaturan WHERE id = 1')->fetch();
  $passing_grade = (int) ($pengaturan['passing_grade'] ?? 70);
  $max = (int) ($pengaturan['max_percobaan'] ?? 3);
  $percobaan = (int) $kar['total_percobaan_tes'];

  if ($max > 0 && $percobaan >= $max) {
    json_error('Percobaan tes sudah habis, hubungi admin.', 403, ['max_reached']);
  }

  // 1. Ambil soal aktif beserta kunci jawaban
  $soal_rows = $db->query(
    'SELECT id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, poin
     FROM tes_soal WHERE aktif = 1 ORDER BY urutan ASC, id ASC'
  )->fetchAll();

  if (!$soal_rows) {
    json_error('Belum ada soal tes yang aktif.', 400);
  }

  // Index jawaban user by soal_id
  $jawaban_map = [];
  foreach ($jawaban as $j) {
    if (isset($j['soal_id'])) {
      $jawaban_map[(int) $j['soal_id']] = strtolower((string) ($j['jawaban'] ?? ''));
    }
  }

  // 2. Hitung skor
  $total_soal  = count($soal_rows);
  $total_benar = 0;
  $total_poin  = 0;
  $maks_poin   = 0;
  $detail = [];

  foreach ($soal_rows as $s) {
    $maks_poin += (int) $s['poin'];
    $user_ans = $jawaban_map[(int) $s['id']] ?? null;
    $benar = ($user_ans !== null && $user_ans === $s['jawaban_benar']);
    if ($benar) {
      $total_benar++;
      $total_poin += (int) $s['poin'];
    }
    $detail[] = [
      'soal_id'       => (int) $s['id'],
      'pertanyaan'    => $s['pertanyaan'],
      'jawaban_user'  => $user_ans,
      'jawaban_benar' => $s['jawaban_benar'],
      'benar'         => $benar,
      'poin'          => (int) $s['poin'],
    ];
  }

  $skor_persen = $maks_poin > 0 ? round(($total_poin / $maks_poin) * 100, 2) : 0;
  $lulus = $skor_persen >= $passing_grade;

  // 4 & 5. Simpan hasil + update snapshot karyawan (transaksi)
  $db->beginTransaction();

  $stmt = $db->prepare(
    'INSERT INTO tes_hasil
      (karyawan_id, total_soal, total_benar, total_poin, maks_poin, skor_persen, passing_grade, lulus, jawaban_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  );
  $stmt->execute([
    $karyawan_id, $total_soal, $total_benar, $total_poin, $maks_poin,
    $skor_persen, $passing_grade, $lulus ? 1 : 0,
    json_encode($detail, JSON_UNESCAPED_UNICODE),
  ]);
  $hasil_id = (int) $db->lastInsertId();

  // Snapshot: simpan skor terbaik & status lulus jika lulus, selalu naikkan counter percobaan
  $upd = $db->prepare(
    'UPDATE karyawan
     SET total_percobaan_tes = total_percobaan_tes + 1,
         skor_tes  = GREATEST(skor_tes, ?),
         lulus_tes = GREATEST(lulus_tes, ?)
     WHERE id = ?'
  );
  $upd->execute([$skor_persen, $lulus ? 1 : 0, $karyawan_id]);

  $db->commit();

  // Jika LOLOS: buat kontrak otomatis (mulai hari ini, durasi dari undangan) lalu
  // kembalikan token tanda tangan agar kandidat bisa LANGSUNG tanda tangan.
  // Kegagalan di sini tidak boleh menggagalkan hasil tes — kontrak bisa dibuat manual.
  $sign_token = null;
  $kontrak_id = null;
  if ($lulus) {
    try {
      $auto = auto_create_kontrak_on_pass($db, $karyawan_id);
      if ($auto) {
        $sign_token = $auto['sign_token'];
        $kontrak_id = $auto['kontrak_id'];
      }
    } catch (Throwable $eKontrak) {
      // diabaikan: hasil tes tetap dikembalikan
    }
  }

  $percobaan_baru = $percobaan + 1;
  json_success([
    'hasil_id'        => $hasil_id,
    'lulus'           => $lulus,
    'skor_persen'     => (float) $skor_persen,
    'total_benar'     => $total_benar,
    'total_soal'      => $total_soal,
    'total_poin'      => $total_poin,
    'maks_poin'       => $maks_poin,
    'passing_grade'   => $passing_grade,
    'sisa_percobaan'  => $max > 0 ? max(0, $max - $percobaan_baru) : null,
    'detail_jawaban'  => $detail,
    'sign_token'      => $sign_token,
    'kontrak_id'      => $kontrak_id,
  ], $lulus ? 'Selamat, kamu LULUS!' : 'Belum lulus, coba lagi ya.');
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
