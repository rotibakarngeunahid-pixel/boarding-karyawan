'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, GripVertical, ArrowLeft, Eye, EyeOff, Lock } from 'lucide-react';
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
import { Card } from '@/components/ui/card';
import { LoadingState, ErrorState } from '@/components/ui/spinner';
import { ConfirmDialog } from '@/components/ui/modal';
import { FormFieldEditor } from '@/components/shared/FormFieldEditor';
import {
  ApiError,
  deleteFormField,
  getFormFields,
  reorderFormFields,
} from '@/lib/api';
import type { FormField } from '@/types';
import { cn } from '@/lib/utils';

const TIPE_LABEL: Record<string, string> = {
  text: 'Teks',
  textarea: 'Teks panjang',
  number: 'Angka',
  tel: 'Telepon',
  date: 'Tanggal',
  select: 'Dropdown',
  radio: 'Pilihan',
  file: 'Gambar',
};

export default function FormBuilderPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<FormField | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FormField | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setFields(await getFormFields());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat field.');
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
    const oldIdx = fields.findIndex((f) => f.id === active.id);
    const newIdx = fields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(fields, oldIdx, newIdx).map((f, i) => ({ ...f, urutan: i + 1 }));
    setFields(reordered);
    try {
      await reorderFormFields(reordered.map((f) => ({ id: f.id, urutan: f.urutan })));
      toast.success('Urutan disimpan.');
    } catch {
      toast.error('Gagal menyimpan urutan.');
      load();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFormField(deleteTarget.id);
      toast.success('Pertanyaan dihapus.');
      setDeleteTarget(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal menghapus.');
    } finally {
      setDeleting(false);
    }
  }

  function openAdd() {
    setEditing(null);
    setEditorOpen(true);
  }
  function openEdit(f: FormField) {
    setEditing(f);
    setEditorOpen(true);
  }

  return (
    <AdminShell
      title="Formulir Onboarding"
      action={
        <div className="flex gap-2">
          <Button onClick={openAdd}>
            <Plus className="h-4 w-4" /> Tambah Pertanyaan
          </Button>
          <Link href="/onboarding">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          </Link>
        </div>
      }
    >
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : (
        <>
          <p className="mb-3 text-xs text-gray-400">
            Seret ikon untuk mengubah urutan. Field bawaan tidak bisa dihapus (hanya dinonaktifkan).
            Atur logika kondisional lewat tombol edit.
          </p>
          {fields.length === 0 ? (
            <Card className="py-10 text-center text-sm text-gray-400">Belum ada field.</Card>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {fields.map((f) => (
                    <SortableFieldRow
                      key={f.id}
                      field={f}
                      onEdit={() => openEdit(f)}
                      onDelete={() => setDeleteTarget(f)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      <FormFieldEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        field={editing}
        allFields={fields}
        onSaved={load}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Pertanyaan?"
        message={`Pertanyaan "${deleteTarget?.label ?? ''}" akan dihapus permanen dari form. Jawaban karyawan lama tetap tersimpan.`}
        confirmText="Ya, Hapus"
        loading={deleting}
      />
    </AdminShell>
  );
}

function SortableFieldRow({
  field,
  onEdit,
  onDelete,
}: {
  field: FormField;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.id,
  });

  const hasRule = !!field.show_if || !!field.wajib_if;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3',
        isDragging && 'opacity-60 shadow-lg',
        field.aktif === 0 && 'opacity-60',
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab touch-none text-gray-300 hover:text-gray-500"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-gray-900">{field.label}</p>
          {field.wajib === 1 && <span className="text-xs font-semibold text-red-500">wajib</span>}
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-gray-400">
          <span>{TIPE_LABEL[field.tipe] ?? field.tipe}</span>
          {hasRule && <span className="text-rbn-primary">· ada logika kondisional</span>}
        </p>
      </div>

      {field.is_locked === 1 ? (
        <Badge className="gap-1">
          <Lock className="h-3 w-3" /> Inti
        </Badge>
      ) : field.is_builtin === 1 ? (
        <Badge>Bawaan</Badge>
      ) : (
        <Badge status="submitted">Kustom</Badge>
      )}

      <Badge status={field.aktif ? 'aktif' : 'nonaktif'}>
        {field.aktif ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
      </Badge>

      <button
        onClick={onEdit}
        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
      >
        <Pencil className="h-4 w-4" />
      </button>
      {field.is_builtin === 0 && (
        <button
          onClick={onDelete}
          className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
