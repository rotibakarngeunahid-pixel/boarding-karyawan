'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Logo } from '@/components/shared/Logo';
import { LoadingState } from '@/components/ui/spinner';
import { SignaturePad, type SignaturePadHandle } from '@/components/shared/SignaturePad';
import { DocxViewer } from '@/components/shared/DocxViewer';
import { ApiError, getKontrakSignInfo, kontrakSignDocUrl, submitKontrakSign } from '@/lib/api';
import { formatTanggal, formatTanggalJam } from '@/lib/utils';
import type { KontrakSignInfo } from '@/types';

export default function TandaTanganKontrakPage() {
  const params = useParams();
  const token = String(params.token);

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<KontrakSignInfo | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [setuju, setSetuju] = useState(false);
  const [nama, setNama] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const data = await getKontrakSignInfo(token);
      setInfo(data);
      if (data?.nama_lengkap) setNama(data.nama_lengkap);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!setuju) {
      toast.error('Centang persetujuan terlebih dahulu.');
      return;
    }
    if (nama.trim() === '') {
      toast.error('Nama lengkap wajib diisi.');
      return;
    }
    const signature = padRef.current?.toDataURL();
    if (!signature) {
      toast.error('Bubuhkan tanda tangan Anda pada kotak.');
      return;
    }
    setSubmitting(true);
    try {
      await submitKontrakSign(token, { nama_penandatangan: nama.trim(), signature, setuju });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan tanda tangan.');
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingState text="Memuat kontrak…" />
      </div>
    );
  }

  // Link tidak valid / gagal muat
  if (loadError || !info || !info.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            {loadError ? 'Gagal Memuat' : 'Link Tidak Valid'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Link tanda tangan tidak ditemukan. Silakan hubungi admin RBN.
          </p>
          {loadError && (
            <Button className="mt-4" onClick={load}>
              Coba Lagi
            </Button>
          )}
        </div>
      </div>
    );
  }

  const alreadySigned = info.signed || done;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-6 rounded-2xl bg-rbn-primary p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1">
              <Logo className="h-full w-full" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Kontrak Kerja (PKWT)</h1>
              <p className="text-sm text-white/80">Roti Bakar Ngeunah</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-white/80">
              No: <span className="font-medium text-white">{info.nomor_kontrak}</span>
            </span>
            <span className="text-white/80">
              Nama: <span className="font-medium text-white">{info.nama_lengkap}</span>
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-white/80">
              Posisi: <span className="font-medium text-white">{info.posisi}</span> · {info.cabang}
            </span>
            <span className="text-white/80">
              {formatTanggal(info.tanggal_mulai)} — {formatTanggal(info.tanggal_berakhir)}
            </span>
          </div>
        </div>

        {/* Sudah ditandatangani */}
        {alreadySigned ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <CheckCircle2 className="mx-auto h-14 w-14 text-green-500" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Kontrak Telah Ditandatangani</h2>
            <p className="mt-2 text-sm text-gray-500">
              Terima kasih{nama ? `, ${nama}` : ''}. Tanda tangan Anda sudah kami terima
              {info.ditandatangani_at ? ` pada ${formatTanggalJam(info.ditandatangani_at)}` : ''}.
            </p>
            {info.tanda_tangan_url && !done && (
              <div className="mt-5 inline-block rounded-xl border border-gray-200 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={info.tanda_tangan_url} alt="Tanda tangan" className="h-28 object-contain" />
              </div>
            )}
            <p className="mt-6 text-xs text-gray-400">Halaman ini bisa Anda tutup.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
            {/* Isi kontrak yang harus dibaca — tampil apa adanya (format asli) */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Isi Kontrak</p>
              <div className="max-h-[55vh] overflow-y-auto rounded-xl border border-gray-200 bg-gray-50 p-3">
                <DocxViewer
                  url={kontrakSignDocUrl(token)}
                  fallback={
                    <div className="whitespace-pre-wrap p-2 text-sm leading-7 text-gray-900">
                      {info.text}
                    </div>
                  }
                />
              </div>
            </div>

            {/* Persetujuan */}
            <label className="flex cursor-pointer items-start gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={setuju}
                onChange={(e) => setSetuju(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-rbn-primary"
              />
              <span>
                Saya telah membaca, memahami, dan menyetujui seluruh isi kontrak kerja di atas.
              </span>
            </label>

            <div>
              <Label required>Nama Lengkap</Label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama sesuai KTP" />
            </div>

            <div>
              <Label required>Tanda Tangan</Label>
              <SignaturePad ref={padRef} />
            </div>

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              <FileSignature className="h-5 w-5" /> Tanda Tangani Kontrak
            </Button>
            <p className="text-center text-xs text-gray-400">
              Dengan menekan tombol di atas, tanda tangan elektronik Anda dianggap sah.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
