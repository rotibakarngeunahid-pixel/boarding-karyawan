'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, Download } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { TemplateKontrakCard } from '@/components/shared/TemplateKontrakCard';
import { listKontrak } from '@/lib/api';
import { CABANG_LIST, type Kontrak } from '@/types';
import { exportToCSV, formatTanggal, cn } from '@/lib/utils';

function rowClass(k: Kontrak) {
  if (k.status !== 'aktif') return '';
  const sisa = k.sisa_hari ?? 999;
  if (sisa <= 7) return 'bg-red-50';
  if (sisa <= 30) return 'bg-yellow-50';
  return '';
}

export default function KontrakPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Kontrak[]>([]);
  const [status, setStatus] = useState('');
  const [cabang, setCabang] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listKontrak({ status, cabang }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kontrak.');
    } finally {
      setLoading(false);
    }
  }, [status, cabang]);

  useEffect(() => {
    load();
  }, [load]);

  function handleExport() {
    exportToCSV(
      `kontrak-${new Date().toISOString().slice(0, 10)}.csv`,
      items.map((k) => ({
        NomorKontrak: k.nomor_kontrak,
        Nama: k.nama_lengkap ?? '',
        Cabang: k.cabang,
        Posisi: k.posisi,
        TanggalMulai: k.tanggal_mulai,
        TanggalBerakhir: k.tanggal_berakhir,
        SisaHari: k.sisa_hari ?? '',
        Status: k.status,
      })),
    );
  }

  return (
    <AdminShell
      title="Kontrak"
      action={
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={!items.length}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Link href="/kontrak/buat">
            <Button>
              <Plus className="h-4 w-4" /> Buat Kontrak
            </Button>
          </Link>
        </div>
      }
    >
      {/* REVISI 3 — kelola template surat kontrak */}
      <div className="mb-4">
        <TemplateKontrakCard />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="aktif">Aktif</option>
          <option value="berakhir">Berakhir</option>
          <option value="diperbarui">Diperbarui</option>
          <option value="dibatalkan">Dibatalkan</option>
        </Select>
        <Select value={cabang} onChange={(e) => setCabang(e.target.value)}>
          <option value="">Semua Cabang</option>
          {CABANG_LIST.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
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
              <TH>Nomor Kontrak</TH>
              <TH>Karyawan</TH>
              <TH>Cabang</TH>
              <TH>Posisi</TH>
              <TH>Mulai</TH>
              <TH>Berakhir</TH>
              <TH>Sisa Hari</TH>
              <TH>TTD</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {items.length === 0 ? (
              <EmptyRow colSpan={9}>Belum ada kontrak.</EmptyRow>
            ) : (
              items.map((k) => {
                const sisa = k.sisa_hari ?? null;
                return (
                  <TR
                    key={k.id}
                    className={cn('cursor-pointer hover:bg-gray-50', rowClass(k))}
                    onClick={() => router.push(`/kontrak/${k.id}`)}
                  >
                    <TD className="font-mono text-xs font-medium text-gray-900">{k.nomor_kontrak}</TD>
                    <TD>{k.nama_lengkap ?? '-'}</TD>
                    <TD>{k.cabang}</TD>
                    <TD>{k.posisi}</TD>
                    <TD className="text-gray-500">{formatTanggal(k.tanggal_mulai)}</TD>
                    <TD className="text-gray-500">{formatTanggal(k.tanggal_berakhir)}</TD>
                    <TD>
                      {k.status === 'aktif' && sisa !== null ? (
                        <span
                          className={cn(
                            'font-medium',
                            sisa <= 7 ? 'text-red-600' : sisa <= 30 ? 'text-yellow-700' : 'text-gray-600',
                          )}
                        >
                          {sisa < 0 ? `Lewat ${Math.abs(sisa)}h` : `${sisa} hari`}
                        </span>
                      ) : (
                        '-'
                      )}
                    </TD>
                    <TD>
                      {k.tanda_tangan_path ? (
                        <Badge status="approved">Sudah</Badge>
                      ) : (
                        <Badge status="pending">Belum</Badge>
                      )}
                    </TD>
                    <TD>
                      <Badge status={k.status}>{k.status}</Badge>
                    </TD>
                  </TR>
                );
              })
            )}
          </TBody>
        </Table>
      )}
    </AdminShell>
  );
}
