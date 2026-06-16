'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, ShieldCheck, ArrowRight } from 'lucide-react';
import styles from '../register/Register.module.css';

export default function VerifyOtpPage() {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <Link href="/forgot-password" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back
        </Link>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <ShieldCheck size={32} />
            </div>
            <h2 className={styles.title}>OTP Verification</h2>
            <p className={styles.subtitle} style={{ marginBottom: 0 }}>We've sent a 6-digit code to your registered mobile number ending in ****892</p>
        </div>
        
        <form>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '24px' }}>
            {otp.map((digit, index) => (
              <input 
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="text" 
                maxLength={1} 
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                style={{ width: '48px', height: '56px', fontSize: '24px', textAlign: 'center', borderRadius: '8px', border: '1px solid var(--border-input)', fontWeight: 600, color: 'var(--text-dark)' }} 
              />
            ))}
          </div>
          
          <div style={{ textAlign: 'center', marginBottom: '24px', fontSize: '14px', color: 'var(--text-muted)' }}>
            Didn't receive the code? <button type="button" style={{ background: 'none', border: 'none', color: 'var(--accent-amber)', fontWeight: 600, cursor: 'pointer', padding: 0 }}>Resend (00:45)</button>
          </div>
          
          <Link href="/set-password" style={{ textDecoration: 'none' }}>
            <button type="button" className={styles.submitButton}>
              Verify OTP
              <ArrowRight size={20} />
            </button>
          </Link>
        </form>
      </div>
    </div>
  );
}
