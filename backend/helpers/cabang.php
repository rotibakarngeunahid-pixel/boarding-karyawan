<?php
// ============================================================
// HELPER: CABANG DINAMIS
// Daftar cabang tersimpan di tabel `cabang` (bisa ditambah admin).
// ============================================================

/**
 * Ambil daftar cabang.
 * @param bool $activeOnly hanya cabang aktif.
 * @return array<int,array{id:int,nama:string,aktif:int,urutan:int}>
 */
function get_cabang_list(PDO $db, bool $activeOnly = false): array {
  $sql = 'SELECT id, nama, aktif, urutan FROM cabang';
  if ($activeOnly) $sql .= ' WHERE aktif = 1';
  $sql .= ' ORDER BY urutan ASC, nama ASC';
  $rows = $db->query($sql)->fetchAll();
  foreach ($rows as &$r) {
    $r['id']     = (int) $r['id'];
    $r['aktif']  = (int) $r['aktif'];
    $r['urutan'] = (int) $r['urutan'];
  }
  return $rows;
}

/** Apakah nama cabang ada di tabel cabang (aktif maupun nonaktif). */
function cabang_is_valid(PDO $db, string $nama): bool {
  $stmt = $db->prepare('SELECT 1 FROM cabang WHERE nama = ? LIMIT 1');
  $stmt->execute([$nama]);
  return (bool) $stmt->fetchColumn();
}

/** Jumlah data yang masih memakai sebuah cabang (untuk cek aman-hapus). */
function cabang_usage_count(PDO $db, string $nama): int {
  $total = 0;
  foreach (['onboarding_invitations', 'karyawan', 'kontrak'] as $t) {
    $stmt = $db->prepare("SELECT COUNT(*) FROM $t WHERE cabang = ?"); // $t dari whitelist tetap
    $stmt->execute([$nama]);
    $total += (int) $stmt->fetchColumn();
  }
  return $total;
}
