'use client';

import Link from 'next/link';
import { ArrowLeft, User, ArrowRight } from 'lucide-react';
import styles from '../register/Register.module.css';

export default function ForgotPasswordPage() {
  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back to Login
        </Link>
        
        <h2 className={styles.title}>Forgot Password</h2>
        <p className={styles.subtitle}>Enter your FPSU ID or registered mobile number to receive an OTP.</p>
        
        <form style={{ marginTop: '24px' }}>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>FPSU ID / Mobile Number</label>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input type="text" placeholder="Enter ID or Mobile" className={styles.input} />
            </div>
          </div>
          
          <Link href="/verify-otp" style={{ textDecoration: 'none' }}>
            <button type="button" className={styles.submitButton}>
              Send OTP
              <ArrowRight size={20} />
            </button>
          </Link>
        </form>
      </div>
    </div>
  );
}
