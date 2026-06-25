'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Textarea, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import {
  approveKaryawan,
  deleteKaryawan,
  getKaryawanDetail,
  updateKaryawanStatus,
  ApiError,
} from '@/lib/api';
import type { KaryawanDetailResponse } from '@/types';
import { formatTanggal, formatTanggalJam, sisaHari, cn } from '@/lib/utils';

type Tab = 'identitas' | 'tes' | 'kontrak' | 'approval';

export default function KaryawanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<KaryawanDetailResponse | null>(null);
  const [tab, setTab] = useState<Tab>('identitas');
  const [imgPreview, setImgPreview] = useState<string | null>(null);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getKaryawanDetail(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data karyawan.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleApprove(action: 'approved' | 'rejected') {
    setActionLoading(true);
    try {
      await approveKaryawan({ karyawan_id: id, action, catatan: catatan || undefined });
      toast.success(action === 'approved' ? 'Karyawan disetujui.' : 'Karyawan ditolak.');
      setRejectOpen(false);
      setCatatan('');
      await load();
      setTab('identitas');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memproses.');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStatusChange(status: string) {
    try {
      await updateKaryawanStatus(id, status);
      toast.success('Status karyawan diperbarui.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status.');
    }
  }

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      await deleteKaryawan(id);
      toast.success('Karyawan berhasil dihapus.');
      router.push('/karyawan');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus karyawan.');
    } finally {
      setDeleteLoading(false);
    }
  }

  const k = data?.karyawan;
  const needApproval = k?.invitation_status === 'submitted';

  const TABS: { key: Tab; label: string; show?: boolean }[] = [
    { key: 'identitas', label: 'Identitas' },
    { key: 'tes', label: `Tes (${data?.tes.length ?? 0})` },
    { key: 'kontrak', label: `Kontrak (${data?.kontrak.length ?? 0})` },
    { key: 'approval', label: 'Approval', show: needApproval },
  ];

  return (
    <AdminShell
      title="Detail Karyawan"
      action={
        <div className="flex gap-2">
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Hapus
          </Button>
          <Link href="/karyawan">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          </Link>
        </div>
      }
    >
      {loading ? (
        <LoadingState />
      ) : error || !k ? (
        <ErrorState text={error ?? 'Data tidak ditemukan.'} onRetry={load} />
      ) : (
        <div className="space-y-5">
          {/* Header */}
          <Card className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {k.foto_diri_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={k.foto_diri_url}
                  alt={k.nama_lengkap}
                  className="h-16 w-16 cursor-pointer rounded-full object-cover"
                  onClick={() => setImgPreview(k.foto_diri_url!)}
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rbn-primary text-2xl font-bold text-white">
                  {k.nama_lengkap.charAt(0)}
                </div>
              )}
              <div>
                <h2 className="text-lg font-bold text-gray-900">{k.nama_lengkap}</h2>
                <p className="text-sm text-gray-500">
                  {k.posisi ?? '-'} · {k.cabang}
                </p>
                <div className="mt-1 flex gap-2">
                  <Badge status={k.status}>{k.status}</Badge>
                  {k.invitation_status && (
                    <Badge status={k.invitation_status}>{k.invitation_status}</Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="w-40">
              <Label>Ubah Status</Label>
              <Select value={k.status} onChange={(e) => handleStatusChange(e.target.value)}>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
                <option value="resigned">Resigned</option>
              </Select>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.filter((t) => t.show !== false).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                  tab === t.key
                    ? 'border-rbn-primary text-rbn-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {t.label}
                {t.key === 'approval' && needApproval && (
                  <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-red-500" />
                )}
              </button>
            ))}
          </div>

          {/* Tab: Identitas */}
          {tab === 'identitas' && (
            <Card>
              <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <Field label="Nama Lengkap" value={k.nama_lengkap} />
                <Field label="Nama Panggilan" value={k.nama_panggilan} />
                <Field label="Jenis Kelamin" value={k.jenis_kelamin} />
                <Field label="Tanggal Lahir" value={formatTanggal(k.tanggal_lahir)} />
                <Field label="Provinsi Lahir" value={k.provinsi_lahir} />
                <Field label="No. WhatsApp" value={k.no_whatsapp} />
                <Field label="No. KTP" value={k.no_ktp} />
                <Field label="Tanggal Bergabung" value={formatTanggal(k.tanggal_bergabung)} />
                <Field label="Status Pendidikan" value={k.status_pendidikan} />
                <Field label="Nama Sekolah/Kuliah" value={k.nama_sekolah} />
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium uppercase text-gray-400">Alamat Tinggal</dt>
                  <dd className="mt-0.5 text-sm text-gray-900">{k.alamat_tinggal}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-6">
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase text-gray-400">Foto KTP</p>
                  {k.foto_ktp_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={k.foto_ktp_url}
                      alt="KTP"
                      className="h-32 w-48 cursor-pointer rounded-lg border border-gray-200 object-cover"
                      onClick={() => setImgPreview(k.foto_ktp_url!)}
                    />
                  ) : (
                    <p className="text-sm text-gray-400">Tidak ada</p>
                  )}
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-medium uppercase text-gray-400">Foto Diri</p>
                  {k.foto_diri_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={k.foto_diri_url}
                      alt="Foto Diri"
                      className="h-32 w-32 cursor-pointer rounded-lg border border-gray-200 object-cover"
                      onClick={() => setImgPreview(k.foto_diri_url!)}
                    />
                  ) : (
                    <p className="text-sm text-gray-400">Tidak ada</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Tab: Tes */}
          {tab === 'tes' && (
            <Card>
              {data!.tes.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">Belum ada riwayat tes.</p>
              ) : (
                <div className="space-y-3">
                  {data!.tes.map((t, i) => (
                    <div
                      key={t.id ?? i}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div className="flex items-center gap-3">
                        {Number(t.lulus) ? (
                          <CheckCircle2 className="h-6 w-6 text-green-500" />
                        ) : (
                          <XCircle className="h-6 w-6 text-red-500" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            Percobaan #{data!.tes.length - i} · {formatTanggalJam(t.dikerjakan_at)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Benar {t.total_benar}/{t.total_soal} · Passing {t.passing_grade}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{t.skor_persen}%</p>
                        <Badge status={Number(t.lulus) ? 'approved' : 'rejected'}>
                          {Number(t.lulus) ? 'Lulus' : 'Tidak'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Tab: Kontrak */}
          {tab === 'kontrak' && (
            <Card>
              {data!.kontrak.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-gray-400">Belum ada kontrak.</p>
                  <Link href={`/kontrak/buat?karyawan_id=${id}`}>
                    <Button className="mt-3">Buat Kontrak</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {data!.kontrak.map((c) => {
                    const sisa = c.status === 'aktif' ? sisaHari(c.tanggal_berakhir) : null;
                    return (
                      <Link
                        key={c.id}
                        href={`/kontrak/${c.id}`}
                        className="flex items-center justify-between rounded-lg border border-gray-100 p-3 hover:bg-gray-50"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">{c.nomor_kontrak}</p>
                          <p className="text-xs text-gray-500">
                            {formatTanggal(c.tanggal_mulai)} — {formatTanggal(c.tanggal_berakhir)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          {sisa !== null && (
                            <span
                              className={cn(
                                'text-xs font-medium',
                                sisa <= 7 ? 'text-red-600' : sisa <= 30 ? 'text-yellow-600' : 'text-gray-500',
                              )}
                            >
                              {sisa < 0 ? `Lewat ${Math.abs(sisa)} hari` : `Sisa ${sisa} hari`}
                            </span>
                          )}
                          <Badge status={c.status}>{c.status}</Badge>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Tab: Approval */}
          {tab === 'approval' && needApproval && (
            <Card>
              <h3 className="text-base font-semibold text-gray-900">Review Submission</h3>
              <p className="mt-1 text-sm text-gray-500">
                Setujui untuk mengaktifkan karyawan & set tanggal bergabung, atau tolak submission ini.
              </p>
              <div className="mt-4 flex gap-3">
                <Button onClick={() => handleApprove('approved')} loading={actionLoading}>
                  <CheckCircle2 className="h-4 w-4" /> Approve
                </Button>
                <Button variant="danger" onClick={() => setRejectOpen(true)}>
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Modal reject */}
      <Modal open={rejectOpen} onClose={() => setRejectOpen(false)} title="Tolak Submission" className="max-w-md">
        <Label>Catatan (alasan penolakan)</Label>
        <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setRejectOpen(false)}>
            Batal
          </Button>
          <Button variant="danger" loading={actionLoading} onClick={() => handleApprove('rejected')}>
            Tolak
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Karyawan?"
        message={`Karyawan${k ? ` ${k.nama_lengkap}` : ''} akan dihapus permanen beserta hasil tes, kontrak, invitation onboarding, dan file upload terkait.`}
        confirmText="Ya, Hapus"
        loading={deleteLoading}
      />

      {/* Lightbox foto */}
      <Modal open={!!imgPreview} onClose={() => setImgPreview(null)} title="Pratinjau Foto" className="max-w-2xl">
        {imgPreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imgPreview} alt="preview" className="mx-auto max-h-[70vh] rounded-lg object-contain" />
        )}
      </Modal>
    </AdminShell>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-900">{value || '-'}</dd>
    </div>
  );
}
