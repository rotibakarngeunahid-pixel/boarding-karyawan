'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Copy, Eye, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/ui/modal';
import { ApiError, deleteInvitation, listInvitations } from '@/lib/api';
import type { Invitation } from '@/types';
import { copyToClipboard, formatTanggalJam } from '@/lib/utils';

function onboardingLink(ref: string) {
  const base =
    process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/onboarding/${ref}`;
}

export default function OnboardingListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Invitation[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<Invitation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listInvitations());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat undangan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleCopy(ref: string) {
    const ok = await copyToClipboard(onboardingLink(ref));
    ok ? toast.success('Link disalin!') : toast.error('Gagal menyalin link.');
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteInvitation(deleteTarget.id);
      toast.success('Undangan onboarding berhasil dihapus.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus undangan.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell
      title="Onboarding"
      action={
        <Link href="/onboarding/buat">
          <Button>
            <Plus className="h-4 w-4" /> Buat Undangan Baru
          </Button>
        </Link>
      }
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Link Tes</TH>
              <TH>Cabang</TH>
              <TH>Posisi</TH>
              <TH>Status</TH>
              <TH>Kedaluwarsa</TH>
              <TH className="text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <EmptyRow colSpan={6}>Belum ada undangan onboarding.</EmptyRow>
            ) : (
              items.map((inv) => {
                const ref = inv.test_slug ?? inv.token;
                const displayRef = inv.test_slug ?? `${inv.token.slice(0, 8)}...`;

                return (
                  <TR key={inv.id}>
                    <TD className="font-mono text-xs text-rbn-primary">/onboarding/{displayRef}</TD>
                    <TD>{inv.cabang}</TD>
                    <TD className="font-medium text-gray-900">{inv.posisi}</TD>
                    <TD>
                      <Badge status={inv.status}>{inv.status}</Badge>
                    </TD>
                    <TD className="text-gray-500">{formatTanggalJam(inv.expires_at)}</TD>
                    <TD>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleCopy(ref)}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          <Copy className="h-3.5 w-3.5" /> Salin Link
                        </button>
                        {inv.karyawan_id && (
                          <Link
                            href={`/karyawan/${inv.karyawan_id}`}
                            className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                          >
                            <Eye className="h-3.5 w-3.5" /> Lihat Submission
                          </Link>
                        )}
                        <button
                          onClick={() => setDeleteTarget(inv)}
                          className="flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
                        </button>
                      </div>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Undangan?"
        message="Undangan onboarding akan dihapus permanen. Jika sudah ada submission, data karyawan, hasil tes, kontrak, dan file upload terkait juga ikut dihapus."
        confirmText="Ya, Hapus"
        loading={deleting}
      />
    </AdminShell>
  );
}
