'use client';

import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface PasswordFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  showStrength?: boolean;
  autoComplete?: string;
}

function getStrength(password: string): { score: number; label: string; color: string } {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score, label: 'Weak', color: '#EF4444' };
  if (score <= 2) return { score, label: 'Fair', color: '#F97316' };
  if (score <= 3) return { score, label: 'Good', color: '#F59E0B' };
  if (score <= 4) return { score, label: 'Strong', color: '#10B981' };
  return { score, label: 'Very strong', color: '#059669' };
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
  error,
  showStrength,
  autoComplete,
}: PasswordFieldProps) {
  const [show, setShow] = useState(false);
  const inputId = id ?? `password-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const strength = getStrength(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label
        htmlFor={inputId}
        style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}
      >
        {label}
      </label>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Lock
          size={18}
          style={{
            position: 'absolute',
            left: 14,
            color: error ? '#EF4444' : '#94A3B8',
            pointerEvents: 'none',
          }}
        />
        <input
          id={inputId}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          style={{
            width: '100%',
            padding: '12px 44px 12px 44px',
            height: 48,
            fontSize: 14,
            color: '#0F172A',
            backgroundColor: disabled ? '#F8F9FA' : '#FFFFFF',
            border: `1px solid ${error ? '#EF4444' : '#D0D5DD'}`,
            borderRadius: 14,
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            cursor: disabled ? 'not-allowed' : 'default',
            fontFamily: 'inherit',
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
        />
        <button
          type="button"
          onClick={() => setShow(v => !v)}
          tabIndex={-1}
          aria-label={show ? 'Hide password' : 'Show password'}
          style={{
            position: 'absolute',
            right: 10,
            background: 'none',
            border: 'none',
            padding: 6,
            color: '#94A3B8',
            cursor: 'pointer',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#475569')}
          onMouseLeave={e => (e.currentTarget.style.color = '#94A3B8')}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
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

      {showStrength && value && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div
                key={i}
                style={{
                  height: 4,
                  flex: 1,
                  borderRadius: 2,
                  backgroundColor: i <= strength.score ? strength.color : '#E6E8EB',
                  transition: 'background-color 0.2s ease',
                }}
              />
            ))}
          </div>
          <span style={{ fontSize: 11, color: strength.color, fontWeight: 500, whiteSpace: 'nowrap' }}>
            {strength.label}
          </span>
        </div>
      )}
    </div>
  );
}
