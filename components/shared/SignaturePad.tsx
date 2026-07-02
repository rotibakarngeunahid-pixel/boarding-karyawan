'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Eraser } from 'lucide-react';

export interface SignaturePadHandle {
  /** Data URL PNG tanda tangan, atau null bila kosong. */
  toDataURL: () => string | null;
  clear: () => void;
  isEmpty: () => boolean;
}

/**
 * Kanvas tanda tangan (corat-coret) — mendukung mouse & sentuhan via Pointer Events.
 * Resolusi internal mengikuti devicePixelRatio agar garis tetap tajam.
 */
export const SignaturePad = forwardRef<SignaturePadHandle, { className?: string }>(
  function SignaturePad({ className }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const drawing = useRef(false);
    const last = useRef<{ x: number; y: number } | null>(null);
    const [empty, setEmpty] = useState(true);
    // Bounding box tinta (CSS px, sistem koordinat sama dgn ctx krn ctx.scale(ratio)).
    // Dipakai memotong hasil ke area coretan saja — tanpa ini, seluruh kanvas putih
    // kosong ikut terekam & tanda tangan jadi tampak SANGAT KECIL saat diskalakan
    // ke lebar tetap di dokumen kontrak (coretan cuma sebagian kecil dari kanvas).
    const bbox = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);

    function growBbox(p: { x: number; y: number }) {
      const b = bbox.current;
      if (!b) {
        bbox.current = { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
        return;
      }
      b.minX = Math.min(b.minX, p.x);
      b.minY = Math.min(b.minY, p.y);
      b.maxX = Math.max(b.maxX, p.x);
      b.maxY = Math.max(b.maxY, p.y);
    }

    const getCtx = useCallback(() => {
      const canvas = canvasRef.current;
      return canvas ? canvas.getContext('2d') : null;
    }, []);

    // Atur ukuran kanvas (memperhitungkan DPR) + bersihkan.
    const setup = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * ratio;
      canvas.height = rect.height * ratio;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#111827';
    }, []);

    useEffect(() => {
      setup();
      const onResize = () => {
        // Resize mengosongkan kanvas; reset state agar konsisten.
        setup();
        bbox.current = null;
        setEmpty(true);
      };
      window.addEventListener('resize', onResize);
      return () => window.removeEventListener('resize', onResize);
    }, [setup]);

    function pos(e: React.PointerEvent<HTMLCanvasElement>) {
      const rect = e.currentTarget.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    function start(e: React.PointerEvent<HTMLCanvasElement>) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      drawing.current = true;
      const p = pos(e);
      last.current = p;
      growBbox(p); // titik tunggal (tap) tetap harus masuk bbox
    }

    function move(e: React.PointerEvent<HTMLCanvasElement>) {
      if (!drawing.current) return;
      e.preventDefault();
      const ctx = getCtx();
      if (!ctx || !last.current) return;
      const p = pos(e);
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      last.current = p;
      growBbox(p);
      if (empty) setEmpty(false);
    }

    function end(e: React.PointerEvent<HTMLCanvasElement>) {
      drawing.current = false;
      last.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* abaikan */
      }
    }

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = getCtx();
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bbox.current = null;
      setEmpty(true);
    }, [getCtx]);

    // Potong hasil ke bounding box tinta (+ padding) alih-alih seluruh kanvas
    // kosong -> tanda tangan tampil BESAR & jelas saat ditanam di dokumen.
    const cropToInk = useCallback((): string | null => {
      const canvas = canvasRef.current;
      const b = bbox.current;
      if (!canvas || !b) return null;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const cssW = canvas.width / ratio;
      const cssH = canvas.height / ratio;
      const pad = 14;
      const x0 = Math.max(0, b.minX - pad);
      const y0 = Math.max(0, b.minY - pad);
      const x1 = Math.min(cssW, b.maxX + pad);
      const y1 = Math.min(cssH, b.maxY + pad);
      const sw = Math.max(1, (x1 - x0) * ratio);
      const sh = Math.max(1, (y1 - y0) * ratio);

      const out = document.createElement('canvas');
      out.width = sw;
      out.height = sh;
      const octx = out.getContext('2d');
      if (!octx) return canvas.toDataURL('image/png');
      octx.drawImage(canvas, x0 * ratio, y0 * ratio, sw, sh, 0, 0, sw, sh);
      return out.toDataURL('image/png');
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        toDataURL: () => (empty ? null : cropToInk() ?? canvasRef.current?.toDataURL('image/png') ?? null),
        clear,
        isEmpty: () => empty,
      }),
      [empty, clear, cropToInk],
    );

    return (
      <div className={className}>
        <div className="relative">
          <canvas
            ref={canvasRef}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={end}
            onPointerLeave={end}
            className="h-48 w-full touch-none rounded-xl border-2 border-dashed border-gray-300 bg-white"
          />
          {empty && (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-300">
              Tanda tangan di sini
            </span>
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
          >
            <Eraser className="h-3.5 w-3.5" /> Hapus
          </button>
        </div>
      </div>
    );
  },
);
