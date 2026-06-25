<?php
// ============================================================
// HELPER: FORM BUILDER ONBOARDING
// Memuat definisi field & mengevaluasi aturan kondisional.
// Dipakai bersama oleh submit.php (publik) & api/form (admin).
// ============================================================

require_once __DIR__ . '/../config/database.php';

// Tipe field yang didukung
function form_allowed_types(): array {
  return ['text', 'textarea', 'number', 'tel', 'date', 'select', 'radio', 'file'];
}

/** Normalisasi satu baris form_fields: decode opsi & cast angka/boolean. */
function parse_field(array $r): array {
  $r['id']         = (int) $r['id'];
  $r['urutan']     = (int) $r['urutan'];
  $r['wajib']      = (int) $r['wajib'];
  $r['aktif']      = (int) $r['aktif'];
  $r['is_builtin'] = (int) $r['is_builtin'];
  $r['is_locked']  = (int) $r['is_locked'];

  $opsi = [];
  if (!empty($r['opsi'])) {
    $decoded = json_decode($r['opsi'], true);
    if (is_array($decoded)) $opsi = $decoded;
  }
  $r['opsi'] = $opsi;

  // Bentuk aturan jadi objek bersarang agar mudah dipakai frontend.
  $r['show_if'] = !empty($r['show_if_field'])
    ? ['field' => $r['show_if_field'], 'op' => $r['show_if_op'] ?: '=', 'value' => (string) $r['show_if_value']]
    : null;
  $r['wajib_if'] = !empty($r['wajib_if_field'])
    ? ['field' => $r['wajib_if_field'], 'op' => $r['wajib_if_op'] ?: '=', 'value' => (string) $r['wajib_if_value']]
    : null;

  return $r;
}

/**
 * Ambil semua field form.
 * @param bool $activeOnly hanya field aktif (untuk form publik).
 */
function load_form_fields(PDO $db, bool $activeOnly = false): array {
  $sql = 'SELECT * FROM form_fields';
  if ($activeOnly) $sql .= ' WHERE aktif = 1';
  $sql .= ' ORDER BY urutan ASC, id ASC';
  $rows = $db->query($sql)->fetchAll();
  return array_map('parse_field', $rows);
}

/** Cek satu aturan (op '=' atau '!=') terhadap nilai yang dikirim. */
function rule_matches(?string $field, ?string $op, ?string $value, array $values): bool {
  if (!$field) return false;
  $actual = isset($values[$field]) ? (string) $values[$field] : '';
  $value = (string) $value;
  return ($op === '!=') ? ($actual !== $value) : ($actual === $value);
}

/** Apakah field ditampilkan berdasarkan aturan show_if & nilai saat ini. */
function field_visible(array $f, array $values): bool {
  if (empty($f['show_if_field'])) return true;
  return rule_matches($f['show_if_field'], $f['show_if_op'], $f['show_if_value'], $values);
}

/** Apakah field wajib diisi (wajib statis ATAU wajib_if cocok). */
function field_required(array $f, array $values): bool {
  if ((int) $f['wajib'] === 1) return true;
  if (!empty($f['wajib_if_field'])) {
    return rule_matches($f['wajib_if_field'], $f['wajib_if_op'], $f['wajib_if_value'], $values);
  }
  return false;
}
