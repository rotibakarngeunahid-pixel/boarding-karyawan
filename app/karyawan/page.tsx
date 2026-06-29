'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, Download, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/ui/modal';
import { ApiError, deleteKaryawan, listKaryawan } from '@/lib/api';
import { type Karyawan } from '@/types';
import { useCabangOptions } from '@/lib/useCabang';
import { exportToCSV, formatTanggal } from '@/lib/utils';

function StatusTesBadge({ k }: { k: Karyawan }) {
  if (k.total_percobaan_tes === 0) return <Badge>Belum Tes</Badge>;
  return k.lulus_tes ? (
    <Badge status="approved">Lulus</Badge>
  ) : (
    <Badge status="rejected">Tidak Lulus</Badge>
  );
}

export default function KaryawanPage() {
  const router = useRouter();
  const cabangOptions = useCabangOptions();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Karyawan[]>([]);

  const [search, setSearch] = useState('');
  const [cabang, setCabang] = useState('');
  const [status, setStatus] = useState('');
  const [statusTes, setStatusTes] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Karyawan | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listKaryawan({ search, cabang, status, status_tes: statusTes }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat karyawan.');
    } finally {
      setLoading(false);
    }
  }, [search, cabang, status, statusTes]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  function handleExport() {
    exportToCSV(
      `karyawan-${new Date().toISOString().slice(0, 10)}.csv`,
      items.map((k) => ({
        Nama: k.nama_lengkap,
        Panggilan: k.nama_panggilan ?? '',
        Cabang: k.cabang,
        Posisi: k.posisi ?? '',
        WhatsApp: k.no_whatsapp,
        TanggalBergabung: k.tanggal_bergabung ?? '',
        StatusTes: k.total_percobaan_tes === 0 ? 'Belum' : k.lulus_tes ? 'Lulus' : 'Tidak Lulus',
        SkorTes: k.skor_tes,
        Status: k.status,
      })),
    );
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteKaryawan(deleteTarget.id);
      toast.success('Karyawan berhasil dihapus.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus karyawan.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell
      title="Karyawan"
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!items.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Link href="/karyawan/tambah">
            <Button>
              <Plus className="h-4 w-4" /> Tambah Karyawan
            </Button>
          </Link>
        </div>
      }
    >
      {/* Filter */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Cari nama / No. WA…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={cabang} onChange={(e) => setCabang(e.target.value)}>
          <option value="">Semua Cabang</option>
          {cabangOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="nonaktif">Nonaktif</option>
          <option value="resigned">Resigned</option>
        </Select>
        <Select value={statusTes} onChange={(e) => setStatusTes(e.target.value)}>
          <option value="">Semua Status Tes</option>
          <option value="lulus">Lulus</option>
          <option value="tidak">Tidak Lulus</option>
          <option value="belum">Belum Tes</option>
        </Select>
      </div>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Nama</TH>
              <TH>Panggilan</TH>
              <TH>Cabang</TH>
              <TH>Posisi</TH>
              <TH>Bergabung</TH>
              <TH>Status Tes</TH>
              <TH>Status</TH>
              <TH className="text-right">Aksi</TH>
            </TR>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <EmptyRow colSpan={8}>Tidak ada karyawan.</EmptyRow>
            ) : (
              items.map((k) => (
                <TR
                  key={k.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/karyawan/${k.id}`)}
                >
                  <TD className="font-medium text-gray-900">{k.nama_lengkap}</TD>
                  <TD>{k.nama_panggilan ?? '-'}</TD>
                  <TD>{k.cabang}</TD>
                  <TD>{k.posisi ?? '-'}</TD>
                  <TD className="text-gray-500">{formatTanggal(k.tanggal_bergabung)}</TD>
                  <TD>
                    <StatusTesBadge k={k} />
                  </TD>
                  <TD>
                    <Badge status={k.status}>{k.status}</Badge>
                  </TD>
                  <TD className="text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(k);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-200 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Hapus
                    </button>
                  </TD>
                </TR>
              ))
            )}
          </TBody>
        </Table>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Karyawan?"
        message={`Karyawan${deleteTarget ? ` ${deleteTarget.nama_lengkap}` : ''} akan dihapus permanen beserta hasil tes, kontrak, invitation onboarding, dan file upload terkait.`}
        confirmText="Ya, Hapus"
        loading={deleting}
      />
    </AdminShell>
  );
}
