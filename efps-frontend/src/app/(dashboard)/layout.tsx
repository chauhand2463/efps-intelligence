'use client';

import Sidebar from '@/components/Sidebar';
import { RequireAuth } from '@/lib/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--surface-gray)' }}>
        <Sidebar />
        <main style={{ flex: 1, padding: '40px', height: '100vh', overflowY: 'auto' }}>
          {children}
        </main>
      </div>
    </RequireAuth>
  );
}
