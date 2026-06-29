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

  // Skala dokumen agar muat lebar kontainer.
  const fit = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
    if (!wrapper) return;
    wrapper.style.transform = 'none';
    const natW = wrapper.offsetWidth;
    const natH = wrapper.offsetHeight;
    if (!natW) return;
    const avail = host.clientWidth;
    const s = Math.min(1, avail / natW);
    wrapper.style.transformOrigin = 'top left';
    wrapper.style.transform = `scale(${s})`;
    host.style.height = `${natH * s}px`;
  }, []);

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
        // beri waktu layout, lalu skala
        requestAnimationFrame(() => fit());
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [url, auth, fit]);

  // Re-scale saat ukuran jendela berubah.
  useEffect(() => {
    if (status !== 'ok') return;
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
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
