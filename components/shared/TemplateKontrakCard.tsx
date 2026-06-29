'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Upload, Loader2, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { LoadingState } from '@/components/ui/spinner';
import {
  ApiError,
  getKontrakTemplates,
  previewKontrakTemplate,
  uploadKontrakTemplate,
} from '@/lib/api';
import { useCabangOptions } from '@/lib/useCabang';
import type { KontrakPreviewResponse, KontrakTemplate } from '@/types';

const UMUM_KEY = '__umum__';
const scopeKey = (cabang: string | null) => cabang ?? UMUM_KEY;

// REVISI 3 — kelola template kontrak (.doc/.docx) per cabang + Umum (fallback).
export function TemplateKontrakCard() {
  const cabangOptions = useCabangOptions();
  const [templates, setTemplates] = useState<KontrakTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingScope, setUploadingScope] = useState<string | null>(null); // key scope yang sedang upload
  const fileRef = useRef<HTMLInputElement>(null);
  const pendingScope = useRef<string | null>(null); // cabang tujuan upload (null = Umum)

  // Preview template (data contoh)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<KontrakPreviewResponse | null>(null);
  const [previewLabel, setPreviewLabel] = useState('');

  function refresh() {
    return getKontrakTemplates()
      .then(setTemplates)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    refresh();
  }, []);

  // Template aktif per scope (key '__umum__' untuk Umum, atau nama cabang).
  const byScope = useMemo(() => {
    const m: Record<string, KontrakTemplate> = {};
    for (const t of templates) m[scopeKey(t.cabang)] = t;
    return m;
  }, [templates]);

  // Baris: Umum dulu, lalu tiap cabang aktif.
  const rows = useMemo(
    () => [
      { key: UMUM_KEY, label: 'Umum (semua cabang)', scope: null as string | null },
      ...cabangOptions.map((c) => ({ key: c, label: c, scope: c as string | null })),
    ],
    [cabangOptions],
  );

  function triggerUpload(scope: string | null) {
    pendingScope.current = scope;
    fileRef.current?.click();
  }

  async function handlePreview(scope: string | null, label: string) {
    setPreviewLabel(label);
    setPreviewData(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      setPreviewData(await previewKontrakTemplate(scope));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal memuat preview.');
      setPreviewOpen(false);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleFile(file: File | null) {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'doc' && ext !== 'docx') {
      toast.error('Template harus berformat .doc atau .docx.');
      return;
    }
    const scope = pendingScope.current;
    setUploadingScope(scopeKey(scope));
    try {
      await uploadKontrakTemplate(file, scope);
      toast.success('Template kontrak diperbarui.');
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengunggah template.');
    } finally {
      setUploadingScope(null);
    }
  }

  return (
    <Card className="border-l-4 border-l-rbn-secondary">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-rbn-secondary/20 p-2.5 text-rbn-secondary-dark">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Template Surat Kontrak per Cabang</p>
          <p className="text-xs text-gray-500">
            Tiap cabang bisa punya template sendiri. Cabang tanpa template akan memakai template{' '}
            <span className="font-medium">Umum</span>.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {loading ? (
          <p className="text-xs text-gray-400">Memuat…</p>
        ) : (
          rows.map((row) => {
            const tpl = byScope[row.key];
            const isUploading = uploadingScope === row.key;
            return (
              <div
                key={row.key}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{row.label}</p>
                  {tpl ? (
                    <p className="truncate text-xs text-gray-500">{tpl.original_name}</p>
                  ) : (
                    <p className="text-xs text-gray-400">
                      {row.scope === null ? 'Belum ada template umum.' : 'Belum ada — pakai template Umum.'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePreview(row.scope, row.label)}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                  <button
                    onClick={() => triggerUpload(row.scope)}
                    disabled={!!uploadingScope}
                    className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    {tpl ? 'Ganti' : 'Upload'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <p className="mt-3 text-xs text-gray-400">
        Placeholder yang didukung: <code className="text-gray-500">{'{{NAMA_LENGKAP}}'}</code>,{' '}
        <code className="text-gray-500">{'{{POSISI}}'}</code>,{' '}
        <code className="text-gray-500">{'{{CABANG}}'}</code>,{' '}
        <code className="text-gray-500">{'{{NOMOR_KONTRAK}}'}</code>,{' '}
        <code className="text-gray-500">{'{{TANGGAL_MULAI}}'}</code>,{' '}
        <code className="text-gray-500">{'{{TANGGAL_BERAKHIR}}'}</code>,{' '}
        <code className="text-gray-500">{'{{GAJI_POKOK}}'}</code>, dll.
      </p>

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={`Preview Template — ${previewLabel}`}
        className="max-w-3xl"
      >
        {previewLoading ? (
          <LoadingState />
        ) : previewData ? (
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              Ini preview memakai <span className="font-semibold">data contoh</span> (nama, gaji, tanggal
              hanya contoh). {previewData.using_template
                ? `Memakai template: ${previewData.template_name ?? '-'}.`
                : 'Belum ada file template untuk cabang ini — memakai format standar bawaan.'}
              {previewData.warning ? ` ${previewData.warning}` : ''}
            </div>
            <div className="max-h-[60vh] whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-5 text-sm leading-7 text-gray-900">
              {previewData.text}
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Preview tidak tersedia.</p>
        )}
      </Modal>
    </Card>
  );
}
