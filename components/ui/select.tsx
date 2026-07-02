'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          // Mobile: tinggi 44px & font 16px (target sentuh nyaman, cegah zoom iOS).
          'h-11 w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 pr-9 text-base text-gray-900 focus:border-rbn-primary focus:outline-none focus:ring-1 focus:ring-rbn-primary disabled:bg-gray-100 sm:h-10 sm:text-sm',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  ),
);
Select.displayName = 'Select';
