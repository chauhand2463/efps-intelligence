'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Phone, ArrowRight } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/auth/AuthCard';
import { SubmitButton } from '@/components/auth/SubmitButton';
import styles from '../register/Register.module.css';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [fpsId, setFpsId] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fpsId.trim() || !mobile.trim()) {
      toast.error('Please enter FPS ID and mobile number');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/request', { fps_id: fpsId.trim(), mobile: mobile.trim() }, { skipAuth: true });
      toast.success('If the FPS ID and mobile match our records, an OTP will be sent.');
      router.push(`/verify-otp?fps_id=${encodeURIComponent(fpsId.trim())}&mobile=${encodeURIComponent(mobile.trim())}`);
    } catch (err) {
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard maxWidth={480}>
      <Link href="/login" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to Login
      </Link>

      <div className={styles.headerCenter}>
        <div className={styles.iconCircle} style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className={styles.title}>Forgot password</h1>
        <p className={styles.subtitle}>Enter your FPSU ID and registered mobile number to receive an OTP</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>FPSU ID</label>
          <div className={styles.inputWrapper}>
            <User size={18} className={styles.inputIcon} />
            <input type="text" placeholder="Enter FPSU ID" className={styles.input} value={fpsId} onChange={e => setFpsId(e.target.value)} disabled={loading} />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>Registered Mobile Number</label>
          <div className={styles.inputWrapper}>
            <Phone size={18} className={styles.inputIcon} />
            <input type="tel" placeholder="Enter 10-digit mobile" className={styles.input} value={mobile} onChange={e => setMobile(e.target.value)} disabled={loading} />
          </div>
        </div>

        <SubmitButton loading={loading} loadingText="Sending...">
          Send OTP
          <ArrowRight size={18} />
        </SubmitButton>
      </form>
    </AuthCard>
  );
}
