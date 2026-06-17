'use client';

import type { ReactNode, ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    backgroundColor: 'var(--accent-amber)',
    color: '#FFFFFF',
    border: 'none',
  },
  secondary: {
    backgroundColor: 'var(--background)',
    color: 'var(--text-dark)',
    border: '1px solid var(--border-input)',
  },
  ghost: {
    backgroundColor: 'transparent',
    color: 'var(--text-muted)',
    border: 'none',
  },
  danger: {
    backgroundColor: 'var(--offline-red)',
    color: '#FFFFFF',
    border: 'none',
  },
};

const sizeStyles: Record<Size, React.CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: '12px', gap: '6px' },
  md: { padding: '10px 18px', fontSize: '14px', gap: '8px' },
  lg: { padding: '12px 24px', fontSize: '16px', gap: '10px' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'background-color var(--transition-fast), opacity var(--transition-fast), box-shadow var(--transition-fast)',
        whiteSpace: 'nowrap',
        lineHeight: 1.4,
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
}
