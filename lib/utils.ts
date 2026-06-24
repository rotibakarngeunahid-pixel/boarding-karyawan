import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper className (pola shadcn)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** Format "2024-06-24" -> "24 Juni 2024" */
export function formatTanggal(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '-';
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
}

/** Format dengan jam: "24 Juni 2024, 14:30" */
export function formatTanggalJam(value?: string | null): string {
  if (!value) return '-';
  const d = new Date(value.replace(' ', 'T'));
  if (isNaN(d.getTime())) return '-';
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}, ${jam}:${menit}`;
}

/** Hitung sisa hari dari sekarang ke tanggal target (bisa negatif). */
export function sisaHari(tanggalBerakhir?: string | null): number {
  if (!tanggalBerakhir) return 0;
  const target = new Date(tanggalBerakhir);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/** Format angka jadi Rupiah: 1500000 -> "Rp 1.500.000" */
export function formatRupiah(value?: string | number | null): string {
  if (value === null || value === undefined || value === '') return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '-';
  return 'Rp ' + num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

export function truncate(text: string, max = 60): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max).trimEnd() + '…' : text;
}

/** Copy teks ke clipboard, fallback execCommand. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Trigger download CSV dari array of objects. */
export function exportToCSV(filename: string, rows: Record<string, unknown>[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 38 Provinsi Indonesia
export const PROVINSI_LIST = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau',
  'Jambi', 'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung',
  'DKI Jakarta', 'Jawa Barat', 'Banten', 'Jawa Tengah', 'DI Yogyakarta',
  'Jawa Timur', 'Bali', 'Nusa Tenggara Barat', 'Nusa Tenggara Timur',
  'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan',
  'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara', 'Gorontalo',
  'Sulawesi Tengah', 'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara',
  'Maluku', 'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Selatan',
  'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
];

/** Warna badge status -> kelas Tailwind */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    aktif: 'bg-green-100 text-green-800',
    nonaktif: 'bg-gray-200 text-gray-700',
    resigned: 'bg-red-100 text-red-800',
    berakhir: 'bg-gray-200 text-gray-700',
    diperbarui: 'bg-blue-100 text-blue-800',
    dibatalkan: 'bg-red-100 text-red-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700';
}
