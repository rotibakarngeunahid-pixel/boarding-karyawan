'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Save, X, Move } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/spinner';
import {
  getToken,
  kontrakPreviewDocUrl,
  saveStempelSettings,
  type StempelSettings,
} from '@/lib/api';

// Editor "move tool": seret stempel langsung di atas preview kontrak.
export function StempelPositioner({
  open,
  onClose,
  cabang,
  stampUrl,
  settings,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  cabang: string;
  stampUrl: string;
  settings: StempelSettings;
  onSaved: (s: StempelSettings) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<'loading' | 'ok' | 'error' | 'noimg'>('loading');
  const [saving, setSaving] = useState(false);

  const scaleRef = useRef(1); // skala docx
  const markerRef = useRef({ x: 0, y: 0 }); // posisi placeholder (px konten, relatif contentRef)
  const [stamp, setStamp] = useState({ left: 0, top: 0, w: 120 }); // px konten (sudah skala)
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  const render = useCallback(async () => {
    setStatus('loading');
    try {
      const headers: Record<string, string> = {};
      const t = getToken();
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await fetch(kontrakPreviewDocUrl({ cabang }), { headers, cache: 'no-store' });
      if (!res.ok) throw new Error('fetch');
      const buf = await res.arrayBuffer();
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

      // Skala docx agar muat lebar.
      const wrapper = host.querySelector<HTMLElement>('.docx-wrapper');
      const page = host.querySelector<HTMLElement>('section.docx');
      if (wrapper) {
        wrapper.style.transform = 'none';
        const docW = page?.offsetWidth || wrapper.scrollWidth || wrapper.offsetWidth;
        const natH = wrapper.offsetHeight;
        const s = docW ? Math.min(1, host.clientWidth / docW) : 1;
        wrapper.style.transformOrigin = 'top left';
        wrapper.style.transform = `scale(${s})`;
        host.style.height = `${natH * s}px`;
        scaleRef.current = s;
      }

      // Anchor image (stempel floating) perlu satu frame ekstra agar posisi settled.
      await new Promise<void>((res) => requestAnimationFrame(() => requestAnimationFrame(() => res())));

      // Cari stempel: gambar dengan posisi Y paling bawah di dokumen = signing block.
      // Header bisa punya logo (y kecil), stempel anchor selalu paling bawah.
      const content = contentRef.current;
      const allImgs = Array.from(host.querySelectorAll<HTMLImageElement>('img'));
      const visibleImgs = allImgs.filter((img) => img.getBoundingClientRect().width > 0);
      const stampImg = visibleImgs.length
        ? visibleImgs.reduce((best, img) =>
            img.getBoundingClientRect().top > best.getBoundingClientRect().top ? img : best
          )
        : null;
      if (!stampImg || !content) {
        // Stempel belum tampil / posisi nyasar ke luar halaman -> minta user Reset Posisi.
        setStatus('noimg');
        return;
      }
      const r = stampImg.getBoundingClientRect();
      const cr = content.getBoundingClientRect();
      markerRef.current = { x: r.left - cr.left, y: r.top - cr.top };
      stampImg.style.opacity = '0'; // sembunyikan; yang diseret adalah overlay

      // Overlay menutup stempel asli; drag = selisih yang ditambahkan ke offset saat ini.
      setStamp({ left: markerRef.current.x, top: markerRef.current.y, w: r.width || settings.width * scaleRef.current });
      setStatus('ok');

      // Auto-scroll ke area stempel agar langsung terlihat.
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = Math.max(0, markerRef.current.y - 140);
        }
      });
    } catch {
      setStatus('error');
    }
  }, [cabang, settings.offx, settings.offy, settings.width]);

  useEffect(() => {
    if (open) render();
  }, [open, render]);

  // Drag handlers
  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    const cr = contentRef.current!.getBoundingClientRect();
    drag.current = { dx: e.clientX - cr.left - stamp.left, dy: e.clientY - cr.top - stamp.top };
  }
  function onMove(e: React.PointerEvent) {
    if (!drag.current || !contentRef.current) return;
    const cr = contentRef.current.getBoundingClientRect();
    const left = e.clientX - cr.left - drag.current.dx;
    const top = e.clientY - cr.top - drag.current.dy;
    setStamp((p) => ({ ...p, left, top }));
  }
  function onUp(e: React.PointerEvent) {
    drag.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function changeSize(deltaDoc: number) {
    const s = scaleRef.current;
    setStamp((p) => ({ ...p, w: Math.max(40, Math.min(400, p.w / s + deltaDoc)) * s }));
  }

  async function handleSave() {
    const s = scaleRef.current || 1;
    // Offset baru = offset saat ini + selisih seret (acuan = posisi terender saat ini).
    const payload: StempelSettings = {
      width: Math.round(stamp.w / s),
      offx: settings.offx + Math.round((stamp.left - markerRef.current.x) / s),
      offy: settings.offy + Math.round((stamp.top - markerRef.current.y) / s),
    };
    setSaving(true);
    try {
      const saved = await saveStempelSettings(payload);
      toast.success('Posisi stempel disimpan.');
      onSaved(saved);
      onClose();
    } catch {
      toast.error('Gagal menyimpan posisi.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white">
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Move className="h-4 w-4 text-rbn-primary" /> Geser Stempel ke Posisi yang Diinginkan
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => changeSize(-10)} className="rounded-lg border px-2 py-1 text-sm">−</button>
          <span className="text-xs text-gray-500">ukuran</span>
          <button onClick={() => changeSize(10)} className="rounded-lg border px-2 py-1 text-sm">+</button>
          <button
            onClick={() => setStamp((p) => ({ ...p, left: markerRef.current.x, top: markerRef.current.y }))}
            className="rounded-lg border px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
          >
            Reset
          </button>
          <Button size="sm" onClick={handleSave} loading={saving}>
            <Save className="h-4 w-4" /> Simpan
          </Button>
          <button onClick={onClose} className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
        Tarik (drag) gambar stempel ke tempat yang Anda mau. Pakai − / + untuk ukuran. Lalu klik Simpan.
      </p>

      <div ref={scrollRef} className="relative flex-1 overflow-auto bg-gray-100 p-3">
        {status === 'loading' && <LoadingState text="Memuat kontrak…" />}
        {status === 'error' && (
          <p className="p-4 text-center text-sm text-gray-500">
            Gagal memuat preview. Pastikan template untuk cabang ini sudah ada (.docx).
          </p>
        )}
        {status === 'noimg' && (
          <div className="mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
            Stempel belum tampil di dokumen. Tutup editor ini, klik{' '}
            <span className="font-semibold">Reset Posisi</span> pada kartu Stempel, lalu buka lagi. Pastikan
            template memuat <code>{'{{STEMPEL}}'}</code>.
          </div>
        )}
        <div ref={contentRef} className="relative w-full">
          <div ref={hostRef} className="rbn-docx" style={{ overflow: 'visible' }} />
          {status === 'ok' && (
            <div className="pointer-events-none absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={stampUrl}
                alt="Stempel"
                onPointerDown={onDown}
                onPointerMove={onMove}
                onPointerUp={onUp}
                draggable={false}
                style={{
                  position: 'absolute',
                  left: stamp.left,
                  top: stamp.top,
                  width: stamp.w,
                  height: 'auto',
                  cursor: 'move',
                  pointerEvents: 'auto',
                  touchAction: 'none',
                  userSelect: 'none',
                }}
                className="rounded ring-2 ring-rbn-primary/40"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
