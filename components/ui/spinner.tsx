import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-rbn-primary', className)} />;
}

export function LoadingState({ text = 'Memuat…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-400">
      <Spinner className="h-8 w-8" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

export function ErrorState({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16">
      <p className="text-sm text-red-600">{text}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Coba Lagi
        </button>
      )}
    </div>
  );
}
