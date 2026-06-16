'use client';

import Link from 'next/link';
import { ArrowLeft, User, Fingerprint, ArrowRight } from 'lucide-react';
import styles from '../register/Register.module.css';

export default function VerifyIdentityPage() {
  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back to Login
        </Link>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(27, 58, 107, 0.1)', color: 'var(--primary-navy)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Fingerprint size={32} />
            </div>
            <h2 className={styles.title}>Verify Identity</h2>
            <p className={styles.subtitle} style={{ marginBottom: 0 }}>Please verify your identity to access sensitive operations.</p>
        </div>
        
        <form>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>FPSU ID</label>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input type="text" placeholder="Enter FPSU ID" className={styles.input} />
            </div>
          </div>
          
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button type="button" className={styles.submitButton} style={{ marginTop: '24px' }}>
              Proceed to Verification
              <ArrowRight size={20} />
            </button>
          </Link>
        </form>
      </div>
    </div>
  );
}
