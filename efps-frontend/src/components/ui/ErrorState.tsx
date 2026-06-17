'use client';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'Something went wrong', onRetry }: ErrorStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12) var(--space-6)',
        textAlign: 'center',
        gap: 'var(--space-3)',
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 'var(--radius-full)', backgroundColor: 'var(--offline-red-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--offline-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dark)', margin: 0 }}>Failed to load</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>{message}</p>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            marginTop: 'var(--space-2)',
            padding: '8px 16px',
            fontSize: 13,
            fontWeight: 600,
            backgroundColor: 'var(--background)',
            color: 'var(--text-dark)',
            border: '1px solid var(--border-input)',
            borderRadius: 'var(--radius-md)',
            cursor: 'pointer',
            transition: 'background-color var(--transition-fast)',
          }}
        >
          Try again
        </button>
      )}
    </div>
  );
}
