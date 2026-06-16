'use client';

import { Suspense, useState, type FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Lock, LockKeyhole, ArrowRight } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import styles from '../register/Register.module.css';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fpsId = searchParams.get('fps_id') ?? '';
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fpsId || !token) {
      router.replace('/forgot-password');
    }
  }, [fpsId, token, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/forgot-password/reset', { fps_id: fpsId, otp: token, new_password: newPassword }, { skipAuth: true });
      toast.success('Password reset successfully');
      router.push('/password-success');
    } catch (err) {
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Password reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!fpsId || !token) return null;

  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back to Login
        </Link>

        <h2 className={styles.title}>Set New Password</h2>
        <p className={styles.subtitle}>Create a strong password to secure your account.</p>

        <form onSubmit={handleSubmit} style={{ marginTop: '24px' }}>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>New Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={20} className={styles.inputIcon} />
              <input type="password" placeholder="Enter new password" className={styles.input} value={newPassword} onChange={e => setNewPassword(e.target.value)} disabled={loading} />
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '24px' }}>
            <label className={styles.inputLabel}>Confirm Password</label>
            <div className={styles.inputWrapper}>
              <LockKeyhole size={20} className={styles.inputIcon} />
              <input type="password" placeholder="Confirm new password" className={styles.input} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={loading} />
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Updating...' : 'Update Password'}
            <ArrowRight size={20} />
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading...</div>}>
      <SetPasswordForm />
    </Suspense>
  );
}
