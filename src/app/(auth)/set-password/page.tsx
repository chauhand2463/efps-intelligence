'use client';

import Link from 'next/link';
import { ArrowLeft, Lock, LockKeyhole, ArrowRight } from 'lucide-react';
import styles from '../register/Register.module.css';

export default function SetPasswordPage() {
  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back to Login
        </Link>
        
        <h2 className={styles.title}>Set New Password</h2>
        <p className={styles.subtitle}>Create a strong password to secure your account.</p>
        
        <form style={{ marginTop: '24px' }}>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>New Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={20} className={styles.inputIcon} />
              <input type="password" placeholder="Enter new password" className={styles.input} />
            </div>
            <div className={styles.strengthBar}>
              <div className={`${styles.strengthSegment} ${styles.segmentGray}`}></div>
              <div className={`${styles.strengthSegment} ${styles.segmentGray}`}></div>
              <div className={`${styles.strengthSegment} ${styles.segmentGray}`}></div>
              <div className={`${styles.strengthSegment} ${styles.segmentGray}`}></div>
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: '24px' }}>
            <label className={styles.inputLabel}>Confirm Password</label>
            <div className={styles.inputWrapper}>
              <LockKeyhole size={20} className={styles.inputIcon} />
              <input type="password" placeholder="Confirm new password" className={styles.input} />
            </div>
          </div>
          
          <Link href="/password-success" style={{ textDecoration: 'none' }}>
            <button type="button" className={styles.submitButton}>
              Update Password
              <ArrowRight size={20} />
            </button>
          </Link>
        </form>
      </div>
    </div>
  );
}
