'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, THead, TBody, TR, TH, TD, EmptyRow } from '@/components/ui/table';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { getHasilTes } from '@/lib/api';
import { CABANG_LIST, type HasilTes } from '@/types';
import { exportToCSV, formatTanggalJam } from '@/lib/utils';

export default function HasilTesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<HasilTes[]>([]);
  const [cabang, setCabang] = useState('');
  const [lulus, setLulus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await getHasilTes());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat hasil tes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () =>
      items.filter((h) => {
        if (cabang && h.cabang !== cabang) return false;
        if (lulus === 'lulus' && !Number(h.lulus)) return false;
        if (lulus === 'tidak' && Number(h.lulus)) return false;
        return true;
      }),
    [items, cabang, lulus],
  );

  function handleExport() {
    exportToCSV(
      `hasil-tes-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((h) => ({
        Nama: h.nama_lengkap ?? '',
        Cabang: h.cabang ?? '',
        Tanggal: h.dikerjakan_at ?? '',
        TotalSoal: h.total_soal,
        TotalBenar: h.total_benar,
        Skor: h.skor_persen,
        Status: Number(h.lulus) ? 'Lulus' : 'Tidak Lulus',
      })),
    );
  }

  return (
    <AdminShell
      title="Hasil Tes"
      action={
        <Button variant="outline" onClick={handleExport} disabled={!filtered.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Select value={cabang} onChange={(e) => setCabang(e.target.value)}>
          <option value="">Semua Cabang</option>
          {CABANG_LIST.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select value={lulus} onChange={(e) => setLulus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="lulus">Lulus</option>
          <option value="tidak">Tidak Lulus</option>
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
              <TH>Nama Karyawan</TH>
              <TH>Cabang</TH>
              <TH>Tanggal</TH>
              <TH>Total Soal</TH>
              <TH>Total Benar</TH>
              <TH>Skor %</TH>
              <TH>Status</TH>
            </TR>
          </THead>
          <TBody>
            {filtered.length === 0 ? (
              <EmptyRow colSpan={7}>Belum ada hasil tes.</EmptyRow>
            ) : (
              filtered.map((h, i) => (
                <TR key={h.id ?? i}>
                  <TD className="font-medium text-gray-900">{h.nama_lengkap}</TD>
                  <TD>{h.cabang}</TD>
                  <TD className="text-gray-500">{formatTanggalJam(h.dikerjakan_at)}</TD>
                  <TD>{h.total_soal}</TD>
                  <TD>{h.total_benar}</TD>
                  <TD className="font-semibold">{h.skor_persen}%</TD>
                  <TD>
                    <Badge status={Number(h.lulus) ? 'approved' : 'rejected'}>
                      {Number(h.lulus) ? 'Lulus' : 'Tidak Lulus'}
                    </Badge>
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
