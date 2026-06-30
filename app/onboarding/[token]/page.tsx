'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { DynamicField } from '@/components/shared/DynamicField';
import { LoadingState } from '@/components/ui/spinner';
import { ApiError, getFormFieldsPublic, submitOnboarding, verifyInvitation } from '@/lib/api';
import { isRequired, isVisible } from '@/lib/formLogic';
import type { FormField, InvitationVerify } from '@/types';

export default function OnboardingFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token);

  const [checking, setChecking] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [verify, setVerify] = useState<InvitationVerify | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Nilai non-file (juga dipakai untuk evaluasi kondisi) + file terpisah
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});

  const setVal = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }));
  const setFile = (key: string, f: File | null) => setFiles((s) => ({ ...s, [key]: f }));

  const check = useCallback(async () => {
    setChecking(true);
    setLoadError(false);
    try {
      const [v, fs] = await Promise.all([verifyInvitation(token), getFormFieldsPublic()]);
      setVerify(v);
      setFields(fs);
    } catch {
      setLoadError(true);
      setVerify({
        valid: false,
        reason: 'Terjadi kesalahan saat memuat formulir.',
        invitation: { cabang: 'Pamogan', posisi: '', catatan: null, status: 'pending', expires_at: '' },
      });
    } finally {
      setChecking(false);
    }
  }, [token]);

  useEffect(() => {
    check();
  }, [check]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validasi field wajib yang sedang tampil
    const missing: string[] = [];
    for (const f of fields) {
      if (!isVisible(f, values) || !isRequired(f, values)) continue;
      const filled =
        f.tipe === 'file' ? !!files[f.field_key] : (values[f.field_key] ?? '').trim() !== '';
      if (!filled) missing.push(f.label);
    }
    if (missing.length) {
      toast.error(`Lengkapi field wajib: ${missing.join(', ')}.`);
      return;
    }

    const fd = new FormData();
    fd.append('token', token);
    for (const f of fields) {
      if (!isVisible(f, values)) continue; // field tersembunyi tidak dikirim
      if (f.tipe === 'file') {
        const file = files[f.field_key];
        if (file) fd.append(f.field_key, file);
      } else {
        fd.append(f.field_key, values[f.field_key] ?? '');
      }
    }

    setSubmitting(true);
    try {
      const res = await submitOnboarding(fd);
      toast.success('Data terkirim! Lanjut ke tes…');
      router.push(`/onboarding/${token}/tes?karyawan_id=${res.karyawan_id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengirim data.');
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingState text="Memuat formulir…" />
      </div>
    );
  }

  if (!verify?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">
            {loadError ? 'Gagal Memuat' : 'Link Tidak Valid'}
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            {verify?.reason || 'Link onboarding tidak ditemukan, sudah digunakan, atau kedaluwarsa.'}
          </p>
          {loadError ? (
            <Button className="mt-4" onClick={check}>
              Coba Lagi
            </Button>
          ) : (
            <p className="mt-4 text-sm text-gray-400">Silakan hubungi admin RBN untuk link baru.</p>
          )}
        </div>
      </div>
    );
  }

  const inv = verify.invitation;
  const visibleFields = fields.filter((f) => isVisible(f, values));

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-6 rounded-2xl bg-rbn-primary p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white shadow-sm">
              <Logo className="h-10 w-10" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Formulir Onboarding</h1>
              <p className="text-sm text-white/80">Roti Bakar Ngeunah</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-white/80">
              Cabang: <span className="font-medium text-white">{inv.cabang}</span>
            </span>
            <span className="text-white/80">
              Posisi: <span className="font-medium text-white">{inv.posisi}</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-white p-6 shadow-sm">
          {visibleFields.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-400">Belum ada pertanyaan pada formulir.</p>
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

          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Kirim &amp; Lanjut ke Tes
          </Button>
        </form>
      </div>
    </div>
  );
}
