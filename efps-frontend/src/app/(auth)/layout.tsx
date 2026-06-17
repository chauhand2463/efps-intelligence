export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        backgroundColor: '#F6F7F9',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `
            radial-gradient(ellipse at 25% 15%, rgba(37,99,235,0.04) 0%, transparent 60%),
            radial-gradient(ellipse at 75% 85%, rgba(37,99,235,0.03) 0%, transparent 60%),
            radial-gradient(ellipse at 50% 50%, rgba(15,23,42,0.015) 0%, transparent 60%)
          `,
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
}
