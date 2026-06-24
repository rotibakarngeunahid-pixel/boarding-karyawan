'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import type { PilihanJawaban, TesSoal } from '@/types';

export interface SoalFormValue {
  pertanyaan: string;
  pilihan_a: string;
  pilihan_b: string;
  pilihan_c: string;
  pilihan_d: string;
  jawaban_benar: PilihanJawaban;
  poin: number;
  urutan: number;
  aktif: number;
}

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
    jawaban_benar: (initial?.jawaban_benar as PilihanJawaban) ?? 'a',
    poin: initial?.poin ?? 10,
    urutan: initial?.urutan ?? 0,
    aktif: initial?.aktif ?? 1,
  });

  const set = <K extends keyof SoalFormValue>(key: K, val: SoalFormValue[K]) =>
    setV((p) => ({ ...p, [key]: val }));

  const opsi: { key: PilihanJawaban; field: keyof SoalFormValue }[] = [
    { key: 'a', field: 'pilihan_a' },
    { key: 'b', field: 'pilihan_b' },
    { key: 'c', field: 'pilihan_c' },
    { key: 'd', field: 'pilihan_d' },
  ];

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
