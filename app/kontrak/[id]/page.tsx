'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, FileText, FileDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { ApiError, downloadKontrakDoc, getKontrakDetail, perpanjangKontrak } from '@/lib/api';
import type { Kontrak, KontrakDetailResponse } from '@/types';
import { formatTanggal, formatRupiah, sisaHari, cn } from '@/lib/utils';

export default function KontrakDetailPage() {
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<KontrakDetailResponse | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [tglMulai, setTglMulai] = useState('');
  const [tglBerakhir, setTglBerakhir] = useState('');
  const [gaji, setGaji] = useState('');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [downloading, setDownloading] = useState(false); // REVISI 3

  // REVISI 3 — unduh surat kontrak dari template
  async function handleDownloadDoc() {
    if (!data) return;
    setDownloading(true);
    try {
      await downloadKontrakDoc(data.kontrak.id, data.kontrak.nomor_kontrak);
      toast.success('Surat kontrak diunduh.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengunduh surat kontrak.');
    } finally {
      setDownloading(false);
    }
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getKontrakDetail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat kontrak.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handlePerpanjang(e: React.FormEvent) {
    e.preventDefault();
    if (!tglMulai || !tglBerakhir) {
      toast.error('Tanggal mulai & berakhir wajib diisi.');
      return;
    }
    if (new Date(tglBerakhir) <= new Date(tglMulai)) {
      toast.error('Tanggal berakhir harus setelah tanggal mulai.');
      return;
    }
    setSubmitting(true);
    try {
      await perpanjangKontrak({
        kontrak_id: id,
        tanggal_mulai_baru: tglMulai,
        tanggal_berakhir_baru: tglBerakhir,
        gaji_pokok: gaji ? Number(gaji) : undefined,
        catatan: catatan || undefined,
      });
      toast.success('Kontrak berhasil diperpanjang.');
      setModalOpen(false);
      setTglMulai('');
      setTglBerakhir('');
      setGaji('');
      setCatatan('');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memperpanjang.');
    } finally {
      setSubmitting(false);
    }
  }

  const k = data?.kontrak;
  const sisa = k?.status === 'aktif' ? sisaHari(k.tanggal_berakhir) : null;

  return (
    <AdminShell
      title="Detail Kontrak"
      action={
        <Link href="/kontrak">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
      }
    >
      {loading ? (
        <LoadingState />
      ) : error || !k ? (
        <ErrorState text={error ?? 'Kontrak tidak ditemukan.'} onRetry={load} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Kolom utama */}
          <div className="space-y-5 lg:col-span-2">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-lg font-bold text-gray-900">{k.nomor_kontrak}</p>
                  <p className="text-sm text-gray-500">
                    {k.posisi} · {k.cabang}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge status={k.status}>{k.status}</Badge>
                  <Button size="sm" variant="outline" onClick={handleDownloadDoc} loading={downloading}>
                    <FileDown className="h-4 w-4" /> Surat Kontrak
                  </Button>
                  {k.status === 'aktif' && (
                    <Button size="sm" onClick={() => setModalOpen(true)}>
                      <RefreshCw className="h-4 w-4" /> Perpanjang
                    </Button>
                  )}
                </div>
              </div>

              <dl className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Tanggal Mulai" value={formatTanggal(k.tanggal_mulai)} />
                <Field label="Tanggal Berakhir" value={formatTanggal(k.tanggal_berakhir)} />
                <Field label="Gaji Pokok" value={formatRupiah(k.gaji_pokok)} />
                <div>
                  <dt className="text-xs font-medium uppercase text-gray-400">Sisa Masa Kontrak</dt>
                  <dd
                    className={cn(
                      'mt-0.5 text-sm font-semibold',
                      sisa === null
                        ? 'text-gray-500'
                        : sisa <= 7
                          ? 'text-red-600'
                          : sisa <= 30
                            ? 'text-yellow-700'
                            : 'text-gray-900',
                    )}
                  >
                    {sisa === null
                      ? '—'
                      : sisa < 0
                        ? `Lewat ${Math.abs(sisa)} hari`
                        : `${sisa} hari lagi`}
                  </dd>
                </div>
                {k.catatan && (
                  <div className="sm:col-span-2">
                    <dt className="text-xs font-medium uppercase text-gray-400">Catatan</dt>
                    <dd className="mt-0.5 text-sm text-gray-900">{k.catatan}</dd>
                  </div>
                )}
              </dl>
            </Card>

            {/* Timeline chain */}
            {(data!.chain_sebelum.length > 0 || data!.penerus.length > 0) && (
              <Card>
                <h3 className="mb-4 text-base font-semibold text-gray-900">Riwayat Perpanjangan</h3>
                <ol className="relative space-y-4 border-l-2 border-gray-100 pl-5">
                  {data!.chain_sebelum.map((c) => (
                    <TimelineItem key={c.id} k={c} />
                  ))}
                  <TimelineItem k={k} current />
                  {data!.penerus.map((c) => (
                    <TimelineItem key={c.id} k={c} />
                  ))}
                </ol>
              </Card>
            )}
          </div>

          {/* Sidebar info karyawan */}
          <div>
            <Card>
              <h3 className="text-base font-semibold text-gray-900">Karyawan</h3>
              <div className="mt-3 space-y-3 text-sm">
                <Field label="Nama" value={k.nama_lengkap} />
                <Field label="Panggilan" value={k.nama_panggilan} />
                <Field label="No. WhatsApp" value={k.no_whatsapp} />
                <Link
                  href={`/karyawan/${k.karyawan_id}`}
                  className="inline-flex items-center gap-1 text-sm font-medium text-rbn-primary-dark hover:underline"
                >
                  <FileText className="h-4 w-4" /> Lihat profil karyawan
                </Link>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Modal Perpanjang */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Perpanjang Kontrak">
        <form onSubmit={handlePerpanjang} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>Tanggal Mulai Baru</Label>
              <Input type="date" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} />
            </div>
            <div>
              <Label required>Tanggal Berakhir Baru</Label>
              <Input
                type="date"
                value={tglBerakhir}
                onChange={(e) => setTglBerakhir(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Gaji Pokok Baru (opsional)</Label>
            <Input
              type="number"
              min={0}
              value={gaji}
              onChange={(e) => setGaji(e.target.value)}
              placeholder={k?.gaji_pokok ? `Saat ini: ${k.gaji_pokok}` : 'mis. 2700000'}
            />
          </div>
          <div>
            <Label>Catatan (opsional)</Label>
            <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={submitting}>
              Perpanjang
            </Button>
          </div>
        </form>
      </Modal>
    </AdminShell>
  );
}

function TimelineItem({ k, current }: { k: Kontrak; current?: boolean }) {
  return (
    <li className="relative">
      <span
        className={cn(
          'absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white',
          current ? 'bg-rbn-primary' : 'bg-gray-300',
        )}
      />
      <div className="flex flex-wrap items-center gap-2">
        {current ? (
          <span className="font-mono text-sm font-semibold text-gray-900">{k.nomor_kontrak}</span>
        ) : (
          <Link
            href={`/kontrak/${k.id}`}
            className="font-mono text-sm font-medium text-rbn-primary-dark hover:underline"
          >
            {k.nomor_kontrak}
          </Link>
        )}
        <Badge status={k.status}>{k.status}</Badge>
        {current && <span className="text-xs text-gray-400">(kontrak ini)</span>}
      </div>
      <p className="text-xs text-gray-500">
        {formatTanggal(k.tanggal_mulai)} — {formatTanggal(k.tanggal_berakhir)}
      </p>
    </li>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
}
