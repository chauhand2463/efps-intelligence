'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import styles from './Login.module.css';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className="text-muted">Sign in to your EFPS dashboard</p>
        </div>
        
        <hr className={styles.divider} />
        
        <form className={styles.form}>
          <div className={styles.formGroup}>
            <label className="label">FPSU ID / AREA ID</label>
            <div className={styles.inputWrapper}>
              <User size={20} className={styles.inputIcon} />
              <input type="text" placeholder="Enter your FPSU ID" className={styles.input} />
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
                type={showPassword ? "text" : "password"} 
                placeholder="Enter your password" 
                className={styles.input} 
              />
              <button 
                type="button" 
                className={styles.toggleIcon} 
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <Link href="/dashboard" style={{ textDecoration: 'none' }}>
            <button type="button" className={styles.submitButton}>
                Login to Dashboard
                <ArrowRight size={20} />
            </button>
          </Link>
        </form>
        
        <div className={styles.orDivider}>
          <div className={styles.line}></div>
          <span>OR</span>
          <div className={styles.line}></div>
        </div>
        
        <div className={styles.secondaryLinks}>
          <Link href="/register" className={styles.createAccount}>Create New Account</Link>
          <Link href="/profile/edit" className={styles.changeProfile}>Change Profile / Reset Password</Link>
        </div>
      </div>
      
      <div className={styles.sslBadge}>
        <Lock size={16} />
        <span>256-BIT SSL ENCRYPTED</span>
      </div>
    </div>
  );
}
