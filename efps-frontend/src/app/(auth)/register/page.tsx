'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, CheckCircle, Building, User, BadgeInfo, MapPin, Lock, LockKeyhole, Check, UserPlus, XCircle, Loader2 } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import styles from './Register.module.css';

interface LookupResult {
  exists: boolean;
  dealer: { fps_id: string; full_name: string } | null;
}

export default function RegisterPage() {
  const router = useRouter();
  const [fpsId, setFpsId] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [lookupName, setLookupName] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [taluka, setTaluka] = useState('');
  const [village] = useState('');
  const [areaId, setAreaId] = useState('');
  const [efpsUsername, setEfpsUsername] = useState('');
  const [efpsPassword, setEfpsPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleVerify() {
    const trimmed = fpsId.trim();
    if (!trimmed) { toast.error('Enter FPS ID'); return; }
    if (trimmed.length < 3 || trimmed.length > 20) { toast.error('FPS ID must be 3-20 characters'); return; }
    setLookupState('loading');
    try {
      const result = await api.get<LookupResult>(`/dealers/lookup/${trimmed}`, { skipAuth: true });
      if (result.exists && result.dealer) {
        setLookupName(result.dealer.full_name);
        setFullName(result.dealer.full_name);
        setLookupState('found');
        toast.success('FPS ID found! Complete your registration.');
      } else {
        setLookupState('notfound');
        toast('FPS ID not found in system. Fill in your details manually.', { icon: 'ℹ️' });
      }
    } catch (err) {
      setLookupState('idle');
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Lookup failed');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agree) { toast.error('Please agree to Terms & Conditions'); return; }
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (!fullName.trim()) { toast.error('Full name is required'); return; }
    if (!mobile.trim() || !/^\d{10}$/.test(mobile.trim())) { toast.error('Enter valid 10-digit mobile'); return; }

    setSubmitting(true);
    try {
      await api.post('/dealers/register', {
        fps_id: fpsId.trim(),
        full_name: fullName.trim(),
        mobile: mobile.trim(),
        password,
        address: address.trim() || undefined,
        district: district.trim() || undefined,
        taluka: taluka.trim() || undefined,
        village: village.trim() || undefined,
        area_id: areaId.trim() || undefined,
        efps_username: efpsUsername.trim() || undefined,
        efps_password: efpsPassword.trim() || undefined,
      }, { skipAuth: true });
      toast.success('Account created! Please login.');
      router.push('/login');
    } catch (err) {
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '520px' }}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back to Login
        </Link>

        <h2 className={styles.title}>Create New Account</h2>
        <p className={styles.subtitle}>Register your FPS shop to access the dashboard.</p>

        <form onSubmit={handleSubmit}>
          <div className={styles.sectionHeader}>
            <Search size={18} style={{ marginRight: '8px' }} />
            <span className={styles.sectionHeaderText}>Verify Your Shop</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <span className="text-muted" style={{ marginRight: '4px' }}>#</span> FPS ID / Primary Shop Number
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <div className={styles.inputWrapper} style={{ flex: 1 }}>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Enter FPS ID (5-20 digits)"
                  value={fpsId}
                  onChange={e => { setFpsId(e.target.value); setLookupState('idle'); }}
                  disabled={submitting}
                />
                {lookupState === 'found' && <CheckCircle size={20} className={styles.verifyIcon} />}
                {lookupState === 'notfound' && <XCircle size={20} className={styles.verifyIcon} style={{ color: 'var(--error-red)' }} />}
              </div>
              <button
                type="button"
                onClick={handleVerify}
                disabled={lookupState === 'loading' || submitting}
                className={styles.submitButton}
                style={{ width: 'auto', padding: '0 20px', whiteSpace: 'nowrap', marginTop: 0 }}
              >
                {lookupState === 'loading' ? <Loader2 size={18} className="spin" /> : 'Verify'}
              </button>
            </div>
            {lookupState === 'found' && (
              <div style={{ color: 'var(--online-green)', fontSize: '12px', marginTop: '8px', display: 'flex', alignItems: 'center', fontWeight: 500 }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--online-green)', marginRight: '6px' }}></div>
                FPS ID verified — {lookupName}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <Building size={16} className="text-muted" style={{ marginRight: '4px' }} /> Area ID
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 400 }}>(optional)</span>
            </label>
            <div className={styles.inputWrapper}>
              <input type="text" className={styles.input} placeholder="Enter Area ID" value={areaId} onChange={e => setAreaId(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className={styles.sectionHeader} style={{ marginTop: '32px' }}>
            <User size={18} style={{ marginRight: '8px' }} />
            <span className={styles.sectionHeaderText}>Complete Your Profile</span>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <BadgeInfo size={16} className="text-muted" style={{ marginRight: '4px' }} /> Full Name
            </label>
            <div className={styles.inputWrapper}>
              <input type="text" className={styles.input} placeholder="Enter full name" value={fullName} onChange={e => setFullName(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>Mobile Number</label>
            <div className={styles.inputWrapper}>
              <div className={styles.mobilePrefix}>+91</div>
              <input type="tel" className={styles.input} placeholder="10-digit mobile number" value={mobile} onChange={e => setMobile(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <MapPin size={16} className="text-muted" style={{ marginRight: '4px' }} /> Address
              <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '8px', fontWeight: 400 }}>(optional)</span>
            </label>
            <div className={styles.inputWrapper}>
              <input type="text" className={styles.input} placeholder="Village / City / Address" value={address} onChange={e => setAddress(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>District <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(opt)</span></label>
              <div className={styles.inputWrapper}>
                <input type="text" className={styles.input} placeholder="District" value={district} onChange={e => setDistrict(e.target.value)} disabled={submitting} />
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.inputLabel}>Taluka <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(opt)</span></label>
              <div className={styles.inputWrapper}>
                <input type="text" className={styles.input} placeholder="Taluka" value={taluka} onChange={e => setTaluka(e.target.value)} disabled={submitting} />
              </div>
            </div>
          </div>

          <div className={styles.sectionHeader} style={{ marginTop: '32px' }}>
            <Lock size={18} style={{ marginRight: '8px' }} />
            <span className={styles.sectionHeaderText}>Government eFPS Sync (Optional)</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
            Provide your eFPS portal credentials to auto-sync beneficiary data from the government system.
          </p>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>eFPS Username</label>
            <div className={styles.inputWrapper}>
              <input type="text" className={styles.input} placeholder="eFPS portal username" value={efpsUsername} onChange={e => setEfpsUsername(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>eFPS Password</label>
            <div className={styles.inputWrapper}>
              <input type="password" className={styles.input} placeholder="eFPS portal password" value={efpsPassword} onChange={e => setEfpsPassword(e.target.value)} disabled={submitting} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <Lock size={16} className="text-muted" style={{ marginRight: '4px' }} /> Create Password
            </label>
            <div className={styles.inputWrapper}>
              <input type="password" className={styles.input} placeholder="Min 8 chars, upper + lower + number" value={password} onChange={e => setPassword(e.target.value)} disabled={submitting} />
            </div>
            {password && (
              <div className={styles.strengthBar}>
                <div className={`${styles.strengthSegment} ${password.length >= 8 ? styles.segmentGreen : styles.segmentGray}`}></div>
                <div className={`${styles.strengthSegment} ${/[A-Z]/.test(password) ? styles.segmentGreen : styles.segmentGray}`}></div>
                <div className={`${styles.strengthSegment} ${/[a-z]/.test(password) ? styles.segmentGreen : styles.segmentGray}`}></div>
                <div className={`${styles.strengthSegment} ${/[0-9]/.test(password) ? styles.segmentGreen : styles.segmentGray}`}></div>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>
              <LockKeyhole size={16} className="text-muted" style={{ marginRight: '4px' }} /> Confirm Password
            </label>
            <div className={styles.inputWrapper}>
              <input type="password" className={`${styles.input} ${password && confirmPassword && password === confirmPassword ? styles.inputVerified : ''}`} placeholder="Confirm password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} disabled={submitting} />
              {password && confirmPassword && password === confirmPassword && <Check size={20} className={styles.verifyIcon} />}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--border-light)', marginTop: '28px', paddingTop: '20px' }}>
            <label className={styles.checkboxContainer} onClick={() => setAgree(!agree)}>
              <div className={styles.customCheckbox} style={agree ? {} : { backgroundColor: 'transparent' }}>
                {agree && <Check size={16} color="white" />}
              </div>
              <span className={styles.checkboxLabel}>
                I confirm that the above details are correct and I agree to the <a href="#" style={{ color: 'var(--accent-amber)', textDecoration: 'none' }}>Terms & Conditions</a>.
              </span>
            </label>

            <button type="submit" className={styles.submitButton} disabled={submitting}>
              {submitting ? <Loader2 size={20} className="spin" /> : <UserPlus size={20} />}
              {submitting ? 'Creating Account...' : 'Create Account'}
            </button>

            <div className={styles.footerText}>
              Already have an account? <Link href="/login" style={{ color: 'var(--primary-navy)', fontWeight: 600, textDecoration: 'none' }}>Login here</Link>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
