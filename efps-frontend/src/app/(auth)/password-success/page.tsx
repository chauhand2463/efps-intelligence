'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { AuthCard } from '@/components/auth/AuthCard';
import { SubmitButton } from '@/components/auth/SubmitButton';

export default function PasswordSuccessPage() {
  return (
    <AuthCard maxWidth={420}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px 0' }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            backgroundColor: 'rgba(16,185,129,0.1)',
            color: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <CheckCircle2 size={36} />
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', margin: '0 0 8px 0', letterSpacing: '-0.025em' }}>
          Password updated!
        </h1>
        <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 32px 0', lineHeight: 1.6, maxWidth: 320 }}>
          Your password has been successfully updated. You can now login with your new credentials.
        </p>

        <Link href="/login" style={{ textDecoration: 'none', width: '100%' }}>
          <SubmitButton>
            Go to Login
            <ArrowRight size={18} />
          </SubmitButton>
        </Link>
      </div>
    </AuthCard>
  );
}
