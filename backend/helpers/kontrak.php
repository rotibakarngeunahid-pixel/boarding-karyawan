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
