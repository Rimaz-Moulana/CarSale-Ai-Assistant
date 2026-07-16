import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { Breadcrumbs } from './Breadcrumbs';

export function Layout() {
  return (
    <div className="flex h-screen w-full bg-[var(--background)]">
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6 text-[var(--foreground)] bg-slate-50 dark:bg-[#090e17]">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
}
