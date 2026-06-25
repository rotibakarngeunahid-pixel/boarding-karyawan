'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/shared/Logo';
import {
  LayoutDashboard,
  UserPlus,
  FormInput,
  Users,
  ClipboardList,
  FileText,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/onboarding', label: 'Onboarding', icon: UserPlus },
  { href: '/onboarding/form', label: 'Formulir Onboarding', icon: FormInput },
  { href: '/karyawan', label: 'Karyawan', icon: Users },
  { href: '/tes', label: 'Tes Product Knowledge', icon: ClipboardList },
  { href: '/kontrak', label: 'Kontrak', icon: FileText },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  // Pilih satu menu aktif = pencocokan paling spesifik (href terpanjang)
  const activeHref = NAV.filter(
    ({ href }) => pathname === href || pathname.startsWith(href + '/'),
  ).sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white text-gray-700 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-100 px-5">
          <div className="flex items-center gap-2">
            <Logo className="h-9 w-9 rounded-lg" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-gray-900">Boarding System</p>
              <p className="text-[10px] text-gray-400">Roti Bakar Ngeunah</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === activeHref;
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-rbn-primary font-semibold text-white'
                    : 'text-gray-600 hover:bg-red-50 hover:text-rbn-primary',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4 text-[11px] text-gray-400">
          © {new Date().getFullYear()} RBN Boarding System
        </div>
      </aside>
    </>
  );
}
