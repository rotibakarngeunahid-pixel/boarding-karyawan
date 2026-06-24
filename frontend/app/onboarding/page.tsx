'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Copy, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { listInvitations } from '@/lib/api';
import type { Invitation } from '@/types';
import { copyToClipboard, formatTanggalJam } from '@/lib/utils';

function onboardingLink(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/onboarding/${token}`;
}

export default function OnboardingListPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Invitation[]>([]);

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

  async function handleCopy(token: string) {
    const ok = await copyToClipboard(onboardingLink(token));
    ok ? toast.success('Link disalin!') : toast.error('Gagal menyalin link.');
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
              <TH>Token</TH>
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
              items.map((inv) => (
                <TR key={inv.id}>
                  <TD className="font-mono text-xs text-gray-500">{inv.token.slice(0, 8)}…</TD>
                  <TD>{inv.cabang}</TD>
                  <TD className="font-medium text-gray-900">{inv.posisi}</TD>
                  <TD>
                    <Badge status={inv.status}>{inv.status}</Badge>
                  </TD>
                  <TD className="text-gray-500">{formatTanggalJam(inv.expires_at)}</TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleCopy(inv.token)}
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
                    </div>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      )}
    </AdminShell>
  );
}
