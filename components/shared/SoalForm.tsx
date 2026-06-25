'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { uploadSoalGambar } from '@/lib/api';
import type { PilihanJawaban, TesSoal } from '@/types';

export interface SoalFormValue {
  pertanyaan: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  question_image: string | null; // REVISI 4 — path gambar relatif
  jawaban_benar: PilihanJawaban;
  poin: number;
  urutan: number;
  aktif: number;
}

const ACCEPT = ['image/jpeg', 'image/png', 'image/webp'];
const MAX = 2 * 1024 * 1024; // 2MB

export function SoalForm({
  initial,
  onSubmit,
  submitting,
  submitLabel = 'Simpan',
}: {
  initial?: Partial<TesSoal>;
  onSubmit: (value: SoalFormValue) => void;
  submitting?: boolean;
  submitLabel?: string;
}) {
  const [v, setV] = useState<SoalFormValue>({
    pertanyaan: initial?.pertanyaan ?? '',
    pilihan_a: initial?.pilihan_a ?? '',
    pilihan_b: initial?.pilihan_b ?? '',
    pilihan_c: initial?.pilihan_c ?? '',
    pilihan_d: initial?.pilihan_d ?? '',
    question_image: initial?.question_image ?? null,
    jawaban_benar: (initial?.jawaban_benar as PilihanJawaban) ?? 'a',
    poin: initial?.poin ?? 10,
    urutan: initial?.urutan ?? 0,
    aktif: initial?.aktif ?? 1,
  });

  // Preview gambar: dari data awal (url penuh) atau hasil upload baru.
  const [imgPreview, setImgPreview] = useState<string | null>(initial?.question_image_url ?? null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof SoalFormValue>(key: K, val: SoalFormValue[K]) =>
    setV((p) => ({ ...p, [key]: val }));

  const opsi: { key: PilihanJawaban; field: keyof SoalFormValue }[] = [
    { key: 'a', field: 'pilihan_a' },
    { key: 'b', field: 'pilihan_b' },
    { key: 'c', field: 'pilihan_c' },
    { key: 'd', field: 'pilihan_d' },
  ];

  async function handleImage(file: File | null) {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) {
      toast.error('Gambar harus JPG, PNG, atau WEBP.');
      return;
    }
    if (file.size > MAX) {
      toast.error('Ukuran gambar maksimal 2MB.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadSoalGambar(file);
      set('question_image', res.path);
      setImgPreview(res.url);
      toast.success('Gambar terlampir.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengunggah gambar.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function removeImage() {
    set('question_image', null);
    setImgPreview(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit(v);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label required>Pertanyaan</Label>
        <Textarea
          rows={3}
          value={v.pertanyaan}
          onChange={(e) => set('pertanyaan', e.target.value)}
          required
        />
      </div>

      {/* REVISI 4 — gambar opsional per soal */}
      <div>
        <Label>Gambar Soal (opsional)</Label>
        {imgPreview ? (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imgPreview}
              alt="Gambar soal"
              className="max-h-48 rounded-lg border border-gray-200 object-contain"
            />
            <button
              type="button"
              onClick={removeImage}
              className="absolute -right-2 -top-2 rounded-full bg-red-600 p-1 text-white shadow"
              title="Hapus gambar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 hover:border-rbn-primary hover:text-rbn-primary disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            {uploading ? 'Mengunggah…' : 'Lampirkan Gambar'}
          </button>
        )}
        <p className="mt-1 text-xs text-gray-400">JPG / PNG / WEBP, maks 2MB.</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => handleImage(e.target.files?.[0] ?? null)}
        />
      </div>

      <div className="space-y-3">
        {opsi.map(({ key, field }) => (
          <div key={key}>
            <Label required>
              Pilihan {key.toUpperCase()}
              {v.jawaban_benar === key && (
                <span className="ml-2 text-xs font-normal text-green-600">(jawaban benar)</span>
              )}
            </Label>
            <div className="flex items-center gap-2">
              <input
                type="radio"
                name="benar"
                checked={v.jawaban_benar === key}
                onChange={() => set('jawaban_benar', key)}
                className="h-4 w-4 accent-rbn-primary"
                title="Tandai sebagai jawaban benar"
              />
              <Input
                value={v[field] as string}
                onChange={(e) => set(field, e.target.value as never)}
                required
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Poin</Label>
          <Input
            type="number"
            min={1}
            value={v.poin}
            onChange={(e) => set('poin', Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Urutan</Label>
          <Input
            type="number"
            min={0}
            value={v.urutan}
            onChange={(e) => set('urutan', Number(e.target.value))}
          />
        </div>
        <div>
          <Label>Status</Label>
          <label className="flex h-10 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={v.aktif === 1}
              onChange={(e) => set('aktif', e.target.checked ? 1 : 0)}
              className="h-4 w-4 accent-rbn-primary"
            />
            {v.aktif === 1 ? 'Aktif' : 'Nonaktif'}
          </label>
        </div>
      </div>

      <Button type="submit" loading={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
