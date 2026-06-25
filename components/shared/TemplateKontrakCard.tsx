'use client';

import { useEffect, useRef, useState } from 'react';
import { FileText, Upload, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/card';
import { ApiError, getKontrakTemplate, uploadKontrakTemplate } from '@/lib/api';
import type { KontrakTemplate } from '@/types';

// REVISI 3 — kartu kelola template kontrak (.doc/.docx) di panel admin.
export function TemplateKontrakCard() {
  const [template, setTemplate] = useState<KontrakTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getKontrakTemplate()
      .then(setTemplate)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleFile(file: File | null) {
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'doc' && ext !== 'docx') {
      toast.error('Template harus berformat .doc atau .docx.');
      return;
    }
    setUploading(true);
    try {
      const res = await uploadKontrakTemplate(file);
      setTemplate({ id: res.id, original_name: res.original_name, uploaded_at: new Date().toISOString() });
      toast.success('Template kontrak diperbarui.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Gagal mengunggah template.');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-l-rbn-secondary">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-rbn-secondary/20 p-2.5 text-rbn-secondary-dark">
          <FileText className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">Template Surat Kontrak</p>
          {loading ? (
            <p className="text-xs text-gray-400">Memuat…</p>
          ) : template ? (
            <p className="text-xs text-gray-500">
              Aktif: <span className="font-medium text-gray-700">{template.original_name}</span>
            </p>
          ) : (
            <p className="text-xs text-gray-400">Belum ada template. Unggah file .docx berisi placeholder.</p>
          )}
        </div>
      </div>

      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {template ? 'Ganti Template' : 'Upload Template'}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept=".doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      <p className="w-full text-xs text-gray-400">
        Placeholder yang didukung: <code className="text-gray-500">{'{{NAMA_LENGKAP}}'}</code>,{' '}
        <code className="text-gray-500">{'{{POSISI}}'}</code>,{' '}
        <code className="text-gray-500">{'{{CABANG}}'}</code>,{' '}
        <code className="text-gray-500">{'{{NOMOR_KONTRAK}}'}</code>,{' '}
        <code className="text-gray-500">{'{{TANGGAL_MULAI}}'}</code>,{' '}
        <code className="text-gray-500">{'{{TANGGAL_BERAKHIR}}'}</code>,{' '}
        <code className="text-gray-500">{'{{GAJI_POKOK}}'}</code>, dll.
      </p>
    </Card>
  );
}
