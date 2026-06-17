'use client';

import { Suspense, useState, useRef, type FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Shield } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/auth/AuthCard';
import { OtpInput } from '@/components/auth/OtpInput';
import { SubmitButton } from '@/components/auth/SubmitButton';
import styles from '../register/Register.module.css';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fpsId = searchParams.get('fps_id') ?? '';
  const mobile = searchParams.get('mobile') ?? '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!fpsId) router.replace('/forgot-password');
  }, [fpsId, router]);

  useEffect(() => {
    if (cooldown > 0) {
      intervalRef.current = setInterval(() => setCooldown(c => c - 1), 1000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const result = await api.post<{ message: string; token: string }>(
        '/auth/forgot-password/verify',
        { fps_id: fpsId, otp: code },
        { skipAuth: true }
      );
      toast.success(result.message);
      sessionStorage.setItem('reset_token', result.token);
      router.push(`/set-password?fps_id=${encodeURIComponent(fpsId)}`);
    } catch (err) {
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setCooldown(45);
    try {
      if (!mobile) throw new Error('Mobile number not available');
      await api.post('/auth/forgot-password/request', { fps_id: fpsId, mobile }, { skipAuth: true });
      toast.success('OTP resent');
    } catch {
      toast.error('Failed to resend OTP');
    }
  }

  if (!fpsId) return null;

  return (
    <AuthCard maxWidth={480}>
      <div className={styles.headerCenter}>
        <div className={styles.iconCircle} style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
          <Shield size={28} />
        </div>
        <h1 className={styles.title}>OTP Verification</h1>
        <p className={styles.subtitle}>Enter the 6-digit code sent to your registered mobile number</p>
      </div>

      <form onSubmit={handleSubmit}>
        <OtpInput
          value={otp}
          onChange={(index, value) => {
            const newOtp = [...otp];
            newOtp[index] = value;
            setOtp(newOtp);
          }}
          disabled={loading}
        />

        <div style={{ textAlign: 'center', marginBottom: 24, fontSize: 13, color: '#64748B' }}>
          Didn&apos;t receive the code?{' '}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0}
            style={{
              background: 'none',
              border: 'none',
              color: cooldown > 0 ? '#94A3B8' : '#2563EB',
              fontWeight: 600,
              cursor: cooldown > 0 ? 'default' : 'pointer',
              padding: 0,
              fontFamily: 'inherit',
              fontSize: 13,
            }}
          >
            {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend'}
          </button>
        </div>

        <SubmitButton loading={loading} loadingText="Verifying...">
          Verify OTP
        </SubmitButton>
      </form>
    </AuthCard>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={null}>
      <VerifyOtpForm />
    </Suspense>
  );
}
