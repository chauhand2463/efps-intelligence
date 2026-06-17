'use client';

import type { ReactNode } from 'react';

interface AuthCardProps {
  children: ReactNode;
  maxWidth?: number;
}

export function AuthCard({ children, maxWidth = 480 }: AuthCardProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth,
        animation: 'fadeIn 0.35s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E8EB',
          borderRadius: 24,
          padding: '40px 36px',
        }}
      >
        {children}
      </div>
    </div>
  );
}
