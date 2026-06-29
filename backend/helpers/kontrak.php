<?php
// HELPER: generate nomor kontrak PKWT/RBN/{YYYY}/{seq 3 digit}

/**
 * Hasilkan nomor kontrak unik untuk tahun berjalan.
 * Sequence = COUNT kontrak pada tahun yang sama + 1, dipad 3 digit.
 * Memakai loop kecil untuk menghindari tabrakan UNIQUE bila ada gap.
 */
function generate_nomor_kontrak(PDO $db, ?int $year = null): string {
  $year = $year ?: (int) date('Y');

  $stmt = $db->prepare('SELECT COUNT(*) AS c FROM kontrak WHERE YEAR(created_at) = ?');
  $stmt->execute([$year]);
  $count = (int) $stmt->fetch()['c'];

  $check = $db->prepare('SELECT 1 FROM kontrak WHERE nomor_kontrak = ? LIMIT 1');
  do {
    $count++;
    $nomor = sprintf('PKWT/RBN/%d/%03d', $year, $count);
    $check->execute([$nomor]);
    $exists = (bool) $check->fetchColumn();
  } while ($exists);

  return $nomor;
}

/**
 * Hasilkan token publik unik untuk halaman tanda tangan kontrak.
 */
function generate_sign_token(PDO $db): string {
  $check = $db->prepare('SELECT 1 FROM kontrak WHERE sign_token = ? LIMIT 1');
  do {
    $token = bin2hex(random_bytes(20)); // 40 char
    $check->execute([$token]);
    $exists = (bool) $check->fetchColumn();
  } while ($exists);
  return $token;
}

/**
 * Pastikan kontrak punya sign_token. Bila masih NULL, buatkan & simpan.
 * @return string token aktif untuk kontrak ini.
 */
function ensure_sign_token(PDO $db, int $kontrakId, ?string $existing): string {
  if ($existing) return $existing;
  $token = generate_sign_token($db);
  $stmt = $db->prepare('UPDATE kontrak SET sign_token = ? WHERE id = ?');
  $stmt->execute([$token, $kontrakId]);
  return $token;
}

/**
 * Buat kontrak OTOMATIS saat kandidat (yang berasal dari undangan onboarding)
 * LOLOS tes. Tanggal mulai = hari ini, tanggal berakhir = mulai + durasi bulan
 * (durasi diambil dari undangan; default 3 bulan bila admin tak mengisinya).
 *
 * - Hanya untuk karyawan yang berasal dari undangan (punya invitation_id).
 * - Bila kontrak untuk karyawan ini sudah ada, kontrak lama dipakai ulang
 *   (tidak menggandakan) dan token tanda tangannya dikembalikan.
 *
 * @return array{kontrak_id:int, sign_token:string, reused:bool}|null
 */
function auto_create_kontrak_on_pass(PDO $db, int $karyawanId): ?array {
  $stmt = $db->prepare(
    'SELECT kr.id, kr.posisi AS kr_posisi, kr.cabang, kr.invitation_id,
            i.posisi AS inv_posisi, i.kontrak_durasi_bulan, i.kontrak_gaji_pokok, i.kontrak_catatan
       FROM karyawan kr
       LEFT JOIN onboarding_invitations i ON i.id = kr.invitation_id
      WHERE kr.id = ? LIMIT 1'
  );
  $stmt->execute([$karyawanId]);
  $r = $stmt->fetch();
  if (!$r) return null;

  // Hanya kandidat yang berasal dari undangan onboarding.
  if (empty($r['invitation_id'])) return null;

  // Sudah punya kontrak? pakai yang sudah ada (hindari duplikat saat re-submit).
  $ex = $db->prepare('SELECT id, sign_token FROM kontrak WHERE karyawan_id = ? ORDER BY id DESC LIMIT 1');
  $ex->execute([$karyawanId]);
  $existing = $ex->fetch();
  if ($existing) {
    $token = ensure_sign_token($db, (int) $existing['id'], $existing['sign_token'] ?? null);
    return ['kontrak_id' => (int) $existing['id'], 'sign_token' => $token, 'reused' => true];
  }

  $durasi = (int) ($r['kontrak_durasi_bulan'] ?? 0);
  if ($durasi <= 0) $durasi = 3; // default aman bila admin tak mengisi durasi
  $posisi = trim((string) ($r['kr_posisi'] ?? '')) !== ''
    ? (string) $r['kr_posisi']
    : (string) ($r['inv_posisi'] ?? '-');
  $cabang = (string) $r['cabang'];
  $gaji = ($r['kontrak_gaji_pokok'] !== null && $r['kontrak_gaji_pokok'] !== '')
    ? (float) $r['kontrak_gaji_pokok'] : null;

  $nomor = generate_nomor_kontrak($db);
  $sign_token = generate_sign_token($db);

  $stmt = $db->prepare(
    'INSERT INTO kontrak
      (karyawan_id, nomor_kontrak, tanggal_mulai, tanggal_berakhir, posisi, cabang, gaji_pokok, catatan, sign_token, created_by)
     VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? MONTH), ?, ?, ?, ?, ?, NULL)'
  );
  $stmt->execute([
    $karyawanId, $nomor, $durasi, $posisi, $cabang, $gaji, $r['kontrak_catatan'] ?? null, $sign_token,
  ]);

  return ['kontrak_id' => (int) $db->lastInsertId(), 'sign_token' => $sign_token, 'reused' => false];
}
