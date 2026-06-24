'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { SoalForm, type SoalFormValue } from '@/components/shared/SoalForm';
import { ApiError, getSoalAdmin, updateSoal } from '@/lib/api';
import type { TesSoal } from '@/types';

export default function EditSoalPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soal, setSoal] = useState<TesSoal | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all = await getSoalAdmin();
      const found = all.find((s) => s.id === id) ?? null;
      if (!found) setError('Soal tidak ditemukan.');
      setSoal(found);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat soal.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(value: SoalFormValue) {
    setSubmitting(true);
    try {
      await updateSoal(id, value);
      toast.success('Soal berhasil diperbarui.');
      router.push('/tes');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memperbarui soal.');
      setSubmitting(false);
    }
  }

  return (
    <AdminShell
      title="Edit Soal"
      action={
        <Link href="/tes">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
      }
    >
      {loading ? (
        <LoadingState />
      ) : error || !soal ? (
        <ErrorState text={error ?? 'Soal tidak ditemukan.'} onRetry={load} />
      ) : (
        <Card className="max-w-2xl">
          <SoalForm
            initial={soal}
            onSubmit={handleSubmit}
            submitting={submitting}
            submitLabel="Simpan Perubahan"
          />
        </Card>
      )}
    </AdminShell>
  );
}
