'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  ApiError,
  createFormField,
  updateFormField,
  type FormFieldPayload,
} from '@/lib/api';
import type { FieldCondition, FieldTipe, FormField } from '@/types';

const TIPE_LABEL: Record<FieldTipe, string> = {
  text: 'Teks singkat',
  textarea: 'Teks panjang',
  number: 'Angka',
  tel: 'No. telepon',
  date: 'Tanggal',
  select: 'Dropdown',
  radio: 'Pilihan (radio)',
  file: 'Upload gambar',
};

type CondState = { enabled: boolean; field: string; op: '=' | '!='; value: string };

const emptyCond: CondState = { enabled: false, field: '', op: '=', value: '' };

function fromCond(c: FieldCondition | null | undefined): CondState {
  return c ? { enabled: true, field: c.field, op: c.op, value: c.value } : { ...emptyCond };
}

function toCond(c: CondState): FieldCondition | null {
  return c.enabled && c.field ? { field: c.field, op: c.op, value: c.value } : null;
}

export function FormFieldEditor({
  open,
  onClose,
  field,
  allFields,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  field: FormField | null; // null = buat field kustom baru
  allFields: FormField[];
  onSaved: () => void;
}) {
  const isEdit = !!field;
  const isBuiltin = !!field?.is_builtin;
  const isLocked = !!field?.is_locked;

  const [label, setLabel] = useState('');
  const [tipe, setTipe] = useState<FieldTipe>('text');
  const [opsiText, setOpsiText] = useState('');
  const [placeholder, setPlaceholder] = useState('');
  const [bantuan, setBantuan] = useState('');
  const [wajib, setWajib] = useState(false);
  const [aktif, setAktif] = useState(true);
  const [showIf, setShowIf] = useState<CondState>({ ...emptyCond });
  const [wajibIf, setWajibIf] = useState<CondState>({ ...emptyCond });
  const [saving, setSaving] = useState(false);

  // Reset form tiap kali modal dibuka / field berubah
  useEffect(() => {
    if (!open) return;
    setLabel(field?.label ?? '');
    setTipe(field?.tipe ?? 'text');
    setOpsiText((field?.opsi ?? []).join('\n'));
    setPlaceholder(field?.placeholder ?? '');
    setBantuan(field?.bantuan ?? '');
    setWajib(field ? field.wajib === 1 : false);
    setAktif(field ? field.aktif === 1 : true);
    setShowIf(fromCond(field?.show_if));
    setWajibIf(fromCond(field?.wajib_if));
  }, [open, field]);

  const needOpsi = tipe === 'select' || tipe === 'radio';

  // Field lain yang bisa jadi acuan kondisi (kecuali diri sendiri)
  const condFields = allFields.filter((f) => f.field_key !== field?.field_key);

  function condValueInput(state: CondState, set: (s: CondState) => void) {
    const ref = allFields.find((f) => f.field_key === state.field);
    if (ref && (ref.tipe === 'select' || ref.tipe === 'radio') && ref.opsi.length > 0) {
      return (
        <Select value={state.value} onChange={(e) => set({ ...state, value: e.target.value })}>
          <option value="">— pilih nilai —</option>
          {ref.opsi.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      );
    }
    return (
      <Input
        value={state.value}
        onChange={(e) => set({ ...state, value: e.target.value })}
        placeholder="nilai pembanding"
      />
    );
  }

  function CondBlock({
    title,
    state,
    set,
  }: {
    title: string;
    state: CondState;
    set: (s: CondState) => void;
  }) {
    return (
      <div className="rounded-lg border border-gray-200 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
          <input
            type="checkbox"
            checked={state.enabled}
            onChange={(e) => set({ ...state, enabled: e.target.checked })}
            className="h-4 w-4 accent-rbn-primary"
          />
          {title}
        </label>
        {state.enabled && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
            <Select
              value={state.field}
              onChange={(e) => set({ ...state, field: e.target.value, value: '' })}
            >
              <option value="">— pilih field —</option>
              {condFields.map((f) => (
                <option key={f.field_key} value={f.field_key}>
                  {f.label}
                </option>
              ))}
            </Select>
            <Select
              value={state.op}
              onChange={(e) => set({ ...state, op: e.target.value as '=' | '!=' })}
              className="sm:w-20"
            >
              <option value="=">=</option>
              <option value="!=">≠</option>
            </Select>
            {condValueInput(state, set)}
          </div>
        )}
      </div>
    );
  }

  async function handleSave() {
    if (!label.trim()) {
      toast.error('Label pertanyaan wajib diisi.');
      return;
    }
    const opsi = needOpsi
      ? opsiText.split('\n').map((s) => s.trim()).filter(Boolean)
      : [];
    if (needOpsi && opsi.length === 0) {
      toast.error('Isi minimal satu pilihan jawaban.');
      return;
    }

    const payload: FormFieldPayload = {
      label: label.trim(),
      tipe,
      opsi,
      placeholder: placeholder.trim() || null,
      bantuan: bantuan.trim() || null,
      wajib,
      aktif,
      show_if: toCond(showIf),
      wajib_if: toCond(wajibIf),
    };

    setSaving(true);
    try {
      if (isEdit) {
        await updateFormField(field!.id, payload);
        toast.success('Pertanyaan diperbarui.');
      } else {
        await createFormField(payload);
        toast.success('Pertanyaan ditambahkan.');
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Pertanyaan' : 'Tambah Pertanyaan'}
      className="max-w-xl"
    >
      <div className="space-y-4">
        {isLocked && (
          <p className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Field inti — selalu wajib & aktif. Hanya label, placeholder, dan bantuan yang bisa diubah.
          </p>
        )}

        <div>
          <Label required>Label Pertanyaan</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Nomor Rekening" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Tipe Jawaban</Label>
            <Select
              value={tipe}
              onChange={(e) => setTipe(e.target.value as FieldTipe)}
              disabled={isBuiltin}
            >
              {(Object.keys(TIPE_LABEL) as FieldTipe[]).map((t) => (
                <option key={t} value={t}>
                  {TIPE_LABEL[t]}
                </option>
              ))}
            </Select>
            {isBuiltin && <p className="mt-1 text-xs text-gray-400">Tipe field bawaan tidak bisa diubah.</p>}
          </div>
          <div>
            <Label>Placeholder</Label>
            <Input value={placeholder} onChange={(e) => setPlaceholder(e.target.value)} />
          </div>
        </div>

        {needOpsi && (
          <div>
            <Label required>Pilihan Jawaban</Label>
            <Textarea
              rows={3}
              value={opsiText}
              onChange={(e) => setOpsiText(e.target.value)}
              placeholder={'Satu pilihan per baris\nmis.\nYa\nTidak'}
            />
            <p className="mt-1 text-xs text-gray-400">Satu pilihan per baris.</p>
          </div>
        )}

        <div>
          <Label>Teks Bantuan (opsional)</Label>
          <Input value={bantuan} onChange={(e) => setBantuan(e.target.value)} placeholder="petunjuk kecil di bawah field" />
        </div>

        <div className="flex gap-6">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={wajib}
              disabled={isLocked}
              onChange={(e) => setWajib(e.target.checked)}
              className="h-4 w-4 accent-rbn-primary disabled:opacity-50"
            />
            Wajib diisi
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={aktif}
              disabled={isLocked}
              onChange={(e) => setAktif(e.target.checked)}
              className="h-4 w-4 accent-rbn-primary disabled:opacity-50"
            />
            Tampilkan di form
          </label>
        </div>

        {!isLocked && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">Logika Kondisional</p>
            <CondBlock title="Tampilkan field ini hanya jika…" state={showIf} set={setShowIf} />
            <CondBlock title="Wajibkan field ini hanya jika…" state={wajibIf} set={setWajibIf} />
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button onClick={handleSave} loading={saving}>
            {isEdit ? 'Simpan' : 'Tambah'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
