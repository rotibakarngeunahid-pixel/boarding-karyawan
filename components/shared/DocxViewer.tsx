'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { LoadingState } from '@/components/ui/spinner';
import { getToken } from '@/lib/api';

type Status = 'loading' | 'ok' | 'error';

/**
 * Menampilkan dokumen kontrak (.docx) APA ADANYA (format asli: tabel, bold,
 * heading, dll.) memakai docx-preview. Otomatis di-scale agar muat lebar layar
 * (responsif untuk HP), dengan fallback ke teks bila gagal.
 */
export function DocxViewer({
  url,
  auth = false,
  fallback,
}: {
  url: string;
  auth?: boolean; // kirim Authorization Bearer (untuk endpoint admin)
  fallback?: React.ReactNode; // ditampilkan bila render gagal (mis. teks polos)
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');

  // Skala dokumen agar PAS lebar kontainer (tidak terpotong).
  const fit = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
    if (!wrapper) return;
    const page = host.querySelector<HTMLElement>('section.docx');
    // ukur ukuran asli tanpa transform dulu
    wrapper.style.transform = 'none';
    // lebar dokumen = lebar HALAMAN (bukan lebar kontainer)
    const docW = page?.offsetWidth || wrapper.scrollWidth || wrapper.offsetWidth;
    const natH = wrapper.offsetHeight;
    if (!docW) return;
    const avail = host.clientWidth;
    const s = Math.min(1, avail / docW);
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.transform = `scale(${s})`;
    host.style.height = `${natH * s}px`;
  }, []);

  // Jalankan fit beberapa kali (font/gambar bisa selesai memuat belakangan).
  const scheduleFit = useCallback(() => {
    requestAnimationFrame(() => fit());
    const t1 = setTimeout(fit, 120);
    const t2 = setTimeout(fit, 350);
    const t3 = setTimeout(fit, 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [fit]);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    (async () => {
      try {
        const headers: Record<string, string> = {};
        if (auth) {
          const t = getToken();
          if (t) headers['Authorization'] = `Bearer ${t}`;
        }
        const res = await fetch(url, { headers });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;

        const host = hostRef.current;
        if (!host) return;
        host.innerHTML = '';

        const { renderAsync } = await import('docx-preview');
        await renderAsync(buf, host, undefined, {
          className: 'docx',
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true,
          renderHeaders: true,
          renderFooters: true,
          experimental: true,
          useBase64URL: true,
        });
        if (cancelled) return;
        setStatus('ok');
        scheduleFit();
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, auth, scheduleFit]);

  // Re-scale saat ukuran jendela / kontainer berubah (mis. modal selesai animasi).
  useEffect(() => {
    if (status !== 'ok') return;
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
      // hanya refit bila LEBAR berubah (set height kita sendiri jangan memicu loop)
      let lastW = hostRef.current.clientWidth;
      ro = new ResizeObserver(() => {
        const w = hostRef.current?.clientWidth ?? 0;
        if (w !== lastW) {
          lastW = w;
          fit();
        }
      });
      ro.observe(hostRef.current);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [status, fit]);

  return (
    <div>
      {status === 'loading' && <LoadingState text="Memuat dokumen…" />}
      {status === 'error' && (
        <div>
          {fallback ?? (
            <p className="text-sm text-gray-500">Dokumen tidak dapat ditampilkan.</p>
          )}
        </div>
      )}
      <div
        ref={hostRef}
        className="rbn-docx"
        style={{ display: status === 'ok' ? 'block' : 'none' }}
      />
    </div>
  );
}
