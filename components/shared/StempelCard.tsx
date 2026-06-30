'use client';

import { useEffect, useRef, useState } from 'react';
import { Stamp, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { ApiError, getStempel, uploadStempel, type StempelInfo } from '@/lib/api';

// Upload stempel/cap perusahaan -> dipakai placeholder {{STEMPEL}} di template kontrak.
export function StempelCard() {
  const [stempel, setStempel] = useState<StempelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getStempel()
      .then(setStempel)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleFile(file: File | null) {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'png' && ext !== 'jpg' && ext !== 'jpeg') {
      toast.error('Stempel harus PNG atau JPG.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadStempel(file);
      // bust cache agar gambar baru langsung tampil
      setStempel({ filename: res.filename, url: `${res.url}?t=${Date.now()}`, uploaded_at: new Date().toISOString() });
      toast.success('Stempel berhasil diperbarui.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengunggah stempel.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-rbn-primary">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-rbn-primary/10 p-2.5 text-rbn-primary">
          <Stamp className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Stempel / Cap Perusahaan</p>
          {loading ? (
            <p className="text-xs text-gray-400">Memuat…</p>
          ) : stempel ? (
            <p className="text-xs text-gray-500">Terpasang. Dipakai pada placeholder {'{{STEMPEL}}'}.</p>
          ) : (
            <p className="text-xs text-gray-400">
              Belum ada. Upload agar muncul di kontrak pada placeholder {'{{STEMPEL}}'}.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {stempel && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={stempel.url}
            alt="Stempel"
            className="h-12 w-12 rounded-lg border border-gray-200 bg-white object-contain p-1"
          />
        )}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {stempel ? 'Ganti Stempel' : 'Upload Stempel'}
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <p className="w-full text-xs text-gray-400">
        Tips: gambar stempel sebaiknya PNG latar transparan. Di template Word, tulis{' '}
        <code className="text-gray-500">{'{{STEMPEL}}'}</code> di atas{' '}
        <code className="text-gray-500">( Dwi Adithya )</code> pada kolom PIHAK PERTAMA.
      </p>
    </Card>
  );
}
