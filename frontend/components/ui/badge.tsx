import * as React from 'react';
import { cn } from '@/lib/utils';
import { statusColor } from '@/lib/utils';

export function Badge({
  className,
  children,
  status,
}: {
  className?: string;
  children: React.ReactNode;
  status?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        status ? statusColor(status) : 'bg-gray-100 text-gray-700',
        className,
      )}
    >
      {children}
    </span>
  );
}
