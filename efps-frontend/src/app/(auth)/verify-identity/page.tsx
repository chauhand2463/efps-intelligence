'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Fingerprint, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AuthCard } from '@/components/auth/AuthCard';
import { FormInput } from '@/components/auth/FormInput';
import { PasswordField } from '@/components/auth/PasswordField';
import { SubmitButton } from '@/components/auth/SubmitButton';
import styles from '../register/Register.module.css';
import toast from 'react-hot-toast';

export default function VerifyIdentityPage() {
  const router = useRouter();
  const { dealer, login } = useAuth();
  const [fpsId, setFpsId] = useState(dealer?.fps_id ?? '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fpsId.trim()) {
      toast.error('Please enter your FPS ID');
      return;
    }
    if (!password.trim()) {
      toast.error('Please enter your password');
      return;
    }
    setLoading(true);
    try {
      await login(fpsId.trim(), password);
      toast.success('Identity verified');
      router.push('/change-profile');
    } catch {
      toast.error('Invalid FPS ID or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard maxWidth={480}>
      <div className={styles.headerCenter}>
        <div className={styles.iconCircle} style={{ backgroundColor: 'rgba(37,99,235,0.1)', color: '#2563EB' }}>
          <Fingerprint size={28} />
        </div>
        <h1 className={styles.title}>Verify identity</h1>
        <p className={styles.subtitle}>Enter your credentials to access profile settings</p>
      </div>

      <form onSubmit={handleVerify}>
        <div className={styles.formGroup}>
          <FormInput
            label="FPS ID"
            icon={<UserIcon />}
            value={fpsId}
            onChange={e => setFpsId(e.target.value)}
            placeholder="Your FPS ID"
            disabled={loading}
          />
        </div>

        <div className={styles.formGroup}>
          <PasswordField
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder="Your password"
            disabled={loading}
            autoComplete="current-password"
          />
        </div>

        <SubmitButton loading={loading} loadingText="Verifying...">
          <ArrowRight size={18} />
          Verify & Continue
        </SubmitButton>
      </form>
    </AuthCard>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
