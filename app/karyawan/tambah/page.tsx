'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { DynamicField } from '@/components/shared/DynamicField';
import { ApiError, createKaryawanManual, getFormFieldsPublic } from '@/lib/api';
import { isRequired, isVisible } from '@/lib/formLogic';
import { CABANG_LIST, type FormField } from '@/types';

export default function TambahKaryawanPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Field kerja yang diisi admin langsung (di luar Formulir Onboarding).
  const [cabang, setCabang] = useState<string>(CABANG_LIST[0]);
  const [posisi, setPosisi] = useState('');
  const [tglBergabung, setTglBergabung] = useState('');
  const [status, setStatus] = useState('aktif');

  // Jawaban field dinamis.
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const setVal = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));
  const setFile = (key: string, f: File | null) => setFiles((s) => ({ ...s, [key]: f }));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setFields(await getFormFieldsPublic());
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Gagal memuat formulir.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!cabang) {
      toast.error('Cabang wajib dipilih.');
      return;
    }

    // Validasi field wajib yang tampil (file opsional saat input manual).
    const missing: string[] = [];
    for (const f of fields) {
      if (!isVisible(f, values) || !isRequired(f, values)) continue;
      if (f.tipe === 'file') continue; // file boleh menyusul
      if ((values[f.field_key] ?? '').trim() === '') missing.push(f.label);
    }
    if (missing.length) {
      toast.error(`Lengkapi field wajib: ${missing.join(', ')}.`);
      return;
    }

    const fd = new FormData();
    fd.append('cabang', cabang);
    fd.append('posisi', posisi);
    fd.append('tanggal_bergabung', tglBergabung);
    fd.append('status', status);
    for (const f of fields) {
      if (!isVisible(f, values)) continue;
      if (f.tipe === 'file') {
        const file = files[f.field_key];
        if (file) fd.append(f.field_key, file);
      } else {
        fd.append(f.field_key, values[f.field_key] ?? '');
      }
    }

    setSubmitting(true);
    try {
      const res = await createKaryawanManual(fd);
      toast.success('Karyawan berhasil ditambahkan.');
      router.push(`/karyawan/${res.karyawan_id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambahkan karyawan.');
      setSubmitting(false);
    }
  }

  const visibleFields = fields.filter((f) => isVisible(f, values));

  return (
    <AdminShell
      title="Tambah Karyawan Manual"
      action={
        <Link href="/karyawan">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
      }
    >
      {loading ? (
        <LoadingState />
      ) : loadError ? (
        <ErrorState text={loadError} onRetry={load} />
      ) : (
        <Card className="max-w-2xl">
          <p className="mb-5 text-sm text-gray-500">
            Input data karyawan secara langsung tanpa undangan onboarding. Field di bawah mengikuti{' '}
            <Link href="/onboarding/form" className="text-rbn-primary hover:underline">
              Formulir Onboarding
            </Link>
            . Foto boleh dikosongkan dan dilengkapi nanti.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Field kerja (admin) */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label required>Cabang</Label>
                <Select value={cabang} onChange={(e) => setCabang(e.target.value)}>
                  {CABANG_LIST.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Posisi</Label>
                <Input value={posisi} onChange={(e) => setPosisi(e.target.value)} placeholder="mis. Kasir" />
              </div>
              <div>
                <Label>Tanggal Bergabung</Label>
                <Input type="date" value={tglBergabung} onChange={(e) => setTglBergabung(e.target.value)} />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                  <option value="resigned">Resigned</option>
                </Select>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <p className="mb-4 text-xs font-semibold uppercase text-gray-400">Data Diri</p>
              <div className="space-y-5">
                {visibleFields.length === 0 ? (
                  <p className="text-sm text-gray-400">Belum ada field pada formulir.</p>
                ) : (
                  visibleFields.map((f) => (
                    <DynamicField
                      key={f.id}
                      field={f}
                      required={isRequired(f, values)}
                      value={values[f.field_key] ?? ''}
                      onValue={(v) => setVal(f.field_key, v)}
                      onFile={(file) => setFile(f.field_key, file)}
                    />
                  ))
                )}
              </div>
            </div>

            <Button type="submit" loading={submitting} className="w-full" size="lg">
              Simpan Karyawan
            </Button>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}
