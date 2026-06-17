'use client';

import type { ReactNode, ButtonHTMLAttributes } from 'react';

interface SubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  loading?: boolean;
  loadingText?: string;
}

export function SubmitButton({
  children,
  loading,
  loadingText,
  disabled,
  style,
  ...props
}: SubmitButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      style={{
        width: '100%',
        height: 48,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 15,
        fontWeight: 600,
        fontFamily: 'inherit',
        border: 'none',
        borderRadius: 14,
        backgroundColor: '#0F172A',
        color: '#FFFFFF',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled || loading ? 0.5 : 1,
        transition: 'background-color 0.15s ease, transform 0.1s ease',
        position: 'relative',
        overflow: 'hidden',
        marginTop: 4,
        ...style,
      }}
      onMouseEnter={e => {
        if (!disabled && !loading) e.currentTarget.style.backgroundColor = '#1E293B';
      }}
      onMouseLeave={e => {
        if (!disabled && !loading) e.currentTarget.style.backgroundColor = '#0F172A';
      }}
      onMouseDown={e => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'scale(0.985)';
      }}
      onMouseUp={e => {
        if (!disabled && !loading) e.currentTarget.style.transform = 'scale(1)';
      }}
      {...props}
    >
      {loading ? (
        <>
          <div
            style={{
              width: 16,
              height: 16,
              border: '2px solid rgba(255,255,255,0.25)',
              borderTopColor: '#FFFFFF',
              borderRadius: '50%',
              animation: 'spin 0.7s linear infinite',
            }}
          />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
