'use client';

import { Suspense, useState, type FormEvent, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { Lock, KeyRound, ArrowRight } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/auth/AuthCard';
import { PasswordField } from '@/components/auth/PasswordField';
import { SubmitButton } from '@/components/auth/SubmitButton';
import styles from '../register/Register.module.css';

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fpsId = searchParams.get('fps_id') ?? '';
  const [token] = useState(() => sessionStorage.getItem('reset_token') ?? '');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fpsId || !token) router.replace('/forgot-password');
  }, [fpsId, token, router]);

  useEffect(() => {
    return () => { sessionStorage.removeItem('reset_token'); };
  }, []);

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
      await api.post('/auth/forgot-password/reset', { fps_id: fpsId, token, new_password: newPassword }, { skipAuth: true });
      sessionStorage.removeItem('reset_token');
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
    <AuthCard maxWidth={480}>
      <div className={styles.headerCenter}>
        <div className={styles.iconCircle} style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
          <KeyRound size={28} />
        </div>
        <h1 className={styles.title}>Set new password</h1>
        <p className={styles.subtitle}>Create a strong password to secure your account</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <PasswordField
            label="New Password"
            value={newPassword}
            onChange={setNewPassword}
            placeholder="Min 8 chars, upper + lower + number"
            disabled={loading}
            showStrength
            autoComplete="new-password"
          />
        </div>

        <div className={styles.formGroup}>
          <PasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder="Confirm new password"
            disabled={loading}
            error={confirmPassword && newPassword !== confirmPassword ? 'Passwords do not match' : undefined}
            autoComplete="new-password"
          />
        </div>

        <SubmitButton loading={loading} loadingText="Updating...">
          Update Password
          <ArrowRight size={18} />
        </SubmitButton>
      </form>
    </AuthCard>
  );
}

export default function SetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <SetPasswordForm />
    </Suspense>
  );
}
