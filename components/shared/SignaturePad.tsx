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
      last.current = pos(e);
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
      setEmpty(true);
    }, [getCtx]);

    useImperativeHandle(
      ref,
      () => ({
        toDataURL: () => (empty ? null : canvasRef.current?.toDataURL('image/png') ?? null),
        clear,
        isEmpty: () => empty,
      }),
      [empty, clear],
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
