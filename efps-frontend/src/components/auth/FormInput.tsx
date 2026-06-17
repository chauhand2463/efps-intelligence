'use client';

import type { ReactNode, InputHTMLAttributes } from 'react';

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: ReactNode;
  error?: string;
  helperText?: string;
  optional?: boolean;
}

export function FormInput({
  label,
  icon,
  error,
  helperText,
  optional,
  id,
  className,
  style,
  ...props
}: FormInputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label
          htmlFor={inputId}
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#0F172A',
          }}
        >
          {label}
          {optional && (
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 6 }}>
              (optional)
            </span>
          )}
        </label>
      </div>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {icon && (
          <div
            style={{
              position: 'absolute',
              left: 14,
              color: error ? '#EF4444' : '#94A3B8',
              pointerEvents: 'none',
              display: 'flex',
              transition: 'color 0.15s ease',
            }}
          >
            {icon}
          </div>
        )}
        <input
          id={inputId}
          style={{
            width: '100%',
            padding: icon ? '12px 16px 12px 44px' : '12px 16px',
            height: 48,
            fontSize: 14,
            color: '#0F172A',
            backgroundColor: '#FFFFFF',
            border: `1px solid ${error ? '#EF4444' : '#D0D5DD'}`,
            borderRadius: 14,
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            fontFamily: 'inherit',
            ...(props.disabled ? { backgroundColor: '#F8F9FA', color: '#94A3B8', cursor: 'not-allowed' } : {}),
            ...style,
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = error ? '#EF4444' : '#2563EB';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(239,68,68,0.12)'
              : '0 0 0 3px rgba(37,99,235,0.12)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? '#EF4444' : '#D0D5DD';
            e.currentTarget.style.boxShadow = 'none';
          }}
          {...props}
        />
      </div>

      {error && (
        <p style={{ margin: 0, fontSize: 12, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </p>
      )}

      {helperText && !error && (
        <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>{helperText}</p>
      )}
    </div>
  );
}
