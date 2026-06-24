'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Label } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/ui/modal';
import {
  ApiError,
  deleteSoal,
  getPengaturan,
  getSoalAdmin,
  reorderSoal,
  updatePengaturan,
} from '@/lib/api';
import type { TesPengaturan, TesSoal } from '@/types';
import { truncate, cn } from '@/lib/utils';

type Tab = 'soal' | 'pengaturan';

export default function TesAdminPage() {
  const [tab, setTab] = useState<Tab>('soal');

  return (
    <AdminShell
      title="Tes Product Knowledge"
      action={
        tab === 'soal' ? (
          <Link href="/tes/soal/tambah">
            <Button>
              <Plus className="h-4 w-4" /> Tambah Soal
            </Button>
          </Link>
        ) : undefined
      }
    >
      <div className="mb-5 flex gap-1 border-b border-gray-200">
        {(['soal', 'pengaturan'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-4 py-2.5 text-sm font-medium capitalize transition-colors',
              tab === t
                ? 'border-rbn-primary text-rbn-dark'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t === 'soal' ? 'Soal' : 'Pengaturan Tes'}
          </button>
        ))}
      </div>

      {tab === 'soal' ? <SoalTab /> : <PengaturanTab />}
    </AdminShell>
  );
}

// ── Tab Soal ──────────────────────────────────────────────
function SoalTab() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [soal, setSoal] = useState<TesSoal[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSoal(await getSoalAdmin());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat soal.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = soal.findIndex((s) => s.id === active.id);
    const newIdx = soal.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(soal, oldIdx, newIdx).map((s, i) => ({ ...s, urutan: i + 1 }));
    setSoal(reordered);
    try {
      await reorderSoal(reordered.map((s) => ({ id: s.id, urutan: s.urutan })));
      toast.success('Urutan disimpan.');
    } catch {
      toast.error('Gagal menyimpan urutan.');
      load();
    }
  }

  async function handleDelete() {
    if (deleteId === null) return;
    setDeleting(true);
    try {
      await deleteSoal(deleteId);
      toast.success('Soal dinonaktifkan.');
      setDeleteId(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus.');
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState text={error} onRetry={load} />;

  return (
    <>
      <p className="mb-3 text-xs text-gray-400">Seret ikon untuk mengubah urutan soal.</p>
      {soal.length === 0 ? (
        <Card className="py-10 text-center text-sm text-gray-400">Belum ada soal.</Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={soal.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {soal.map((s, i) => (
                <SortableSoalRow key={s.id} soal={s} index={i} onDelete={() => setDeleteId(s.id)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Nonaktifkan Soal?"
        message="Soal akan dinonaktifkan dan tidak muncul di tes. Riwayat hasil tetap aman."
        confirmText="Ya, Nonaktifkan"
        loading={deleting}
      />
    </>
  );
}

function SortableSoalRow({
  soal,
  index,
  onDelete,
}: {
  soal: TesSoal;
  index: number;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: soal.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3',
        isDragging && 'opacity-60 shadow-lg',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-300 hover:text-gray-500"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <span className="w-6 text-center text-sm font-semibold text-gray-400">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-gray-900">{truncate(soal.pertanyaan, 60)}</p>
        <p className="text-xs text-gray-400">
          {soal.poin} poin · jawaban {soal.jawaban_benar?.toUpperCase()}
        </p>
      </div>
      <Badge status={soal.aktif ? 'aktif' : 'nonaktif'}>{soal.aktif ? 'Aktif' : 'Nonaktif'}</Badge>
      <Link
        href={`/tes/soal/${soal.id}`}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <Pencil className="h-4 w-4" />
      </Link>
      <button
        onClick={onDelete}
        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Tab Pengaturan ────────────────────────────────────────
function PengaturanTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<TesPengaturan>({
    passing_grade: 70,
    waktu_pengerjaan_menit: 30,
    max_percobaan: 3,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setForm(await getPengaturan());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat pengaturan.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updatePengaturan(form);
      toast.success('Pengaturan disimpan.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menyimpan.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState text={error} onRetry={load} />;

  return (
    <Card className="max-w-md">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <Label>Passing Grade (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={form.passing_grade}
            onChange={(e) => setForm({ ...form, passing_grade: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Waktu Pengerjaan (menit)</Label>
          <Input
            type="number"
            min={1}
            value={form.waktu_pengerjaan_menit}
            onChange={(e) => setForm({ ...form, waktu_pengerjaan_menit: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Maks Percobaan</Label>
          <Input
            type="number"
            min={0}
            value={form.max_percobaan}
            onChange={(e) => setForm({ ...form, max_percobaan: Number(e.target.value) })}
          />
          <p className="mt-1 text-xs text-gray-400">0 = tidak terbatas</p>
        </div>
        <Button type="submit" loading={saving}>
          Simpan Pengaturan
        </Button>
      </form>
    </Card>
  );
}
