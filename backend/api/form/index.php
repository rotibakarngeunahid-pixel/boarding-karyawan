<?php
// /api/form   (admin)
//   GET           -> daftar semua field (termasuk nonaktif)
//   POST          -> buat field kustom
//   PUT ?id=N     -> update field
//   PUT (reorder) -> body { reorder: [{id, urutan}, ...] }
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/auth.php';
require_once __DIR__ . '/../../helpers/form.php';
require_once __DIR__ . '/../../helpers/onboarding.php'; // slugify, short_code

/** Baca objek kondisi { field, op, value } dari body -> [field, op, value]. */
function read_cond($c): array {
  if (!is_array($c) || empty($c['field'])) return [null, null, null];
  $op = (isset($c['op']) && $c['op'] === '!=') ? '!=' : '=';
  $val = isset($c['value']) ? (string) $c['value'] : '';
  return [(string) $c['field'], $op, $val];
}

/** Encode opsi jadi JSON string (atau null bila bukan select/radio). */
function encode_opsi($tipe, $opsi) {
  if (!in_array($tipe, ['select', 'radio'], true)) return null;
  if (!is_array($opsi)) return null;
  $clean = [];
  foreach ($opsi as $o) {
    $o = trim((string) $o);
    if ($o !== '') $clean[] = $o;
  }
  return $clean ? json_encode(array_values($clean), JSON_UNESCAPED_UNICODE) : null;
}

$method = get_effective_method();
$db = getDB();

