'use client';

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { RequireAuth } from '@/lib/auth-guard';

function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname} className="page-transition">{children}</div>;
}

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
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </RequireAuth>
  );
}
