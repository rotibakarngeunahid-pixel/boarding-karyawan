'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

export function AdminShell({
  children,
  title,
  action,
}: {
  children: React.ReactNode;
  title?: string;
  action?: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onMenu={() => setSidebarOpen(true)} />

        <main className="flex-1 p-4 lg:p-6">
          {(title || action) && (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              {title && <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">{title}</h1>}
              {action}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
