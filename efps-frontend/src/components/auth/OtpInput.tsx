'use client';

import { useRef } from 'react';

interface OtpInputProps {
  value: string[];
  onChange: (index: number, value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OtpInput({ value, onChange, disabled, error }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, val: string) => {
    if (val.length > 1) val = val[0];
    onChange(index, val);
    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
      {value.map((digit, index) => (
        <input
          key={index}
          ref={el => { inputRefs.current[index] = el; }}
          type="text"
          maxLength={1}
          value={digit}
          onChange={e => handleChange(index, e.target.value)}
          onKeyDown={e => handleKeyDown(index, e)}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          style={{
            width: 48,
            height: 56,
            fontSize: 22,
            fontWeight: 600,
            textAlign: 'center',
            color: '#0F172A',
            backgroundColor: '#FFFFFF',
            border: `2px solid ${error ? '#EF4444' : digit ? '#2563EB' : '#D0D5DD'}`,
            borderRadius: 14,
            outline: 'none',
            transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
            fontFamily: 'inherit',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = error ? '#EF4444' : '#2563EB';
            e.currentTarget.style.boxShadow = error
              ? '0 0 0 3px rgba(239,68,68,0.12)'
              : '0 0 0 3px rgba(37,99,235,0.12)';
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = error ? '#EF4444' : digit ? '#2563EB' : '#D0D5DD';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
      ))}
    </div>
  );
}
