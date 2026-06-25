<?php
// HELPER: slug & lookup undangan onboarding (REVISI 6)

/** Ubah teks jadi slug: lowercase, spasi -> '-', maksimal $max char. */
function slugify(string $text, int $max = 20): string {
  $text = strtolower(trim($text));
  $text = preg_replace('/[^a-z0-9]+/', '-', $text); // non-alfanumerik -> '-'
  $text = trim($text, '-');
  if ($text === '') $text = 'posisi';
  if (strlen($text) > $max) {
    $text = rtrim(substr($text, 0, $max), '-');
  }
  return $text;
}

/** Kode pendek 4 karakter alfanumerik lowercase (bukan angka murni). */
function short_code(int $len = 4): string {
  // tanpa huruf/angka ambigu (0,o,1,l,i) agar mudah dibaca
  $alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  $out = '';
  for ($i = 0; $i < $len; $i++) {
    $out .= $alphabet[random_int(0, strlen($alphabet) - 1)];
  }
  return $out;
}

/**
 * Buat test_slug unik: {slug-posisi}-{kode4}. Cek UNIQUE di DB.
 */
function generate_test_slug(PDO $db, string $posisi): string {
  $base = slugify($posisi, 20);
  $check = $db->prepare('SELECT 1 FROM onboarding_invitations WHERE test_slug = ? LIMIT 1');
  do {
    $slug = $base . '-' . short_code(4);
    $check->execute([$slug]);
    $exists = (bool) $check->fetchColumn();
  } while ($exists);
  return $slug;
}

/**
 * Cari undangan berdasarkan token ATAU test_slug (mendukung link lama & baru).
 * @return array|false baris undangan atau false.
 */
function find_invitation_by_ref(PDO $db, string $ref) {
  $stmt = $db->prepare(
    'SELECT * FROM onboarding_invitations WHERE token = ? OR test_slug = ? LIMIT 1'
  );
  $stmt->execute([$ref, $ref]);
  $row = $stmt->fetch();
  return $row ?: false;
}
