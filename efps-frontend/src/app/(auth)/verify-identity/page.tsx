'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, User, Fingerprint, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
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
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <button onClick={() => router.push('/dashboard')} className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back to Dashboard
        </button>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(27, 58, 107, 0.1)', color: 'var(--primary-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Fingerprint size={32} />
            </div>
            <h2 className={styles.title}>Verify Identity</h2>
            <p className={styles.subtitle} style={{ marginBottom: 0 }}>Enter your credentials to access sensitive profile changes.</p>
        </div>
        
        <form onSubmit={handleVerify}>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>FPS ID</label>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input
                type="text"
                placeholder="Your FPS ID"
                className={styles.input}
                value={fpsId}
                onChange={e => setFpsId(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Password</label>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input
                type="password"
                placeholder="Your password"
                className={styles.input}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>
          <button type="submit" className={styles.submitButton} style={{ marginTop: '24px' }} disabled={loading}>
            {loading ? <Loader2 size={20} className="spin" /> : <ArrowRight size={20} />}
            {loading ? 'Verifying...' : 'Proceed to Verification'}
          </button>
        </form>
      </div>
    </div>
  );
}
