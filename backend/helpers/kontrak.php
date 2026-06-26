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
