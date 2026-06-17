'use client';

import { Suspense, useState, useRef, type FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, ShieldCheck, ArrowRight } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import styles from '../register/Register.module.css';

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fpsId = searchParams.get('fps_id') ?? '';
  const mobile = searchParams.get('mobile') ?? '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!fpsId) {
      router.replace('/forgot-password');
    }
  }, [fpsId, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

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
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <Link href="/forgot-password" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back
        </Link>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <ShieldCheck size={32} />
          </div>
          <h2 className={styles.title}>OTP Verification</h2>
          <p className={styles.subtitle} style={{ marginBottom: 0 }}>Enter the 6-digit code sent to your registered mobile number.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                disabled={loading}
                style={{ width: '48px', height: '56px', fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--border-input)', fontWeight: 600, color: 'var(--text-dark)' }}
              />
            ))}
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
            Didn&apos;t receive the code?{' '}
            <button type="button" onClick={handleResend} disabled={cooldown > 0} style={{ background: 'none', border: 'none', color: cooldown > 0 ? 'var(--text-muted)' : 'var(--accent-amber)', fontWeight: 600, cursor: cooldown > 0 ? 'default' : 'pointer', padding: 0 }}>
              {cooldown > 0 ? `Resend (${cooldown}s)` : 'Resend'}
            </button>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>}>
      <VerifyOtpForm />
    </Suspense>
  );
}
