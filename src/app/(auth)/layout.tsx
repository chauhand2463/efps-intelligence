export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--surface-gray)', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      {children}
    </div>
  );
}
