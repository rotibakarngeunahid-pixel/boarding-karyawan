<?php
// POST /api/onboarding/submit   (PUBLIC, multipart/form-data)
// Validasi & simpan DINAMIS berdasarkan definisi form_fields + aturan kondisional.
require_once __DIR__ . '/../../config/database.php';
require_once __DIR__ . '/../../helpers/response.php';
require_once __DIR__ . '/../../helpers/upload.php';
require_once __DIR__ . '/../../helpers/onboarding.php';
require_once __DIR__ . '/../../helpers/form.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  json_error('Method not allowed.', 405);
}

$data = $_POST;
if (empty($data['token'])) {
  json_error('Token wajib ada.', 422, ['token']);
}

try {
  $db = getDB();

  // 1. Verifikasi token/slug masih valid (pending & belum kedaluwarsa)
  $inv = find_invitation_by_ref($db, $data['token']);
  if (!$inv) {
    json_error('Token tidak ditemukan.', 404);
  }
  if ($inv['status'] !== 'pending') {
    json_error('Link onboarding sudah pernah digunakan.', 409);
  }
  if (strtotime($inv['expires_at']) <= time()) {
    json_error('Link onboarding sudah kedaluwarsa.', 410);
  }

  // 2. Muat definisi field aktif & evaluasi terhadap nilai yang dikirim
  $fields = load_form_fields($db, true);
  $values = $data; // untuk evaluasi aturan kondisional (field driver = teks/radio/select)

  $missing  = [];
  $columns  = [];   // builtin: kolom_db => nilai
  $custom   = [];   // field kustom: snapshot {key,label,tipe,value}
  $toUpload = [];   // file field yang akan diunggah di pass 2

  foreach ($fields as $f) {
    if (!field_visible($f, $values)) continue;          // tersembunyi -> lewati total
    $key      = $f['field_key'];
    $required = field_required($f, $values);

    if ($f['tipe'] === 'file') {
      $hasFile = isset($_FILES[$key])
        && is_array($_FILES[$key])
        && ($_FILES[$key]['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_OK;
      if ($required && !$hasFile) { $missing[] = $f['label']; continue; }
      if ($hasFile) $toUpload[] = $f;
      continue;
    }

    $val = isset($_POST[$key]) ? trim((string) $_POST[$key]) : '';
    if ($required && $val === '') { $missing[] = $f['label']; continue; }

    // Validasi pilihan untuk select/radio
    if ($val !== '' && in_array($f['tipe'], ['select', 'radio'], true)
        && !empty($f['opsi']) && !in_array($val, $f['opsi'], true)) {
      json_error('Nilai tidak valid untuk: ' . $f['label'], 422);
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

  // 3. Upload file (setelah semua validasi non-file lolos -> hindari file yatim)
  foreach ($toUpload as $f) {
    $key = $f['field_key'];
    $subdir = $key === 'foto_ktp' ? 'ktp' : ($key === 'foto_diri' ? 'foto_diri' : 'custom');
    $up = handle_upload($_FILES[$key], $subdir);
    if (!$up['ok']) {
      json_error($f['label'] . ': ' . $up['error'], 422);
    }
    if ($f['is_builtin'] && $f['kolom_db']) {
      $columns[$f['kolom_db']] = $up['path'];
    } elseif (!$f['is_builtin']) {
      $custom[$key] = ['key' => $key, 'label' => $f['label'], 'tipe' => 'file', 'value' => $up['path']];
    }
  }

  // 4. Kolom dari invitation (bukan bagian form) + data tambahan
  $columns['invitation_id'] = $inv['id'];
  $columns['cabang']        = $inv['cabang'];
  $columns['posisi']        = $inv['posisi'];
  $columns['data_tambahan'] = $custom ? json_encode(array_values($custom), JSON_UNESCAPED_UNICODE) : null;

  // 5. INSERT dinamis + tandai invitation submitted (transaksi)
  $cols = array_keys($columns);
  $placeholders = implode(', ', array_fill(0, count($cols), '?'));
  $sql = 'INSERT INTO karyawan (' . implode(', ', $cols) . ') VALUES (' . $placeholders . ')';

  $db->beginTransaction();

  $stmt = $db->prepare($sql);
  $stmt->execute(array_values($columns));
  $karyawan_id = (int) $db->lastInsertId();

  $upd = $db->prepare("UPDATE onboarding_invitations SET status = 'submitted' WHERE id = ?");
  $upd->execute([$inv['id']]);

  $db->commit();

  json_success(['karyawan_id' => $karyawan_id], 'Data berhasil dikirim.', 201);
} catch (Throwable $e) {
  if (isset($db) && $db->inTransaction()) $db->rollBack();
  json_error('Terjadi kesalahan server.', 500, [$e->getMessage()]);
}
