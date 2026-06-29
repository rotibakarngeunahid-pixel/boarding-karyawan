'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Search, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/spinner';
import { ApiError, createKontrak, listKaryawan } from '@/lib/api';
import { CABANG_LIST, type Karyawan } from '@/types';
import { useCabangOptions } from '@/lib/useCabang';
import { cn } from '@/lib/utils';

function BuatKontrakContent() {
  const router = useRouter();
  const search = useSearchParams();
  const preselectId = Number(search.get('karyawan_id') || 0);

  const [loadingKaryawan, setLoadingKaryawan] = useState(true);
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [selected, setSelected] = useState<Karyawan | null>(null);

  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const cabangOptions = useCabangOptions();
  const [posisi, setPosisi] = useState('');
  const [cabang, setCabang] = useState<string>(CABANG_LIST[0]);
  const cabangSelectOptions = useMemo(
    () => (cabang && !cabangOptions.includes(cabang) ? [cabang, ...cabangOptions] : cabangOptions),
    [cabangOptions, cabang],
  );
  const [tglMulai, setTglMulai] = useState('');
  const [tglBerakhir, setTglBerakhir] = useState('');
  const [gaji, setGaji] = useState('');
  const [catatan, setCatatan] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadKaryawan = useCallback(async () => {
    setLoadingKaryawan(true);
    try {
      // Hanya karyawan aktif & sudah di-approve.
      const all = await listKaryawan({ status: 'aktif' });
      const approved = all.filter((k) => k.invitation_status === 'approved' || k.invitation_status == null);
      setKaryawan(approved);
      if (preselectId) {
        const found = approved.find((k) => k.id === preselectId);
        if (found) pick(found);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat karyawan.');
    } finally {
      setLoadingKaryawan(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectId]);

  useEffect(() => {
    loadKaryawan();
  }, [loadKaryawan]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setDropdownOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function pick(k: Karyawan) {
    setSelected(k);
    setQuery(k.nama_lengkap);
    setPosisi(k.posisi ?? '');
    setCabang(k.cabang);
    setDropdownOpen(false);
  }

  const filtered = useMemo(
    () =>
      karyawan.filter(
        (k) =>
          k.nama_lengkap.toLowerCase().includes(query.toLowerCase()) ||
          (k.no_whatsapp ?? '').includes(query),
      ),
    [karyawan, query],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) {
      toast.error('Pilih karyawan terlebih dahulu.');
      return;
    }
    if (!posisi || !tglMulai || !tglBerakhir) {
      toast.error('Posisi, tanggal mulai, dan tanggal berakhir wajib diisi.');
      return;
    }
    if (new Date(tglBerakhir) <= new Date(tglMulai)) {
      toast.error('Tanggal berakhir harus setelah tanggal mulai.');
      return;
    }
    setSubmitting(true);
    try {
      const k = await createKontrak({
        karyawan_id: selected.id,
        posisi,
        cabang,
        tanggal_mulai: tglMulai,
        tanggal_berakhir: tglBerakhir,
        gaji_pokok: gaji ? Number(gaji) : undefined,
        catatan: catatan || undefined,
      });
      toast.success(`Kontrak ${k.nomor_kontrak} dibuat.`);
      router.push(`/kontrak/${k.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal membuat kontrak.');
      setSubmitting(false);
    }
  }

  return (
    <AdminShell
      title="Buat Kontrak"
      action={
        <Link href="/kontrak">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        </Link>
      }
    >
      {loadingKaryawan ? (
        <LoadingState />
      ) : (
        <Card className="max-w-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Searchable karyawan */}
            <div ref={wrapRef} className="relative">
              <Label required>Pilih Karyawan</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  className="pl-9"
                  placeholder="Cari nama karyawan…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelected(null);
                    setDropdownOpen(true);
                  }}
                  onFocus={() => setDropdownOpen(true)}
                />
              </div>
              {dropdownOpen && (
                <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                  {filtered.length === 0 ? (
                    <p className="px-3 py-3 text-sm text-gray-400">
                      Tidak ada karyawan aktif yang cocok.
                    </p>
                  ) : (
                    filtered.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => pick(k)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50"
                      >
                        <span>
                          <span className="font-medium text-gray-900">{k.nama_lengkap}</span>
                          <span className="ml-2 text-gray-400">
                            {k.cabang} · {k.posisi ?? '-'}
                          </span>
                        </span>
                        {selected?.id === k.id && <Check className="h-4 w-4 text-rbn-primary" />}
                      </button>
                    ))
                  )}
                </div>
              )}
              {selected && (
                <p className="mt-1 text-xs text-green-600">
                  Terpilih: {selected.nama_lengkap} ({selected.no_whatsapp})
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label required>Posisi</Label>
                <Input value={posisi} onChange={(e) => setPosisi(e.target.value)} />
              </div>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label required>Tanggal Mulai</Label>
                <Input type="date" value={tglMulai} onChange={(e) => setTglMulai(e.target.value)} />
              </div>
              <div>
                <Label required>Tanggal Berakhir</Label>
                <Input
                  type="date"
                  value={tglBerakhir}
                  onChange={(e) => setTglBerakhir(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Gaji Pokok (opsional)</Label>
              <Input
                type="number"
                min={0}
                value={gaji}
                onChange={(e) => setGaji(e.target.value)}
                placeholder="mis. 2500000"
              />
            </div>

            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea rows={2} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
            </div>

            <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">
              Nomor kontrak akan dibuat otomatis dengan format{' '}
              <code className="font-mono">PKWT/RBN/{new Date().getFullYear()}/001</code>.
            </p>

            <Button type="submit" loading={submitting} className={cn('w-full')}>
              Buat Kontrak
            </Button>
          </form>
        </Card>
      )}
    </AdminShell>
  );
}

export default function BuatKontrakPage() {
  return (
    <Suspense fallback={null}>
      <BuatKontrakContent />
    </Suspense>
  );
}
