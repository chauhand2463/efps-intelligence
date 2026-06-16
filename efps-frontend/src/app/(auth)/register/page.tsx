'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, CheckCircle, Building, User, BadgeInfo, MapPin, Lock, LockKeyhole, Check, UserPlus } from 'lucide-react';
import styles from './Register.module.css';

export default function RegisterPage() {
  const [agreed, setAgreed] = useState(true);

  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back to Login
        </Link>
        
        <h2 className={styles.title}>Create New Account</h2>
        <p className={styles.subtitle}>Register your FPS shop to access the dashboard.</p>
        
        <form>
          {/* Section A */}
          <div className={styles.sectionHeader}>
            <Search size={18} style={{ marginRight: '8px' }} />
            <span className={styles.sectionHeaderText}>Verify Your Shop</span>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <span className="text-muted" style={{ marginRight: '4px' }}>#</span> FPS ID / Primary Shop Number
            </label>
            <div className={styles.inputWrapper}>
              <input type="text" className={`${styles.input} ${styles.inputVerified}`} readOnly value="FS-9982-KA" />
              <CheckCircle size={20} className={styles.verifyIcon} />
            </div>
            <div style={{ color: 'var(--online-green)', fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', fontWeight: 500 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--online-green)', marginRight: '6px' }}></div>
              FPS ID verified
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label className={styles.inputLabel} style={{ marginBottom: 0 }}>
                <Building size={16} className="text-muted" style={{ marginRight: '4px' }} /> Area ID
              </label>
              <span style={{ fontSize: '10px', backgroundColor: 'var(--surface-gray)', color: 'var(--text-muted)', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 600, border: '1px solid var(--border-light)' }}>Optional</span>
            </div>
            <div className={styles.inputWrapper}>
              <input type="text" className={styles.input} placeholder="Enter Area ID" style={{ paddingLeft: '16px' }} />
            </div>
          </div>
          
          {/* Section B */}
          <div className={styles.sectionHeader} style={{ marginTop: '40px' }}>
            <User size={18} style={{ marginRight: '8px' }} />
            <span className={styles.sectionHeaderText}>Complete Your Profile</span>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <BadgeInfo size={16} className="text-muted" style={{ marginRight: '4px' }} /> Full Name
            </label>
            <div className={styles.inputWrapper}>
              <input type="text" className={styles.input} placeholder="Enter full name" defaultValue="Ramesh Patel" style={{ paddingLeft: '16px' }} />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Mobile Number</label>
            <div className={styles.inputWrapper}>
              <div className={styles.mobilePrefix}>+91</div>
              <input type="tel" className={styles.input} placeholder="Enter your mobile number" style={{ paddingLeft: '48px' }} />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <MapPin size={16} className="text-muted" style={{ marginRight: '4px' }} /> Address (Village / City)
            </label>
            <div className={styles.inputWrapper}>
              <input type="text" className={styles.input} placeholder="Enter complete address" style={{ paddingLeft: '16px' }} />
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <Lock size={16} className="text-muted" style={{ marginRight: '4px' }} /> Create Password
            </label>
            <div className={styles.inputWrapper}>
              <input type="password" className={styles.input} placeholder="Enter password" defaultValue="secretpassword123" style={{ paddingLeft: '16px' }} />
            </div>
            <div className={styles.strengthBar}>
              <div className={`${styles.strengthSegment} ${styles.segmentGreen}`}></div>
              <div className={`${styles.strengthSegment} ${styles.segmentGreen}`}></div>
              <div className={`${styles.strengthSegment} ${styles.segmentAmber}`}></div>
              <div className={`${styles.strengthSegment} ${styles.segmentGray}`}></div>
              <span className={styles.strengthLabel}>Good</span>
            </div>
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <LockKeyhole size={16} className="text-muted" style={{ marginRight: '4px' }} /> Confirm Password
            </label>
            <div className={styles.inputWrapper}>
              <input type="password" className={`${styles.input} ${styles.inputVerified}`} placeholder="Enter confirm password" defaultValue="secretpassword123" style={{ paddingLeft: '16px' }} />
              <Check size={20} className={styles.verifyIcon} />
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '32px', paddingTop: '24px' }}>
            <label className={styles.checkboxContainer} onClick={() => setAgreed(!agreed)}>
              <div className={styles.customCheckbox} style={agreed ? {} : { backgroundColor: 'transparent' }}>
                {agreed && <Check size={16} color="white" />}
              </div>
              <span className={styles.checkboxLabel}>
                I confirm that the above details are correct and I agree to the <a href="#" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>Terms & Conditions</a> of the eFPS Master platform.
              </span>
            </label>
            
            <Link href="/dashboard" style={{ textDecoration: 'none' }}>
              <button type="button" className={styles.submitButton}>
                <UserPlus size={20} />
                Create Account
              </button>
            </Link>
            
            <div className={styles.footerText}>
              Already have an account? <Link href="/login" style={{ color: 'var(--primary-navy)', fontWeight: 600, textDecoration: 'none' }}>Login here</Link>
            </div>
          </div>
          
        </form>
      </div>
    </div>
  );
}
