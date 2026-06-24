'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  UserPlus,
  Users,
  ClipboardList,
  FileText,
  X,
} from 'lucide-react';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/onboarding', label: 'Onboarding', icon: UserPlus },
  { href: '/karyawan', label: 'Karyawan', icon: Users },
  { href: '/tes', label: 'Tes Product Knowledge', icon: ClipboardList },
  { href: '/kontrak', label: 'Kontrak', icon: FileText },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {/* Overlay mobile */}
      {open && <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={onClose} />}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-rbn-dark text-white transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-5">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-rbn-primary text-base font-black text-rbn-dark">
              RBN
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold">Boarding System</p>
              <p className="text-[10px] text-white/50">Roti Bakar Ngeunah</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                onClick={onClose}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                  active
                    ? 'bg-rbn-primary font-semibold text-rbn-dark'
                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4 text-[11px] text-white/40">
          © {new Date().getFullYear()} RBN Boarding System
        </div>
      </aside>
    </>
  );
}
