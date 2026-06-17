'use client';

import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-12) var(--space-6)',
        textAlign: 'center',
        gap: 'var(--space-4)',
      }}
    >
      {icon && (
        <div style={{ color: 'var(--text-muted)', opacity: 0.4 }}>{icon}</div>
      )}
      <div>
        <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-dark)', margin: 0 }}>{title}</p>
        {description && (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 0 0', maxWidth: 320 }}>{description}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
