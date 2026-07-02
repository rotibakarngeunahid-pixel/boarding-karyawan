'use client';

import { Input, Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { DatePickerStepwise } from '@/components/shared/DatePickerStepwise';
import { FileUploadPreview } from '@/components/shared/FileUploadPreview';
import { PROVINSI_LIST } from '@/lib/utils';
import type { FormField } from '@/types';

/** Render satu field form onboarding (dinamis). Dipakai form publik & input manual admin. */
export function DynamicField({
  field: f,
  required,
  value,
  onValue,
  onFile,
}: {
  field: FormField;
  required: boolean;
  value: string;
  onValue: (v: string) => void;
  onFile: (file: File | null) => void;
}) {
  // File: komponen sendiri sudah punya label
  if (f.tipe === 'file') {
    return (
      <div>
        <FileUploadPreview label={f.label} onChange={onFile} required={required} />
        {f.bantuan && <p className="mt-1 text-xs text-gray-400">{f.bantuan}</p>}
      </div>
    );
  }

  const opsi = f.field_key === 'provinsi_lahir' && f.opsi.length === 0 ? PROVINSI_LIST : f.opsi;

  return (
    <div>
      <Label required={required}>{f.label}</Label>

      {f.tipe === 'textarea' ? (
        <Textarea
          rows={2}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder={f.placeholder ?? ''}
        />
      ) : f.tipe === 'select' ? (
        <Select value={value} onChange={(e) => onValue(e.target.value)}>
          <option value="">— Pilih —</option>
          {opsi.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      ) : f.tipe === 'radio' ? (
        <div className="space-y-2">
          {f.opsi.map((o) => (
            // Kartu ber-border selebar layar: target sentuh besar & jelas di HP.
            <label
              key={o}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-base transition-colors sm:text-sm ${
                value === o
                  ? 'border-rbn-primary bg-rbn-primary/5'
                  : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={f.field_key}
                checked={value === o}
                onChange={() => onValue(o)}
                className="h-4 w-4 shrink-0 accent-rbn-primary"
              />
              {o}
            </label>
          ))}
        </div>
      ) : f.tipe === 'date' ? (
        // Input tanggal bertahap: Tahun → Bulan → Tanggal (output tetap ISO YYYY-MM-DD).
        <DatePickerStepwise
          value={value}
          onChange={onValue}
          minYear={1950}
          maxYear={f.field_key === 'tanggal_lahir' ? 2010 : new Date().getFullYear() + 10}
        />
      ) : f.tipe === 'number' ? (
        // type="text"+inputMode="numeric": type="number" native TIDAK benar2
        // memblokir huruf di semua browser/HP (mis. "e", "-", tempel teks).
        // Filter aktif di onChange -> hanya digit 0-9 yang bisa masuk.
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(e) => onValue(e.target.value.replace(/[^0-9]/g, ''))}
          placeholder={f.placeholder ?? ''}
        />
      ) : (
        <Input
          type={f.tipe === 'tel' ? 'tel' : 'text'}
          inputMode={f.tipe === 'tel' ? 'tel' : undefined}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder={f.placeholder ?? ''}
        />
      )}

      {f.bantuan && f.tipe !== 'radio' && <p className="mt-1 text-xs text-gray-400">{f.bantuan}</p>}
    </div>
  );
}