try {
  // ── GET: daftar semua field ──────────────────────────────
  if ($method === 'GET') {
    require_auth();
    json_success(load_form_fields($db, false));
  }

  // ── POST: buat field kustom ──────────────────────────────
  if ($method === 'POST') {
    require_auth();
    $body = get_json_body();

    $label = trim($body['label'] ?? '');
    $tipe  = $body['tipe'] ?? 'text';
    if ($label === '') json_error('Label pertanyaan wajib diisi.', 422);
    if (!in_array($tipe, form_allowed_types(), true)) json_error('Tipe field tidak valid.', 422);

    $opsi = encode_opsi($tipe, $body['opsi'] ?? null);
    if (in_array($tipe, ['select', 'radio'], true) && !$opsi) {
      json_error('Pilihan jawaban wajib diisi untuk tipe dropdown/pilihan.', 422);
    }

    // field_key unik, diawali 'f_' agar tidak bentrok dengan kolom builtin
    $base = 'f_' . str_replace('-', '_', slugify($label, 40));
    $check = $db->prepare('SELECT 1 FROM form_fields WHERE field_key = ? LIMIT 1');
    $key = $base;
    $check->execute([$key]);
    while ($check->fetchColumn()) {
      $key = $base . '_' . short_code(3);
      $check->execute([$key]);
    }

    [$sf, $so, $sv] = read_cond($body['show_if'] ?? null);
    [$wf, $wo, $wv] = read_cond($body['wajib_if'] ?? null);

    $urutan = isset($body['urutan']) ? (int) $body['urutan']
      : (int) $db->query('SELECT COALESCE(MAX(urutan),0)+1 FROM form_fields')->fetchColumn();

    $stmt = $db->prepare(
      'INSERT INTO form_fields
        (field_key, label, tipe, opsi, placeholder, bantuan, wajib, aktif, is_builtin, is_locked, kolom_db, urutan,
         show_if_field, show_if_op, show_if_value, wajib_if_field, wajib_if_op, wajib_if_value)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, NULL, ?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
      $key, $label, $tipe, $opsi,
      $body['placeholder'] ?? null, $body['bantuan'] ?? null,
      !empty($body['wajib']) ? 1 : 0,
      isset($body['aktif']) ? (!empty($body['aktif']) ? 1 : 0) : 1,
      $urutan,
      $sf, $so, $sv, $wf, $wo, $wv,
    ]);

    $id = (int) $db->lastInsertId();
    $row = $db->query('SELECT * FROM form_fields WHERE id = ' . $id)->fetch();
    json_success(parse_field($row), 'Pertanyaan ditambahkan.', 201);
  }

  // ── PUT: reorder atau update ─────────────────────────────
  if ($method === 'PUT') {
    require_auth();
    $body = get_json_body();

    // Reorder dicek SEBELUM validasi id (id bisa 0 sebagai placeholder)
    if (isset($body['reorder']) && is_array($body['reorder'])) {
      $stmt = $db->prepare('UPDATE form_fields SET urutan = ? WHERE id = ?');
      foreach ($body['reorder'] as $item) {
        $stmt->execute([(int) $item['urutan'], (int) $item['id']]);
      }
      json_success(null, 'Urutan diperbarui.');
    }

    $id = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if (!$id) json_error('Parameter id wajib.', 422);

    $existing = $db->prepare('SELECT * FROM form_fields WHERE id = ? LIMIT 1');
    $existing->execute([$id]);
    $f = $existing->fetch();
    if (!$f) json_error('Field tidak ditemukan.', 404);

    $isBuiltin = (int) $f['is_builtin'] === 1;
    $isLocked  = (int) $f['is_locked'] === 1;

    // Tipe & kolom_db builtin tidak boleh diubah (jaga pemetaan kolom DB)
    $tipe = $isBuiltin ? $f['tipe'] : ($body['tipe'] ?? $f['tipe']);
    if (!in_array($tipe, form_allowed_types(), true)) json_error('Tipe field tidak valid.', 422);

    $label = isset($body['label']) ? trim($body['label']) : $f['label'];
    if ($label === '') json_error('Label pertanyaan wajib diisi.', 422);

    $opsi = array_key_exists('opsi', $body) ? encode_opsi($tipe, $body['opsi']) : $f['opsi'];
    if (!in_array($tipe, ['select', 'radio'], true)) $opsi = null;

    if ($isLocked) {
      // Field inti: selalu wajib & aktif, tanpa aturan kondisional.
      $wajib = 1; $aktif = 1;
      $sf = $so = $sv = $wf = $wo = $wv = null;
    } else {
      $wajib = isset($body['wajib']) ? (!empty($body['wajib']) ? 1 : 0) : (int) $f['wajib'];
      $aktif = isset($body['aktif']) ? (!empty($body['aktif']) ? 1 : 0) : (int) $f['aktif'];
      if (array_key_exists('show_if', $body))  { [$sf, $so, $sv] = read_cond($body['show_if']); }
      else { $sf = $f['show_if_field']; $so = $f['show_if_op']; $sv = $f['show_if_value']; }
      if (array_key_exists('wajib_if', $body)) { [$wf, $wo, $wv] = read_cond($body['wajib_if']); }
      else { $wf = $f['wajib_if_field']; $wo = $f['wajib_if_op']; $wv = $f['wajib_if_value']; }
    }

    $stmt = $db->prepare(
      'UPDATE form_fields SET
        label = ?, tipe = ?, opsi = ?, placeholder = ?, bantuan = ?, wajib = ?, aktif = ?,
        show_if_field = ?, show_if_op = ?, show_if_value = ?,
        wajib_if_field = ?, wajib_if_op = ?, wajib_if_value = ?
       WHERE id = ?'
    );
    $stmt->execute([
      $label, $tipe, $opsi,
      array_key_exists('placeholder', $body) ? $body['placeholder'] : $f['placeholder'],
      array_key_exists('bantuan', $body) ? $body['bantuan'] : $f['bantuan'],
      $wajib, $aktif,
      $sf, $so, $sv, $wf, $wo, $wv,
      $id,
    ]);

    $row = $db->query('SELECT * FROM form_fields WHERE id = ' . $id)->fetch();
    json_success(parse_field($row), 'Pertanyaan diperbarui.');
  }

  json_error('Method not allowed.', 405);
} catch (Throwable $e) {
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
