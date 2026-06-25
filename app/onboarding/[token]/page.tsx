'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FileUploadPreview } from '@/components/shared/FileUploadPreview';
import { Logo } from '@/components/shared/Logo';
import { LoadingState } from '@/components/ui/spinner';
import { ApiError, submitOnboarding, verifyInvitation } from '@/lib/api';
import { PROVINSI_LIST } from '@/lib/utils';
import type { InvitationVerify, JenisKelamin, StatusPendidikan } from '@/types';

export default function OnboardingFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = String(params.token);

  const [checking, setChecking] = useState(true);
  const [verify, setVerify] = useState<InvitationVerify | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [namaLengkap, setNamaLengkap] = useState('');
  const [namaPanggilan, setNamaPanggilan] = useState('');
  const [jenisKelamin, setJenisKelamin] = useState<JenisKelamin | ''>('');
  const [tanggalLahir, setTanggalLahir] = useState('');
  const [provinsi, setProvinsi] = useState('');
  const [alamat, setAlamat] = useState('');
  const [noWa, setNoWa] = useState('');
  const [noKtp, setNoKtp] = useState('');
  const [fotoKtp, setFotoKtp] = useState<File | null>(null);
  const [fotoDiri, setFotoDiri] = useState<File | null>(null);
  const [statusPendidikan, setStatusPendidikan] = useState<StatusPendidikan | ''>('');
  const [namaSekolah, setNamaSekolah] = useState('');

  const check = useCallback(async () => {
    setChecking(true);
    try {
      setVerify(await verifyInvitation(token));
    } catch {
      setVerify({
        valid: false,
        reason: 'Terjadi kesalahan saat memverifikasi link.',
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
    if (!namaLengkap || !jenisKelamin || !tanggalLahir || !alamat || !noWa) {
      toast.error('Lengkapi semua field yang wajib diisi.');
      return;
    }
    if (!fotoKtp || !fotoDiri) {
      toast.error('Foto KTP dan foto diri wajib diunggah.');
      return;
    }
    if (statusPendidikan === 'Sudah selesai menempuh pendidikan' && !namaSekolah) {
      toast.error('Nama sekolah/tempat kuliah wajib diisi.');
      return;
    }

    const fd = new FormData();
    fd.append('token', token);
    fd.append('nama_lengkap', namaLengkap);
    fd.append('nama_panggilan', namaPanggilan);
    fd.append('jenis_kelamin', jenisKelamin);
    fd.append('tanggal_lahir', tanggalLahir);
    fd.append('provinsi_lahir', provinsi);
    fd.append('alamat_tinggal', alamat);
    fd.append('no_whatsapp', noWa);
    fd.append('no_ktp', noKtp);
    fd.append('status_pendidikan', statusPendidikan);
    fd.append('nama_sekolah', namaSekolah);
    fd.append('foto_ktp', fotoKtp);
    fd.append('foto_diri', fotoDiri);

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
        <LoadingState text="Memverifikasi link…" />
      </div>
    );
  }

  if (!verify?.valid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">Link Tidak Valid</h1>
          <p className="mt-2 text-sm text-gray-500">
            {verify?.reason || 'Link onboarding tidak ditemukan, sudah digunakan, atau kedaluwarsa.'}
          </p>
          <p className="mt-4 text-sm text-gray-400">Silakan hubungi admin RBN untuk link baru.</p>
        </div>
      </div>
    );
  }

  const inv = verify.invitation;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* Header */}
        <div className="mb-6 rounded-2xl bg-rbn-primary p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1">
              <Logo className="h-full w-full" />
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
          <h2 className="text-base font-semibold text-gray-900">Data Identitas</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>Nama Lengkap</Label>
              <Input value={namaLengkap} onChange={(e) => setNamaLengkap(e.target.value)} />
            </div>
            <div>
              <Label>Nama Panggilan</Label>
              <Input value={namaPanggilan} onChange={(e) => setNamaPanggilan(e.target.value)} />
            </div>
          </div>

          <div>
            <Label required>Jenis Kelamin</Label>
            <div className="flex gap-4">
              {(['Laki-Laki', 'Perempuan'] as JenisKelamin[]).map((jk) => (
                <label key={jk} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="jk"
                    checked={jenisKelamin === jk}
                    onChange={() => setJenisKelamin(jk)}
                    className="h-4 w-4 accent-rbn-primary"
                  />
                  {jk}
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>Tanggal Lahir</Label>
              <Input type="date" value={tanggalLahir} onChange={(e) => setTanggalLahir(e.target.value)} />
            </div>
            <div>
              <Label>Provinsi Tempat Lahir</Label>
              <Select value={provinsi} onChange={(e) => setProvinsi(e.target.value)}>
                <option value="">— Pilih Provinsi —</option>
                {PROVINSI_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label required>Alamat Tempat Tinggal</Label>
            <Textarea rows={2} value={alamat} onChange={(e) => setAlamat(e.target.value)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>No. WhatsApp</Label>
              <Input
                value={noWa}
                onChange={(e) => setNoWa(e.target.value)}
                placeholder="08xxxxxxxxxx"
                inputMode="tel"
              />
            </div>
            <div>
              <Label>No. KTP</Label>
              <Input
                value={noKtp}
                onChange={(e) => setNoKtp(e.target.value)}
                placeholder="Ketik 0 jika belum punya"
                inputMode="numeric"
                maxLength={16}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileUploadPreview label="Foto KTP" onChange={setFotoKtp} required />
            <FileUploadPreview label="Foto Diri" onChange={setFotoDiri} required />
          </div>

          <hr className="border-gray-100" />
          <h2 className="text-base font-semibold text-gray-900">Pendidikan</h2>

          <div>
            <Label required>Status Pendidikan</Label>
            <div className="space-y-2">
              {(
                ['Sedang menempuh pendidikan', 'Sudah selesai menempuh pendidikan'] as StatusPendidikan[]
              ).map((sp) => (
                <label key={sp} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="pendidikan"
                    checked={statusPendidikan === sp}
                    onChange={() => setStatusPendidikan(sp)}
                    className="h-4 w-4 accent-rbn-primary"
                  />
                  {sp}
                </label>
              ))}
            </div>
          </div>

          {statusPendidikan === 'Sudah selesai menempuh pendidikan' && (
            <div>
              <Label required>Nama Sekolah / Tempat Kuliah</Label>
              <Input value={namaSekolah} onChange={(e) => setNamaSekolah(e.target.value)} />
            </div>
          )}

          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Kirim & Lanjut ke Tes
          </Button>
        </form>
      </div>
    </div>
  );
}
