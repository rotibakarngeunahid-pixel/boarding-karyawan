'use client';

import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';
import type { Kontrak } from '@/types';

export function KontrakExpireBanner({
  kontrak,
  hari,
  variant,
}: {
  kontrak: Kontrak[];
  hari: number;
  variant: 'danger' | 'warning';
}) {
  if (!kontrak.length) return null;

  const styles =
    variant === 'danger'
      ? 'border-red-200 bg-red-50 text-red-800'
      : 'border-yellow-200 bg-yellow-50 text-yellow-800';
  const Icon = variant === 'danger' ? AlertTriangle : Clock;

  return (
    <div className={`rounded-xl border p-4 ${styles}`}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {kontrak.length} kontrak berakhir dalam {hari} hari
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {kontrak.slice(0, 5).map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-x-2">
                <Link href={`/kontrak/${k.id}`} className="font-medium underline-offset-2 hover:underline">
                  {k.nama_lengkap}
                </Link>
                <span className="opacity-70">— {k.nomor_kontrak}</span>
                <span className="opacity-70">
                  ({(k.sisa_hari ?? 0) < 0 ? 'lewat ' + Math.abs(k.sisa_hari ?? 0) : 'sisa ' + (k.sisa_hari ?? 0)} hari)
                </span>
              </li>
            ))}
          </ul>
          {kontrak.length > 5 && (
            <Link href="/kontrak" className="mt-2 inline-block text-sm font-medium underline">
              Lihat semua ({kontrak.length})
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
