'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { LoadingState } from '@/components/ui/spinner';
import { getToken } from '@/lib/api';

type Status = 'loading' | 'ok' | 'error';

/**
 * Menampilkan dokumen kontrak (.docx) APA ADANYA (format asli: tabel, bold,
 * heading, dll.) memakai docx-preview. Otomatis di-scale agar muat lebar layar
 * (responsif untuk HP), ada tombol "Layar Penuh", dan fallback ke teks bila gagal.
 */
export function DocxViewer({
  url,
  auth = false,
  fallback,
  title = 'Kontrak Kerja',
  allowFullscreen = true,
}: {
  url: string;
  auth?: boolean; // kirim Authorization Bearer (untuk endpoint admin)
  fallback?: React.ReactNode; // ditampilkan bila render gagal (mis. teks polos)
  title?: string;
  allowFullscreen?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>('loading');
  const [fullscreen, setFullscreen] = useState(false);

  // Skala dokumen agar PAS lebar kontainer (tidak terpotong).
  const fit = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
    if (!wrapper) return;
    const page = host.querySelector<HTMLElement>('section.docx');
    wrapper.style.transform = 'none';
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
    const ts = [80, 200, 450, 800].map((d) => setTimeout(fit, d));
    return () => ts.forEach(clearTimeout);
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
        // Cache-buster (_t unik) + cache:'no-store' -> selalu ambil versi TERBARU.
        // Menghindari preview basi setelah template/stempel diganti di server.
        const bust = `${url.includes('?') ? '&' : '?'}_t=${Date.now()}`;
        const res = await fetch(url + bust, { headers, cache: 'no-store' });
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

  // Re-scale saat ukuran jendela / kontainer berubah (mis. buka layar penuh).
  useEffect(() => {
    if (status !== 'ok') return;
    const onResize = () => fit();
    window.addEventListener('resize', onResize);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && hostRef.current) {
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

  // Saat masuk/keluar layar penuh: kunci scroll body & re-scale.
  useEffect(() => {
    if (fullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      const cancel = scheduleFit();
      return () => {
        document.body.style.overflow = prev;
        cancel();
      };
    }
    if (status === 'ok') {
      const cancel = scheduleFit();
      return cancel;
    }
  }, [fullscreen, status, scheduleFit]);

  return (
    <>
      {status === 'loading' && <LoadingState text="Memuat dokumen…" />}
      {status === 'error' && (
        <div>
          {fallback ?? <p className="text-sm text-gray-500">Dokumen tidak dapat ditampilkan.</p>}
        </div>
      )}

      <div className={fullscreen ? 'fixed inset-0 z-[70] flex flex-col bg-white' : ''}>
        {fullscreen && (
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{title}</p>
            <button
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <X className="h-4 w-4" /> Tutup
            </button>
          </div>
        )}

        <div className={fullscreen ? 'flex-1 overflow-auto bg-gray-100 p-3' : ''}>
          {allowFullscreen && status === 'ok' && !fullscreen && (
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setFullscreen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Maximize2 className="h-3.5 w-3.5" /> Lihat Layar Penuh
              </button>
            </div>
          )}
          <div
            ref={hostRef}
            className="rbn-docx"
            style={{ display: status === 'ok' ? 'block' : 'none' }}
          />
        </div>
      </div>
    </>
  );
}
