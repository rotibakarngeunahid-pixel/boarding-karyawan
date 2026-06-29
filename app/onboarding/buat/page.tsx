'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ApiError, createInvitation } from '@/lib/api';
import { CABANG_LIST } from '@/types';
import { useCabangOptions } from '@/lib/useCabang';
import { copyToClipboard } from '@/lib/utils';

function onboardingLink(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  return `${base}/onboarding/${token}`;
}

export default function BuatUndanganPage() {
  const cabangOptions = useCabangOptions();
  const [cabang, setCabang] = useState<string>(CABANG_LIST[0]);
  const [posisi, setPosisi] = useState('');
  const [catatan, setCatatan] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [lamaKontrak, setLamaKontrak] = useState('3');
  const [gajiKontrak, setGajiKontrak] = useState('');
  const [catatanKontrak, setCatatanKontrak] = useState('');
  const [loading, setLoading] = useState(false);
  const [resultLink, setResultLink] = useState<string | null>(null);

  // Selalu tampilkan cabang terpilih meski belum ada di daftar aktif yang termuat.
  const cabangSelectOptions = useMemo(
    () => (cabang && !cabangOptions.includes(cabang) ? [cabang, ...cabangOptions] : cabangOptions),
    [cabangOptions, cabang],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!posisi.trim()) {
      toast.error('Posisi wajib diisi.');
      return;
    }
    setLoading(true);
    try {
      const inv = await createInvitation({
        cabang,
        posisi: posisi.trim(),
        catatan: catatan.trim() || undefined,
        expires_in_days: Number(expiresInDays),
        kontrak_durasi_bulan: lamaKontrak ? Number(lamaKontrak) : undefined,
        kontrak_gaji_pokok: gajiKontrak ? Number(gajiKontrak) : undefined,
        kontrak_catatan: catatanKontrak.trim() || undefined,
      });
      // REVISI 6 — pakai slug pendek bila tersedia
      setResultLink(onboardingLink(inv.test_slug ?? inv.token));
      toast.success('Undangan berhasil dibuat!');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal membuat undangan.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!resultLink) return;
    const ok = await copyToClipboard(resultLink);
    ok ? toast.success('Link disalin!') : toast.error('Gagal menyalin.');
  }

  return (
    <AdminShell
      title="Buat Undangan Onboarding"
      action={
        <Link href="/onboarding">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
      }
    >
      <div className="max-w-xl">
        {resultLink ? (
          <Card>
            <div className="flex flex-col items-center gap-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Undangan Siap Dibagikan</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Bagikan link berikut ke calon karyawan via WhatsApp.
                </p>
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <code className="flex-1 truncate text-left text-sm text-gray-700">{resultLink}</code>
                <Button size="sm" onClick={handleCopy}>
                  <Copy className="h-4 w-4" /> Salin
                </Button>
              </div>
              <div className="flex gap-2">
                <Link href="/onboarding">
                  <Button variant="outline">Ke Daftar Undangan</Button>
                </Link>
                <Button onClick={() => setResultLink(null)}>Buat Lagi</Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label required>Cabang</Label>
                <Select value={cabang} onChange={(e) => setCabang(e.target.value)}>
                  {cabangSelectOptions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label required>Posisi</Label>
                <Input
                  value={posisi}
                  onChange={(e) => setPosisi(e.target.value)}
                  placeholder="mis. Crew / Kasir"
                />
              </div>

              {/* Kontrak otomatis: dipakai saat kandidat LOLOS tes */}
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-700">Kontrak Otomatis</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Saat kandidat <span className="font-medium">LOLOS tes</span>, kontrak langsung dibuat
                  otomatis & kandidat diarahkan menandatangani. Tanggal mulai = tanggal lolos, tanggal
                  berakhir = mulai + lama kontrak di bawah.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Lama Kontrak (bulan)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={lamaKontrak}
                      onChange={(e) => setLamaKontrak(e.target.value)}
                      placeholder="mis. 3"
                    />
                  </div>
                  <div>
                    <Label>Gaji Pokok (opsional)</Label>
                    <Input
                      type="number"
                      min={0}
                      value={gajiKontrak}
                      onChange={(e) => setGajiKontrak(e.target.value)}
                      placeholder="mis. 2500000"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <Label>Catatan Kontrak (opsional)</Label>
                  <Textarea
                    rows={2}
                    value={catatanKontrak}
                    onChange={(e) => setCatatanKontrak(e.target.value)}
                    placeholder="Catatan yang ikut tampil di kontrak…"
                  />
                </div>
              </div>

              <div>
                <Label>Catatan (opsional)</Label>
                <Textarea
                  rows={3}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Catatan internal untuk undangan ini…"
                />
              </div>

              <div>
                <Label required>Masa Berlaku Link</Label>
                <Select value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)}>
                  <option value="1">1 hari</option>
                  <option value="3">3 hari</option>
                  <option value="7">7 hari</option>
                  <option value="14">14 hari</option>
                  <option value="30">30 hari</option>
                </Select>
              </div>

              <Button type="submit" loading={loading} className="w-full">
                Buat Undangan
              </Button>
            </form>
          </Card>
        )}
      </div>
    </AdminShell>
  );
}
