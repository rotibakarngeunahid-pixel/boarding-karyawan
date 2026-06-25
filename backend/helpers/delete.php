<?php
// Helper hard delete untuk entitas yang punya relasi antar tabel.

require_once __DIR__ . '/upload.php';

function sql_placeholders(array $items): string {
  return implode(',', array_fill(0, count($items), '?'));
}

/**
 * Hapus kontrak dan putuskan relasi kontrak penerus agar FK tidak menahan delete.
 */
function hard_delete_kontrak(PDO $db, int $id): bool {
  $stmt = $db->prepare('SELECT id FROM kontrak WHERE id = ? LIMIT 1');
  $stmt->execute([$id]);
  if (!$stmt->fetch()) return false;

  $stmt = $db->prepare('UPDATE kontrak SET kontrak_sebelumnya_id = NULL WHERE kontrak_sebelumnya_id = ?');
  $stmt->execute([$id]);

  $stmt = $db->prepare('DELETE FROM kontrak WHERE id = ?');
  $stmt->execute([$id]);

  return $stmt->rowCount() > 0;
}

/**
 * Hapus karyawan beserta hasil tes, kontrak, invitation opsional, dan kembalikan path file yang perlu dihapus.
 *
 * @return array{deleted: bool, files: array<int, string>}
 */
function hard_delete_karyawan(PDO $db, int $id, bool $deleteInvitation = true): array {
  $stmt = $db->prepare('SELECT id, invitation_id, foto_ktp_path, foto_diri_path FROM karyawan WHERE id = ? LIMIT 1');
  $stmt->execute([$id]);
  $karyawan = $stmt->fetch();
  if (!$karyawan) {
    return ['deleted' => false, 'files' => []];
  }

  $files = [];
  if (!empty($karyawan['foto_ktp_path'])) $files[] = $karyawan['foto_ktp_path'];
  if (!empty($karyawan['foto_diri_path'])) $files[] = $karyawan['foto_diri_path'];

  $stmt = $db->prepare('DELETE FROM tes_hasil WHERE karyawan_id = ?');
  $stmt->execute([$id]);

  $stmt = $db->prepare('SELECT id FROM kontrak WHERE karyawan_id = ?');
  $stmt->execute([$id]);
  $contractIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));
  if ($contractIds) {
    $in = sql_placeholders($contractIds);
    $stmt = $db->prepare("UPDATE kontrak SET kontrak_sebelumnya_id = NULL WHERE kontrak_sebelumnya_id IN ($in)");
    $stmt->execute($contractIds);

    $stmt = $db->prepare('DELETE FROM kontrak WHERE karyawan_id = ?');
    $stmt->execute([$id]);
  }

  $stmt = $db->prepare('DELETE FROM karyawan WHERE id = ?');
  $stmt->execute([$id]);

  if ($deleteInvitation && !empty($karyawan['invitation_id'])) {
    $stmt = $db->prepare('DELETE FROM onboarding_invitations WHERE id = ?');
    $stmt->execute([(int) $karyawan['invitation_id']]);
  }

  return ['deleted' => true, 'files' => $files];
}

/**
 * Hapus invitation onboarding. Jika sudah punya submission, data karyawan terkait ikut dihapus.
 *
 * @return array{deleted: bool, files: array<int, string>}
 */
function hard_delete_invitation(PDO $db, int $id): array {
  $stmt = $db->prepare('SELECT id FROM onboarding_invitations WHERE id = ? LIMIT 1');
  $stmt->execute([$id]);
  if (!$stmt->fetch()) {
    return ['deleted' => false, 'files' => []];
  }

  $stmt = $db->prepare('SELECT id FROM karyawan WHERE invitation_id = ?');
  $stmt->execute([$id]);
  $karyawanIds = array_map('intval', $stmt->fetchAll(PDO::FETCH_COLUMN));

  $files = [];
  foreach ($karyawanIds as $karyawanId) {
    $res = hard_delete_karyawan($db, $karyawanId, false);
    $files = array_merge($files, $res['files']);
  }

  $stmt = $db->prepare('DELETE FROM onboarding_invitations WHERE id = ?');
  $stmt->execute([$id]);

  return ['deleted' => true, 'files' => $files];
}
