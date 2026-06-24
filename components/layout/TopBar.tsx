'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { clearSession, getStoredUser } from '@/lib/api';
import type { User } from '@/types';
import toast from 'react-hot-toast';

export function TopBar({ onMenu }: { onMenu: () => void }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  async function handleLogout() {
    await clearSession();
    toast.success('Berhasil keluar.');
    router.push('/login');
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-4 lg:px-6">
      <button onClick={onMenu} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden">
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex flex-1 items-center justify-end gap-4">
        <div className="text-right leading-tight">
          <p className="text-sm font-medium text-gray-900">{user?.nama ?? 'Admin'}</p>
          <p className="text-[11px] capitalize text-gray-400">{user?.role ?? 'admin'}</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-rbn-primary text-sm font-bold text-rbn-dark">
          {(user?.nama ?? 'A').charAt(0).toUpperCase()}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </div>
    </header>
  );
}
