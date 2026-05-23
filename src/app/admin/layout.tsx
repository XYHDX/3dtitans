'use client';

import React from 'react';
import { AdminBottomNav } from '@/components/admin/bottom-nav';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 pb-20">
          {children}
      </main>
      <AdminBottomNav />
    </div>
  );
}
