'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Save, UserCircle, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import type { DealerDto } from '@/lib/types';
import styles from './ChangeProfile.module.css';

export default function ChangeProfilePage() {
  const [step, setStep] = useState<'auth' | 'edit'>('auth');
  const [authFpsId, setAuthFpsId] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [dealerId, setDealerId] = useState('');

  const [fpsId, setFpsId] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [areaId, setAreaId] = useState('');

  const handleAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!authFpsId.trim() || !authPassword.trim()) {
      toast.error('Enter FPS ID and password');
      return;
    }
    setAuthLoading(true);
    try {
      const result = await api.post<{ dealer: DealerDto }>('/auth/login', {
        fps_id: authFpsId.trim(),
        password: authPassword,
      }, { skipAuth: true });
      const d = result.dealer;
      setDealerId(d.id);
      setFpsId(d.fps_id);
      setFullName(d.full_name);
      setMobile(d.mobile);
      setAddress(d.address ?? '');
      setAreaId(d.area_id ?? '');
      setStep('edit');
      toast.success('Identity verified. You can now update your profile.');
    } catch (err) {
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Verification failed');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSave = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) { toast.error('Full name is required'); return; }
    if (!dealerId) { toast.error('Session expired. Please re-verify.'); setStep('auth'); return; }
    setSaveLoading(true);
    try {
      await api.patch(`/dealers/${dealerId}`, {
        full_name: fullName.trim(),
        address: address.trim() || undefined,
        area_id: areaId.trim() || undefined,
      });
      toast.success('Profile updated successfully!');
    } catch (err) {
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Failed to update profile');
    } finally {
      setSaveLoading(false);
    }
  }, [fullName, address, areaId, dealerId]);

  if (step === 'auth') {
    return (
      <div className={styles.container}>
        <div className="card" style={{ width: '100%', maxWidth: '480px' }}>
          <Link href="/login" className={styles.backLink}>
            <ArrowLeft size={18} style={{ marginRight: '4px' }} />
            Back to Login
          </Link>

          <div className={styles.header}>
            <h2 className={styles.title}>Verify Identity</h2>
            <p className={`${styles.subtitle} text-muted`}>Enter your credentials to access profile settings.</p>
          </div>

          <hr className={styles.divider} />

          <form onSubmit={handleAuth}>
            <div className={styles.formGroup}>
              <label className="label">FPS ID</label>
              <input type="text" className={styles.input} placeholder="Your FPS ID" value={authFpsId} onChange={e => setAuthFpsId(e.target.value)} disabled={authLoading} />
            </div>
            <div className={styles.formGroup} style={{ marginTop: '16px' }}>
              <label className="label">Password</label>
              <input type="password" className={styles.input} placeholder="Your password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} disabled={authLoading} />
            </div>
            <button type="submit" className={styles.saveBtn} disabled={authLoading} style={{ width: '100%', marginTop: '24px' }}>
              {authLoading ? <Loader2 size={18} className="spin" /> : <Lock size={18} />}
              {authLoading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '540px' }}>
        <button type="button" onClick={() => setStep('auth')} className={styles.backLink} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0, color: 'var(--primary-navy)' }}>
          <ArrowLeft size={18} style={{ marginRight: '4px' }} />
          Back
        </button>

        <div className={styles.header}>
          <h2 className={styles.title}>Change Profile Info</h2>
          <p className={`${styles.subtitle} text-muted`}>Update your shop and personal details.</p>
        </div>

        <hr className={styles.divider} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--surface-gray)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <UserCircle size={40} />
          </div>
          <div>
            <span style={{ fontWeight: 600, fontSize: '16px' }}>{fullName}</span>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>FPS ID: {fpsId}</p>
          </div>
        </div>

        <form className={styles.formGrid} onSubmit={handleSave}>
          <h3 className={styles.sectionTitle}>Shop Information</h3>

          <div className={styles.formGroup}>
            <label className="label">FPS ID (Read Only)</label>
            <input type="text" className={`${styles.input} ${styles.inputReadOnly}`} value={fpsId} readOnly />
          </div>

          <div className={styles.formGroup}>
            <label className="label">Area ID</label>
            <input type="text" className={styles.input} value={areaId} onChange={e => setAreaId(e.target.value)} disabled={saveLoading} />
          </div>

          <div className={styles.formGroup}>
            <label className="label">Shop Address</label>
            <input type="text" className={styles.input} value={address} onChange={e => setAddress(e.target.value)} disabled={saveLoading} />
          </div>

          <h3 className={styles.sectionTitle}>Personal Information</h3>

          <div className={styles.formGroup}>
            <label className="label">Full Name</label>
            <input type="text" className={styles.input} value={fullName} onChange={e => setFullName(e.target.value)} disabled={saveLoading} />
          </div>

          <div className={styles.formGroup}>
            <label className="label">Mobile Number</label>
            <input type="tel" className={styles.input} value={mobile} onChange={e => setMobile(e.target.value)} disabled={saveLoading} />
          </div>

          <div className={styles.actions}>
            <Link href="/login" style={{ flex: 1, display: 'flex' }}>
              <button type="button" className={styles.cancelBtn} disabled={saveLoading}>Cancel</button>
            </Link>
            <button type="submit" className={styles.saveBtn} disabled={saveLoading}>
              {saveLoading ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
              {saveLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
