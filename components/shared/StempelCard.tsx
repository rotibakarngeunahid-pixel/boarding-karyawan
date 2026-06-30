'use client';

import { useEffect, useRef, useState } from 'react';
import { Stamp, Upload, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ApiError,
  getStempel,
  saveStempelSettings,
  uploadStempel,
  type StempelInfo,
} from '@/lib/api';

// Upload + atur posisi stempel/cap perusahaan -> placeholder {{STEMPEL}}.
export function StempelCard() {
  const [info, setInfo] = useState<StempelInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Kontrol posisi/ukuran
  const [width, setWidth] = useState('120');
  const [offy, setOffy] = useState('0');
  const [offx, setOffx] = useState('0');

  function applyInfo(i: StempelInfo) {
    setInfo(i);
    setWidth(String(i.settings.width));
    setOffx(String(i.settings.offx));
    setOffy(String(i.settings.offy));
  }

  useEffect(() => {
    getStempel()
      .then((i) => applyInfo(i))
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
      setInfo((prev) => ({
        has_stempel: true,
        url: `${res.url}?t=${Date.now()}`,
        filename: res.filename,
        uploaded_at: new Date().toISOString(),
        settings: prev?.settings ?? { width: Number(width), offx: Number(offx), offy: Number(offy) },
      }));
      toast.success('Stempel berhasil diunggah.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengunggah stempel.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const s = await saveStempelSettings({
        width: Number(width) || 120,
        offx: Number(offx) || 0,
        offy: Number(offy) || 0,
      });
      setWidth(String(s.width));
      setOffx(String(s.offx));
      setOffy(String(s.offy));
      toast.success('Pengaturan disimpan. Buka Preview untuk melihat hasilnya.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan pengaturan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-l-4 border-l-rbn-primary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-rbn-primary/10 p-2.5 text-rbn-primary">
            <Stamp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Stempel / Cap Perusahaan</p>
            {loading ? (
              <p className="text-xs text-gray-400">Memuat…</p>
            ) : info?.has_stempel ? (
              <p className="text-xs text-gray-500">Terpasang. Dipakai pada placeholder {'{{STEMPEL}}'}.</p>
            ) : (
              <p className="text-xs text-gray-400">
                Belum ada. Upload agar muncul di placeholder {'{{STEMPEL}}'}.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {info?.has_stempel && info.url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={info.url}
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
            {info?.has_stempel ? 'Ganti Stempel' : 'Upload Stempel'}
          </button>
        </div>
      </div>

      {/* Kontrol posisi & ukuran */}
      {info?.has_stempel && (
        <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="mb-3 text-xs font-semibold uppercase text-gray-400">Atur Posisi Stempel</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <Label>Ukuran (px)</Label>
              <Input type="number" min={40} max={400} value={width} onChange={(e) => setWidth(e.target.value)} />
            </div>
            <div>
              <Label>Geser bawah (px)</Label>
              <Input type="number" value={offy} onChange={(e) => setOffy(e.target.value)} placeholder="+ bawah / - atas" />
            </div>
            <div>
              <Label>Geser kanan (px)</Label>
              <Input type="number" value={offx} onChange={(e) => setOffx(e.target.value)} placeholder="+ kanan / - kiri" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-gray-400">
              0 = rapi di tempat placeholder. Geser bawah +30 s/d +60 untuk menumpuk nama.
            </p>
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Save className="h-4 w-4" /> Simpan Posisi
            </Button>
          </div>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <p className="mt-3 text-xs text-gray-400">
        Tips: stempel PNG latar transparan paling bagus. Di template Word, tulis{' '}
        <code className="text-gray-500">{'{{STEMPEL}}'}</code> di baris tepat di atas{' '}
        <code className="text-gray-500">( Dwi Adithya )</code>. Setelah ubah posisi, klik{' '}
        <span className="font-medium">Simpan Posisi</span> lalu cek lewat tombol{' '}
        <span className="font-medium">Preview</span>.
      </p>
    </Card>
  );
}
