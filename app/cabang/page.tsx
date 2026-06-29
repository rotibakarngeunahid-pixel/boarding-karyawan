'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { ConfirmDialog, Modal } from '@/components/ui/modal';
import {
  ApiError,
  createCabang,
  deleteCabang,
  listCabang,
  updateCabang,
} from '@/lib/api';
import type { CabangItem } from '@/types';

export default function CabangPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<CabangItem[]>([]);

  const [namaBaru, setNamaBaru] = useState('');
  const [adding, setAdding] = useState(false);

  const [editTarget, setEditTarget] = useState<CabangItem | null>(null);
  const [editNama, setEditNama] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<CabangItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await listCabang(false));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat cabang.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const nama = namaBaru.trim();
    if (!nama) {
      toast.error('Nama cabang wajib diisi.');
      return;
    }
    setAdding(true);
    try {
      await createCabang(nama);
      toast.success(`Cabang "${nama}" ditambahkan.`);
      setNamaBaru('');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menambah cabang.');
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleAktif(c: CabangItem) {
    try {
      await updateCabang(c.id, { aktif: c.aktif !== 1 });
      toast.success(c.aktif === 1 ? `Cabang "${c.nama}" dinonaktifkan.` : `Cabang "${c.nama}" diaktifkan.`);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah status cabang.');
    }
  }

  function openEdit(c: CabangItem) {
    setEditTarget(c);
    setEditNama(c.nama);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const nama = editNama.trim();
    if (!nama) {
      toast.error('Nama cabang tidak boleh kosong.');
      return;
    }
    setSavingEdit(true);
    try {
      await updateCabang(editTarget.id, { nama });
      toast.success('Nama cabang diperbarui.');
      setEditTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengubah cabang.');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteCabang(deleteTarget.id);
      toast.success('Cabang dihapus.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus cabang.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <AdminShell title="Cabang">
      <p className="mb-4 text-sm text-gray-500">
        Kelola daftar cabang Roti Bakar Ngeunah. Cabang yang aktif akan muncul saat membuat undangan
        onboarding, kontrak, dan saat mengatur template kontrak. Cabang yang sudah dipakai data tidak
        bisa dihapus — cukup nonaktifkan agar data lama tetap aman.
      </p>

      {/* Tambah cabang */}
      <Card className="mb-4">
        <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[220px] flex-1">
            <Label>Nama Cabang Baru</Label>
            <Input
              value={namaBaru}
              onChange={(e) => setNamaBaru(e.target.value)}
              placeholder="mis. Buduk"
            />
          </div>
          <Button type="submit" loading={adding}>
            <Plus className="h-4 w-4" /> Tambah Cabang
          </Button>
        </form>
      </Card>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : items.length === 0 ? (
        <Card className="py-10 text-center text-sm text-gray-400">Belum ada cabang.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3"
            >
              <div className="rounded-lg bg-rbn-primary/10 p-2 text-rbn-primary">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{c.nama}</p>
              </div>
              <Badge status={c.aktif ? 'aktif' : 'nonaktif'}>
                {c.aktif ? 'Aktif' : 'Nonaktif'}
              </Badge>

              <button
                onClick={() => handleToggleAktif(c)}
                title={c.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                {c.aktif ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                onClick={() => openEdit(c)}
                title="Ubah nama"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteTarget(c)}
                title="Hapus"
                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal edit nama */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Ubah Nama Cabang">
        <form onSubmit={handleEdit} className="space-y-4">
          <div>
            <Label required>Nama Cabang</Label>
            <Input value={editNama} onChange={(e) => setEditNama(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>
              Batal
            </Button>
            <Button type="submit" loading={savingEdit}>
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Cabang?"
        message={`Cabang "${deleteTarget?.nama ?? ''}" akan dihapus permanen. Jika cabang sedang dipakai data, penghapusan akan ditolak — nonaktifkan saja.`}
        confirmText="Ya, Hapus"
        loading={deleting}
      />
    </AdminShell>
  );
}
