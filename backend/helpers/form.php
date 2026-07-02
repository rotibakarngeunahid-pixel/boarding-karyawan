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

/**
 * Rapikan kapitalisasi nama: "dWi ADithya" -> "Dwi Adithya".
 * Setiap kata diawali huruf besar, sisanya kecil (mendukung UTF-8).
 */
function rbn_title_case(string $s): string {
  $s = trim(preg_replace('/\s+/', ' ', $s));
  if ($s === '') return $s;
  if (function_exists('mb_convert_case')) {
    return mb_convert_case($s, MB_CASE_TITLE, 'UTF-8');
  }
  return ucwords(strtolower($s));
}

// Field yang otomatis dirapikan kapitalisasinya saat disimpan.
function rbn_title_case_fields(): array {
  return ['nama_lengkap', 'nama_panggilan'];
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

/**
 * Kumpulkan & validasi jawaban form onboarding (dinamis) menjadi kolom karyawan.
 * Dipakai bersama oleh submit.php (publik) & karyawan/index.php (input manual admin).
 *
 * - Mengevaluasi aturan show_if / wajib_if terhadap nilai yang dikirim.
 * - Memvalidasi field wajib & pilihan select/radio.
 * - Mengunggah file (foto_ktp/foto_diri/kustom) setelah validasi non-file lolos.
 * - Memanggil json_error() langsung bila ada kesalahan (pola konsisten codebase).
 *
 * @param array $post         data teks ($_POST)
 * @param array $files        data file ($_FILES)
 * @param bool  $filesOptional true = file tidak diwajibkan meski definisi field wajib
 *                             (dipakai untuk input manual admin yang fotonya menyusul).
 * @return array{columns: array<string,mixed>, custom: array<int,array>}
 */
function collect_karyawan_columns(PDO $db, array $post, array $files, bool $filesOptional = false): array {
  require_once __DIR__ . '/response.php';
  require_once __DIR__ . '/upload.php';

  $fields = load_form_fields($db, true);
  $values = $post; // driver aturan kondisional (teks/radio/select)

  $missing  = [];
  $columns  = [];   // builtin: kolom_db => nilai
  $custom   = [];   // field kustom: snapshot {key,label,tipe,value}
  $toUpload = [];   // file field yang akan diunggah di pass 2

  foreach ($fields as $f) {
    if (!field_visible($f, $values)) continue;          // tersembunyi -> lewati total
    $key      = $f['field_key'];
    $required = field_required($f, $values);

    if ($f['tipe'] === 'file') {
      $hasFile = isset($files[$key])
        && is_array($files[$key])
        && ($files[$key]['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK;
      if ($required && !$hasFile && !$filesOptional) { $missing[] = $f['label']; continue; }
      if ($hasFile) $toUpload[] = $f;
      continue;
    }

    $val = isset($post[$key]) ? trim((string) $post[$key]) : '';
    // Rapikan kapitalisasi untuk field nama.
    if ($val !== '' && in_array($f['field_key'], rbn_title_case_fields(), true)) {
      $val = rbn_title_case($val);
    }
    if ($required && $val === '') { $missing[] = $f['label']; continue; }

    if ($val !== '' && in_array($f['tipe'], ['select', 'radio'], true)
        && !empty($f['opsi']) && !in_array($val, $f['opsi'], true)) {
      json_error('Nilai tidak valid untuk: ' . $f['label'], 422);
    }

    // Field tanggal wajib ISO YYYY-MM-DD & tanggal kalender sah (mis. tolak 30 Feb).
    if ($val !== '' && $f['tipe'] === 'date') {
      $ok = preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $val, $dm)
        && checkdate((int) $dm[2], (int) $dm[3], (int) $dm[1]);
      if (!$ok) {
        json_error('Tanggal tidak valid untuk: ' . $f['label'], 422);
      }
    }

    if ($f['is_builtin'] && $f['kolom_db']) {
      $columns[$f['kolom_db']] = ($val !== '') ? $val : null;
    } elseif (!$f['is_builtin']) {
      $custom[$key] = ['key' => $key, 'label' => $f['label'], 'tipe' => $f['tipe'], 'value' => $val];
    }
  }

  if ($missing) {
    json_error('Beberapa field wajib belum diisi.', 422, $missing);
  }

  // Upload file setelah validasi non-file lolos -> hindari file yatim.
  foreach ($toUpload as $f) {
    $key = $f['field_key'];
    $subdir = $key === 'foto_ktp' ? 'ktp' : ($key === 'foto_diri' ? 'foto_diri' : 'custom');
    $up = handle_upload($files[$key], $subdir);
    if (!$up['ok']) {
      json_error($f['label'] . ': ' . $up['error'], 422);
    }
    if ($f['is_builtin'] && $f['kolom_db']) {
      $columns[$f['kolom_db']] = $up['path'];
    } elseif (!$f['is_builtin']) {
      $custom[$key] = ['key' => $key, 'label' => $f['label'], 'tipe' => 'file', 'value' => $up['path']];
    }
  }

  return ['columns' => $columns, 'custom' => $custom];
}
