'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Users, Clock, FileText } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { StatCard } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { KontrakExpireBanner } from '@/components/shared/KontrakExpireBanner';
import {
  getDashboardStats,
  getExpiringKontrak,
  listInvitations,
} from '@/lib/api';
import type { DashboardStats, Invitation, Kontrak } from '@/types';
import { formatTanggal } from '@/lib/utils';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiring7, setExpiring7] = useState<Kontrak[]>([]);
  const [expiring30, setExpiring30] = useState<Kontrak[]>([]);
  const [submissions, setSubmissions] = useState<Invitation[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, exp30, invs] = await Promise.all([
        getDashboardStats(),
        getExpiringKontrak(30),
        listInvitations(),
      ]);
      setStats(s);
      setExpiring30(exp30.filter((k) => (k.sisa_hari ?? 0) > 7));
      setExpiring7(exp30.filter((k) => (k.sisa_hari ?? 0) <= 7));
      setSubmissions(invs.filter((i) => i.status !== 'pending').slice(0, 5));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <AdminShell title="Dashboard">
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard
              label="Karyawan Aktif"
              value={stats?.total_karyawan_aktif ?? 0}
              icon={<Users className="h-6 w-6" />}
            />
            <StatCard
              label="Submission Pending Review"
              value={stats?.submission_pending ?? 0}
              icon={<Clock className="h-6 w-6" />}
              accent="text-yellow-600"
            />
            <StatCard
              label="Kontrak Aktif"
              value={stats?.total_kontrak_aktif ?? 0}
              icon={<FileText className="h-6 w-6" />}
              accent="text-green-600"
            />
          </div>

          {/* Banner kontrak */}
          {(expiring7.length > 0 || expiring30.length > 0) && (
            <div className="space-y-3">
              <KontrakExpireBanner kontrak={expiring7} hari={7} variant="danger" />
              <KontrakExpireBanner kontrak={expiring30} hari={30} variant="warning" />
            </div>
          )}

          {/* Submission terbaru */}
          <div>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Submission Onboarding Terbaru
            </h2>
            <Table>
              <THead>
                <TR>
                  <TH>Nama</TH>
                  <TH>Cabang</TH>
                  <TH>Posisi</TH>
                  <TH>Status</TH>
                  <TH>Tanggal</TH>
                </TR>
              </THead>
              <TBody>
                {submissions.length === 0 ? (
                  <EmptyRow colSpan={5}>Belum ada submission.</EmptyRow>
                ) : (
                  submissions.map((s) => (
                    <TR key={s.id}>
                      <TD className="font-medium text-gray-900">
                        {s.karyawan_id ? (
                          <Link href={`/karyawan/${s.karyawan_id}`} className="hover:underline">
                            {s.nama_lengkap ?? '-'}
                          </Link>
                        ) : (
                          s.nama_lengkap ?? '-'
                        )}
                      </TD>
                      <TD>{s.cabang}</TD>
                      <TD>{s.posisi}</TD>
                      <TD>
                        <Badge status={s.status}>{s.status}</Badge>
                      </TD>
                      <TD className="text-gray-500">{formatTanggal(s.created_at)}</TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
