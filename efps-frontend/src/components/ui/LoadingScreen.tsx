'use client';

export function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-4)',
        minHeight: '100vh',
        backgroundColor: 'var(--surface-gray)',
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: '3px solid var(--border-light)',
          borderTopColor: 'var(--accent-amber)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <p style={{ fontSize: 14, color: 'var(--text-muted)', margin: 0 }}>{message}</p>
    </div>
  );
}
