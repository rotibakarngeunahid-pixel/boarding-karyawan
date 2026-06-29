'use client';

import { useEffect, useState } from 'react';
import { listCabang } from '@/lib/api';
import { CABANG_LIST } from '@/types';

/**
 * Daftar nama cabang AKTIF dari server, untuk mengisi dropdown.
 * Mulai dari CABANG_LIST (fallback) lalu diganti hasil server saat termuat.
 */
export function useCabangOptions(): string[] {
  const [opts, setOpts] = useState<string[]>(CABANG_LIST);

  useEffect(() => {
    let alive = true;
    listCabang(true)
      .then((rows) => {
        const names = rows.map((c) => c.nama);
        if (alive && names.length) setOpts(names);
      })
      .catch(() => {
        /* tetap pakai fallback */
      });
    return () => {
      alive = false;
    };
  }, []);

  return opts;
}
