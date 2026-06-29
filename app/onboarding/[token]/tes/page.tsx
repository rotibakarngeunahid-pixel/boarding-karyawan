'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle2, XCircle, Clock, FileSignature } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/modal';
import { LoadingState } from '@/components/ui/spinner';
import { ApiError, getSoalPublic, kerjakanTes } from '@/lib/api';
import type { HasilTes, PilihanJawaban, SoalPublicResponse } from '@/types';

const OPSI: { key: PilihanJawaban; field: 'pilihan_a' | 'pilihan_b' | 'pilihan_c' | 'pilihan_d' }[] = [
  { key: 'a', field: 'pilihan_a' },
  { key: 'b', field: 'pilihan_b' },
  { key: 'c', field: 'pilihan_c' },
  { key: 'd', field: 'pilihan_d' },
];

function TesContent() {
  const params = useParams();
  const search = useSearchParams();
  const token = String(params.token);
  const karyawanId = Number(search.get('karyawan_id') || 0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<SoalPublicResponse | null>(null);
  const [jawaban, setJawaban] = useState<Record<number, PilihanJawaban>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasil, setHasil] = useState<HasilTes | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setHasil(null);
    // BUGFIX: reset state submit & dialog setiap sesi baru / retry agar tombol "Kumpulkan Jawaban" tidak stuck loading
    setSubmitting(false);
    setConfirmOpen(false);
    // BUGFIX: bersihkan jawaban sesi sebelumnya agar tidak terbawa ke sesi retry
    setJawaban({});
    // BUGFIX: hentikan timer sesi lama sebelum sesi baru dimulai
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await getSoalPublic(token, karyawanId);
      setData(res);
      // BUGFIX: reset timer ke durasi penuh untuk sesi/percobaan baru
      setSecondsLeft(res.pengaturan.waktu_pengerjaan_menit * 60);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : 'Gagal memuat soal.');
    } finally {
      setLoading(false);
    }
  }, [token, karyawanId]);

  useEffect(() => {
    if (karyawanId) load();
    else {
      setLoading(false);
      setLoadError('Parameter peserta tidak ditemukan.');
    }
  }, [load, karyawanId]);

  // Timer
  const submitRef = useRef<() => void>(() => {});
  useEffect(() => {
    // BUGFIX: timer tidak jalan saat sudah ada hasil atau sedang mengirim (cegah auto-submit ganda)
    if (secondsLeft === null || hasil || submitting) return;
    if (secondsLeft <= 0) {
      toast('Waktu habis! Jawaban dikumpulkan otomatis.', { icon: '⏰' });
      submitRef.current();
      return;
    }
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => (s === null ? s : s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [secondsLeft, hasil, submitting]);

  const doSubmit = useCallback(async () => {
    if (!data) return;
    setConfirmOpen(false);
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const payload = {
        karyawan_id: karyawanId,
        jawaban: data.soal.map((s) => ({ soal_id: s.id, jawaban: jawaban[s.id] ?? '' })),
      };
      const res = await kerjakanTes(payload);
      setHasil(res);
      // BUGFIX: reset state submit setelah berhasil agar bila peserta klik "Coba Lagi" tombol tidak stuck disabled
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      // BUGFIX: tampilkan pesan error API ke peserta (sebelumnya bisa silent fail) + buka kunci tombol
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengirim jawaban.');
      setSubmitting(false);
    }
  }, [data, jawaban, karyawanId]);

  submitRef.current = doSubmit;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingState text="Memuat soal tes…" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
          <h1 className="mt-4 text-xl font-bold text-gray-900">Tidak Bisa Mengerjakan Tes</h1>
          <p className="mt-2 text-sm text-gray-500">{loadError}</p>
        </div>
      </div>
    );
  }

  // ── Halaman Hasil ──
  if (hasil) {
    const lulus = Boolean(hasil.lulus);
    const detail = hasil.detail_jawaban ?? [];
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-2xl px-4">
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            {lulus ? (
              <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="mx-auto h-16 w-16 text-red-500" />
            )}
            <h1 className={`mt-4 text-2xl font-bold ${lulus ? 'text-green-600' : 'text-red-600'}`}>
              {lulus ? 'LULUS ✓' : 'TIDAK LULUS ✗'}
            </h1>
            <p className="mt-2 text-4xl font-black text-gray-900">
              {hasil.total_poin}/{hasil.maks_poin}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Skor {hasil.skor_persen}% · Benar {hasil.total_benar} dari {hasil.total_soal} soal ·
              Passing grade {hasil.passing_grade}%
            </p>

            {!lulus && (hasil.sisa_percobaan ?? 0) > 0 && (
              <Button className="mt-6" onClick={load}>
                Coba Lagi ({hasil.sisa_percobaan} percobaan tersisa)
              </Button>
            )}

            {lulus && hasil.sign_token ? (
              <div className="mt-6">
                <p className="mb-3 text-sm text-gray-600">
                  Satu langkah lagi! Silakan baca & tanda tangani kontrak kerja Anda sekarang.
                </p>
                <Link href={`/kontrak/tanda-tangan/${hasil.sign_token}`}>
                  <Button size="lg" className="w-full">
                    <FileSignature className="h-5 w-5" /> Tanda Tangani Kontrak Sekarang
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="mt-6 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
                {lulus
                  ? 'Selamat, kamu LULUS! Tim RBN akan menghubungi kamu melalui WhatsApp untuk proses kontrak. Terima kasih! 🙏'
                  : 'Tim RBN akan menghubungi kamu melalui WhatsApp. Terima kasih! 🙏'}
              </p>
            )}
          </div>

          {/* Detail jawaban */}
          <div className="mt-6 space-y-3">
            <h2 className="text-base font-semibold text-gray-900">Pembahasan Jawaban</h2>
            {detail.map((d, i) => (
              <div key={d.soal_id} className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-2">
                  {d.benar ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {i + 1}. {d.pertanyaan}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Jawaban kamu:{' '}
                      <span className={d.benar ? 'text-green-600' : 'text-red-600'}>
                        {d.jawaban_user ? d.jawaban_user.toUpperCase() : '(kosong)'}
                      </span>
                      {!d.benar && (
                        <>
                          {' · '}Jawaban benar:{' '}
                          <span className="text-green-600">{d.jawaban_benar.toUpperCase()}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Halaman Pengerjaan ──
  const soal = data?.soal ?? [];
  const mm = secondsLeft !== null ? String(Math.floor(secondsLeft / 60)).padStart(2, '0') : '--';
  const ss = secondsLeft !== null ? String(secondsLeft % 60).padStart(2, '0') : '--';
  const answeredCount = Object.keys(jawaban).length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Sticky header + timer */}
      <div className="sticky top-0 z-20 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Tes Product Knowledge</p>
            <p className="text-xs text-gray-500">
              {answeredCount}/{soal.length} terjawab
            </p>
          </div>
          <div
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${
              (secondsLeft ?? 0) <= 60 ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Clock className="h-4 w-4" />
            {mm}:{ss}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
        {soal.map((s, idx) => (
          <div key={s.id} className="rounded-xl border border-gray-200 bg-white p-5">
            <p className="font-medium text-gray-900">
              {idx + 1}. {s.pertanyaan}
            </p>
            {/* REVISI 4 — gambar soal (responsif) */}
            {s.question_image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={s.question_image_url}
                alt={`Gambar soal ${idx + 1}`}
                className="mt-3 max-h-72 w-full rounded-lg border border-gray-200 object-contain"
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            )}
            <div className="mt-3 space-y-2">
              {OPSI.map(({ key, field }) => (
                <label
                  key={key}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm transition-colors ${
                    jawaban[s.id] === key
                      ? 'border-rbn-primary bg-rbn-primary/5'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`soal-${s.id}`}
                    checked={jawaban[s.id] === key}
                    onChange={() => setJawaban((p) => ({ ...p, [s.id]: key }))}
                    className="mt-0.5 h-4 w-4 accent-rbn-primary"
                  />
                  <span>
                    <span className="font-semibold uppercase">{key}.</span> {s[field]}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}

        <Button
          size="lg"
          className="w-full"
          loading={submitting}
          onClick={() => setConfirmOpen(true)}
        >
          Kumpulkan Jawaban
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={doSubmit}
        title="Kumpulkan Jawaban?"
        message={
          answeredCount < soal.length
            ? `Masih ada ${soal.length - answeredCount} soal belum dijawab. Yakin mengumpulkan sekarang?`
            : 'Semua soal sudah dijawab. Kumpulkan jawaban sekarang?'
        }
        confirmText="Ya, Kumpulkan"
        loading={submitting}
      />
    </div>
  );
}

export default function TesPage() {
  return (
    <Suspense fallback={null}>
      <TesContent />
    </Suspense>
  );
}
