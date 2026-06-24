'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SoalForm, type SoalFormValue } from '@/components/shared/SoalForm';
import { ApiError, createSoal } from '@/lib/api';

export default function TambahSoalPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(value: SoalFormValue) {
    setSubmitting(true);
    try {
      await createSoal(value);
      toast.success('Soal berhasil ditambahkan.');
      router.push('/tes');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambah soal.');
      setSubmitting(false);
    }
  }

  return (
    <AdminShell
      title="Tambah Soal"
      action={
        <Link href="/tes">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
      }
    >
      <Card className="max-w-2xl">
        <SoalForm onSubmit={handleSubmit} submitting={submitting} submitLabel="Tambah Soal" />
      </Card>
    </AdminShell>
  );
}
