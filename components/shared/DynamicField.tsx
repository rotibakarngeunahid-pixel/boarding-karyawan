'use client';

import { Input, Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
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
            <label key={o} className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="radio"
                name={f.field_key}
                checked={value === o}
                onChange={() => onValue(o)}
                className="h-4 w-4 accent-rbn-primary"
              />
              {o}
            </label>
          ))}
        </div>
      ) : (
        <Input
          type={
            f.tipe === 'number'
              ? 'number'
              : f.tipe === 'tel'
                ? 'tel'
                : f.tipe === 'date'
                  ? 'date'
                  : 'text'
          }
          inputMode={f.tipe === 'tel' ? 'tel' : f.tipe === 'number' ? 'numeric' : undefined}
          value={value}
          onChange={(e) => onValue(e.target.value)}
          placeholder={f.placeholder ?? ''}
        />
      )}

      {f.bantuan && f.tipe !== 'radio' && <p className="mt-1 text-xs text-gray-400">{f.bantuan}</p>}
    </div>
  );
}
