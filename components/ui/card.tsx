import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-gray-200 bg-white p-5 shadow-sm', className)}
      {...props}
    />
  );
}

export function StatCard({
  label,
  value,
  icon,
  accent = 'text-rbn-primary',
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string;
}) {
  return (
    <Card className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-1 text-3xl font-bold text-gray-900">{value}</p>
      </div>
      {icon && <div className={cn('rounded-xl bg-gray-50 p-3', accent)}>{icon}</div>}
    </Card>
  );
}
