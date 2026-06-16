import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--surface-gray)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '40px', height: '100vh', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  );
}
