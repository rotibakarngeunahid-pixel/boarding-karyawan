'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

/** Jumlah hari pada bulan (1-12) & tahun tsb — Feb 29 hanya di tahun kabisat. */
function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Pecah nilai ISO YYYY-MM-DD menjadi bagian tahun/bulan/tanggal (string). */
function parseIso(value: string): { y: string; m: string; d: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!m) return { y: '', m: '', d: '' };
  return { y: m[1], m: String(Number(m[2])), d: String(Number(m[3])) };
}

/**
 * Input tanggal bertahap: Tahun (ketik 4 digit) → Bulan (dropdown) → Tanggal (dropdown).
 * Nilai keluar tetap format ISO `YYYY-MM-DD` (kompatibel data lama dari <input type="date">);
 * selama belum lengkap/valid, onChange mengirim '' agar validasi "wajib" tetap bekerja.
 */
export function DatePickerStepwise({
  value,
  onChange,
  minYear = 1950,
  maxYear = new Date().getFullYear(),
}: {
  value: string;
  onChange: (v: string) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const [parts, setParts] = useState(() => parseIso(value));

  // Nilai dari luar (mis. data lama saat edit) → sinkronkan ke 3 input.
  useEffect(() => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) {
      setParts(parseIso(value));
    }
  }, [value]);

  const yearNum = /^\d{4}$/.test(parts.y) ? Number(parts.y) : null;
  const yearValid = yearNum !== null && yearNum >= minYear && yearNum <= maxYear;
  const monthNum = parts.m !== '' ? Number(parts.m) : null;

  // Jumlah hari mengikuti bulan & tahun terpilih (default 31 bila belum lengkap).
  const maxDay = yearValid && monthNum ? daysInMonth(yearNum!, monthNum) : 31;

  function emit(next: { y: string; m: string; d: string }) {
    setParts(next);
    const y = /^\d{4}$/.test(next.y) ? Number(next.y) : null;
    const okYear = y !== null && y >= minYear && y <= maxYear;
    const m = next.m !== '' ? Number(next.m) : null;
    const d = next.d !== '' ? Number(next.d) : null;
    if (okYear && m && d && d <= daysInMonth(y!, m)) {
      onChange(`${next.y}-${pad2(m)}-${pad2(d)}`);
    } else {
      onChange('');
    }
  }

  function setYear(raw: string) {
    const y = raw.replace(/\D/g, '').slice(0, 4);
    const next = { ...parts, y };
    // Tanggal 29 Feb bisa jadi tidak valid setelah tahun berubah → reset tanggal.
    if (
      /^\d{4}$/.test(y) &&
      next.m !== '' &&
      next.d !== '' &&
      Number(next.d) > daysInMonth(Number(y), Number(next.m))
    ) {
      next.d = '';
    }
    emit(next);
  }

  function setMonth(m: string) {
    const next = { ...parts, m };
    if (
      m !== '' &&
      yearValid &&
      next.d !== '' &&
      Number(next.d) > daysInMonth(yearNum!, Number(m))
    ) {
      next.d = '';
    }
    emit(next);
  }

  function setDay(d: string) {
    emit({ ...parts, d });
  }

  const yearError =
    parts.y.length === 4 && !yearValid ? `Tahun harus antara ${minYear}–${maxYear}.` : null;

  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        <div className="min-w-0">
          <span className="mb-1 block text-xs text-gray-400">Tahun</span>
          <Input
            type="text"
            inputMode="numeric"
            maxLength={4}
            placeholder="cth: 1998"
            value={parts.y}
            onChange={(e) => setYear(e.target.value)}
            className={yearError ? 'border-red-400 focus:border-red-500 focus:ring-red-400' : ''}
          />
        </div>
        <div className="min-w-0">
          <span className="mb-1 block text-xs text-gray-400">Bulan</span>
          <Select value={parts.m} onChange={(e) => setMonth(e.target.value)}>
            <option value="">— Bulan —</option>
            {NAMA_BULAN.map((nama, i) => (
              <option key={nama} value={String(i + 1)}>
                {nama}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-0">
          <span className="mb-1 block text-xs text-gray-400">Tanggal</span>
          <Select value={parts.d} onChange={(e) => setDay(e.target.value)}>
            <option value="">— Tgl —</option>
            {Array.from({ length: maxDay }, (_, i) => (
              <option key={i + 1} value={String(i + 1)}>
                {i + 1}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {yearError && <p className="mt-1 text-xs text-red-500">{yearError}</p>}
    </div>
  );
}
