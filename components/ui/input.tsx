'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        // Mobile: tinggi 44px (nyaman disentuh) & font 16px (cegah auto-zoom iOS).
        'h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-rbn-primary focus:outline-none focus:ring-1 focus:ring-rbn-primary disabled:bg-gray-100 sm:h-10 sm:text-sm',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      // Mobile: font 16px agar iOS tidak auto-zoom saat fokus.
      'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-gray-900 placeholder:text-gray-400 focus:border-rbn-primary focus:outline-none focus:ring-1 focus:ring-rbn-primary disabled:bg-gray-100 sm:py-2 sm:text-sm',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn('mb-1.5 block text-sm font-medium text-gray-700', className)} {...props}>
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}
