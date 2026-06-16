'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiRequestError } from '@/lib/api';
import styles from './Login.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [fpsId, setFpsId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fpsId.trim() || !password.trim()) {
      toast.error('Please enter FPS ID and password');
      return;
    }
    setLoading(true);
    try {
      await login(fpsId.trim(), password);
      router.push('/dashboard');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        toast.error(err.message);
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className="text-muted">Sign in to your EFPS dashboard</p>
        </div>

        <hr className={styles.divider} />

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className="label">FPSU ID / AREA ID</label>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input
                type="text"
                placeholder="Enter your FPSU ID"
                className={styles.input}
                value={fpsId}
                onChange={e => setFpsId(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label className="label">PASSWORD</label>
              <Link href="/forgot-password" className={styles.forgotLink}>Forgot Password?</Link>
            </div>
            <div className={styles.inputWrapper}>
              <Lock size={20} className={styles.inputIcon} />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
              <button
                type="button"
                className={styles.toggleIcon}
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Signing in...' : 'Login to Dashboard'}
            {!loading && <ArrowRight size={20} />}
          </button>
        </form>

        <div className={styles.orDivider}>
          <div className={styles.line} />
          <span>OR</span>
          <div className={styles.line} />
        </div>

        <div className={styles.secondaryLinks}>
          <Link href="/register" className={styles.createAccount}>Create New Account</Link>
          <Link href="/change-profile" className={styles.changeProfile}>Change Profile / Reset Password</Link>
        </div>
      </div>

      <div className={styles.sslBadge}>
        <Lock size={16} />
        <span>256-BIT SSL ENCRYPTED</span>
      </div>
    </div>
  );
}
