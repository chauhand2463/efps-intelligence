'use client';

import Link from 'next/link';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import styles from '../register/Register.module.css';

export default function PasswordSuccessPage() {
  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '56px 40px' }}>
        
        <div style={{ width: '80px', height: '80px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: 'var(--online-green)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
            <CheckCircle2 size={40} />
        </div>
        
        <h2 className={styles.title} style={{ marginBottom: '12px' }}>Password Updated!</h2>
        <p className={styles.subtitle} style={{ marginBottom: '40px' }}>Your password has been successfully updated. You can now login with your new credentials.</p>
        
        <Link href="/login" style={{ textDecoration: 'none', width: '100%' }}>
            <button type="button" className={styles.submitButton} style={{ marginTop: 0 }}>
                Go to Login
                <ArrowRight size={20} />
            </button>
        </Link>

      </div>
    </div>
  );
}
