<?php
// /api/tes/soal
//  GET (public):  ?token=xxx&karyawan_id=N -> soal aktif TANPA jawaban_benar + cek sisa percobaan
//  GET (admin):   (Bearer)                 -> semua soal TERMASUK jawaban_benar
//  POST (admin):  tambah soal
//  PUT (admin):   ?id=N edit soal
//  DELETE (admin):?id=N hapus soal
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';

$method = $_SERVER['REQUEST_METHOD'];

try {
  $db = getDB();

  // ── GET ──────────────────────────────────────────────
  if ($method === 'GET') {
    $is_admin = verify_jwt(get_bearer_token()) !== false;

    if ($is_admin) {
      $rows = $db->query('SELECT * FROM tes_soal ORDER BY urutan ASC, id ASC')->fetchAll();
      json_success($rows);
    }

    // Public: butuh token undangan + karyawan_id, cek max percobaan
    $token = $_GET['token'] ?? '';
    $karyawan_id = isset($_GET['karyawan_id']) ? (int) $_GET['karyawan_id'] : 0;
    if ($token === '' || !$karyawan_id) {
      json_error('Token dan karyawan_id wajib disertakan.', 422);
    }

    // Validasi token
    $stmt = $db->prepare('SELECT id, expires_at FROM onboarding_invitations WHERE token = ? LIMIT 1');
    $stmt->execute([$token]);
    if (!$stmt->fetch()) {
      json_error('Token tidak valid.', 403);
    }

    $pengaturan = $db->query('SELECT * FROM tes_pengaturan WHERE id = 1')->fetch();
    $max = (int) ($pengaturan['max_percobaan'] ?? 3);

    $stmt = $db->prepare('SELECT total_percobaan_tes FROM karyawan WHERE id = ? LIMIT 1');
    $stmt->execute([$karyawan_id]);
    $kar = $stmt->fetch();
    if (!$kar) {
      json_error('Karyawan tidak ditemukan.', 404);
    }
    $percobaan = (int) $kar['total_percobaan_tes'];

    if ($max > 0 && $percobaan >= $max) {
      json_error('Percobaan tes sudah habis, hubungi admin.', 403, ['max_reached']);
    }

    $stmt = $db->query(
      'SELECT id, pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, poin, urutan
       FROM tes_soal WHERE aktif = 1 ORDER BY urutan ASC, id ASC'
    );
    $soal = $stmt->fetchAll();

    json_success([
      'soal'        => $soal,
      'pengaturan'  => [
        'passing_grade'          => (int) $pengaturan['passing_grade'],
        'waktu_pengerjaan_menit' => (int) $pengaturan['waktu_pengerjaan_menit'],
        'max_percobaan'          => $max,
      ],
      'sisa_percobaan' => $max > 0 ? max(0, $max - $percobaan) : null,
    ]);
  }

  // ── Mutasi: butuh admin ──────────────────────────────
  require_auth();

  if ($method === 'POST') {
    $body = get_json_body();
    $missing = validate_required($body, ['pertanyaan', 'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'jawaban_benar']);
    if ($missing) {
      json_error('Field soal belum lengkap.', 422, $missing);
    }
    if (!in_array(strtolower($body['jawaban_benar']), ['a', 'b', 'c', 'd'], true)) {
      json_error('Jawaban benar harus a/b/c/d.', 422);
    }

    $stmt = $db->prepare(
      'INSERT INTO tes_soal (pertanyaan, pilihan_a, pilihan_b, pilihan_c, pilihan_d, jawaban_benar, poin, urutan, aktif)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      $body['pertanyaan'],
      $body['pilihan_a'], $body['pilihan_b'], $body['pilihan_c'], $body['pilihan_d'],
      strtolower($body['jawaban_benar']),
      isset($body['poin']) ? (int) $body['poin'] : 10,
      isset($body['urutan']) ? (int) $body['urutan'] : 0,
      isset($body['aktif']) ? (int) (bool) $body['aktif'] : 1,
    ]);
    json_success(['id' => (int) $db->lastInsertId()], 'Soal berhasil ditambahkan.', 201);
  }

  if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) json_error('Parameter id wajib.', 422);
    $body = get_json_body();

    // Dukungan reorder massal: { reorder: [{id, urutan}, ...] }
    if (isset($body['reorder']) && is_array($body['reorder'])) {
      $stmt = $db->prepare('UPDATE tes_soal SET urutan = ? WHERE id = ?');
      foreach ($body['reorder'] as $item) {
        $stmt->execute([(int) $item['urutan'], (int) $item['id']]);
      }
      json_success(null, 'Urutan soal diperbarui.');
    }

    $missing = validate_required($body, ['pertanyaan', 'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'jawaban_benar']);
    if ($missing) {
      json_error('Field soal belum lengkap.', 422, $missing);
    }
    $stmt = $db->prepare(
      'UPDATE tes_soal SET pertanyaan=?, pilihan_a=?, pilihan_b=?, pilihan_c=?, pilihan_d=?,
        jawaban_benar=?, poin=?, urutan=?, aktif=? WHERE id=?'
    );
    $stmt->execute([
      $body['pertanyaan'],
      $body['pilihan_a'], $body['pilihan_b'], $body['pilihan_c'], $body['pilihan_d'],
      strtolower($body['jawaban_benar']),
      isset($body['poin']) ? (int) $body['poin'] : 10,
      isset($body['urutan']) ? (int) $body['urutan'] : 0,
      isset($body['aktif']) ? (int) (bool) $body['aktif'] : 1,
      $id,
    ]);
    json_success(null, 'Soal berhasil diperbarui.');
  }

  if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) json_error('Parameter id wajib.', 422);
    // Soft-delete: deaktivasi agar histori hasil tes tetap konsisten.
    $stmt = $db->prepare('UPDATE tes_soal SET aktif = 0 WHERE id = ?');
    $stmt->execute([$id]);
    json_success(null, 'Soal dinonaktifkan.');
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
