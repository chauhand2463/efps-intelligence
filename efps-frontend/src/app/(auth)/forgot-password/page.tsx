'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, User, ArrowRight } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
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
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back to Login
        </Link>

        <h2 className={styles.title}>Forgot Password</h2>
        <p className={styles.subtitle}>Enter your FPSU ID and registered mobile number to receive an OTP.</p>

        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>FPSU ID</label>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input type="text" placeholder="Enter FPSU ID" className={styles.input} value={fpsId} onChange={e => setFpsId(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '16px' }}>
            <label className={styles.inputLabel}>Registered Mobile Number</label>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input type="tel" placeholder="Enter 10-digit mobile" className={styles.input} value={mobile} onChange={e => setMobile(e.target.value)} disabled={loading} />
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Sending...' : 'Send OTP'}
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}
