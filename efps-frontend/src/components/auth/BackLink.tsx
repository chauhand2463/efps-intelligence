'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface BackLinkProps {
  href?: string;
  onClick?: () => void;
  label?: string;
}

export function BackLink({ href, onClick, label = 'Back' }: BackLinkProps) {
  const style = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: '#64748B',
    textDecoration: 'none',
    marginBottom: 28,
    transition: 'color 0.15s ease',
    border: 'none',
    background: 'none',
    cursor: 'pointer',
    padding: 0,
    fontFamily: 'inherit',
  } as React.CSSProperties;

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        style={style}
        onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
        onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
      >
        <ArrowLeft size={16} />
        {label}
      </button>
    );
  }

  return (
    <Link
      href={href ?? '#'}
      style={style}
      onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
      onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
    >
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
