'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Lock, Eye, EyeOff, ArrowRight, Store } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/auth/AuthCard';
import styles from './Login.module.css';

export default function LoginPage() {
  const { login, user, isInitialized } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [fpsId, setFpsId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isInitialized && user) {
      router.replace('/dashboard');
    }
  }, [isInitialized, user, router]);

  if (isInitialized && user) {
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!fpsId.trim() || !password.trim()) {
      toast.error('Please enter FPS ID and password');
      return;
    }
    setLoading(true);
    try {
      await login(fpsId.trim(), password);
      router.replace('/dashboard');
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
    <AuthCard maxWidth={480}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <Store size={22} />
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <p className={styles.subtitle}>Enter your credentials to access your dashboard</p>
      </div>

      <form className={styles.form} onSubmit={handleSubmit} autoComplete="on">
        <div className={styles.field}>
          <label className={styles.label} htmlFor="fpsId">FPSU ID / Area ID</label>
          <div className={styles.inputWrap}>
            <svg className={styles.inputIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <input
              id="fpsId"
              type="text"
              placeholder="Enter your FPSU ID"
              className={styles.input}
              value={fpsId}
              onChange={e => setFpsId(e.target.value)}
              disabled={loading}
              autoFocus
              autoComplete="username"
            />
          </div>
        </div>

        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="password">Password</label>
            <Link href="/forgot-password" className={styles.forgotLink}>Forgot password?</Link>
          </div>
          <div className={styles.inputWrap}>
            <Lock size={18} className={styles.inputIcon} />
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              className={styles.input}
              value={password}
              onChange={e => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
            <button
              type="button"
              className={styles.toggleBtn}
              onClick={() => setShowPassword(v => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button type="submit" className={styles.submitBtn} disabled={loading}>
          {loading ? (
            <>
              <div className={styles.spinner} />
              Signing in
            </>
          ) : (
            <>
              Sign in
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>OR</span>
        <div className={styles.dividerLine} />
      </div>

      <div className={styles.links}>
        <Link href="/register" className={styles.linkPrimary}>Create new account</Link>
        <Link href="/change-profile" className={styles.linkSecondary}>Change profile / Reset password</Link>
      </div>

      <div className={styles.footer}>
        <div className={styles.sslBadge}>
          <Lock size={12} />
          <span>256-bit SSL encrypted</span>
        </div>
      </div>
    </AuthCard>
  );
}
