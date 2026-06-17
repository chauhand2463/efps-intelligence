'use client';

import { useState, useCallback, type FormEvent } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Save, UserCircle, ArrowLeft, Lock, Loader2 } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import type { DealerDto } from '@/lib/types';
import { AuthCard } from '@/components/auth/AuthCard';
import { SubmitButton } from '@/components/auth/SubmitButton';
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
      <AuthCard maxWidth={480}>
        <Link href="/login" className={styles.backLink}>
          <ArrowLeft size={16} />
          Back to Login
        </Link>

        <div className={styles.header}>
          <h1 className={styles.title}>Verify identity</h1>
          <p className={styles.subtitle}>Enter your credentials to access profile settings</p>
        </div>

        <form onSubmit={handleAuth}>
          <div className={styles.formGroup}>
            <label className={styles.label} htmlFor="authFpsId">FPS ID</label>
            <input
              id="authFpsId"
              type="text"
              className={styles.input}
              placeholder="Your FPS ID"
              value={authFpsId}
              onChange={e => setAuthFpsId(e.target.value)}
              disabled={authLoading}
            />
          </div>
          <div className={styles.formGroup} style={{ marginTop: 16 }}>
            <label className={styles.label} htmlFor="authPassword">Password</label>
            <input
              id="authPassword"
              type="password"
              className={styles.input}
              placeholder="Your password"
              value={authPassword}
              onChange={e => setAuthPassword(e.target.value)}
              disabled={authLoading}
            />
          </div>
          <div style={{ marginTop: 24 }}>
            <SubmitButton loading={authLoading} loadingText="Verifying...">
              <Lock size={18} />
              Verify & Continue
            </SubmitButton>
          </div>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard maxWidth={520}>
      <button type="button" onClick={() => setStep('auth')} className={styles.backLink}>
        <ArrowLeft size={16} />
        Back
      </button>

      <div className={styles.header}>
        <h1 className={styles.title}>Edit profile</h1>
        <p className={styles.subtitle}>Update your shop and personal details</p>
      </div>

      <div className={styles.userCard}>
        <div className={styles.userAvatar}>
          <UserCircle size={28} />
        </div>
        <div className={styles.userInfo}>
          <p className={styles.userName}>{fullName}</p>
          <p className={styles.userId}>FPS ID: {fpsId} &middot; {mobile}</p>
        </div>
      </div>

      <form className={styles.formGrid} onSubmit={handleSave}>
        <h2 className={styles.sectionTitle}>Shop information</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>FPS ID</label>
          <input type="text" className={`${styles.input} ${styles.inputReadOnly}`} value={fpsId} readOnly />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Area ID</label>
          <input type="text" className={styles.input} placeholder="Enter Area ID" value={areaId} onChange={e => setAreaId(e.target.value)} disabled={saveLoading} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Address</label>
          <input type="text" className={styles.input} placeholder="Shop address" value={address} onChange={e => setAddress(e.target.value)} disabled={saveLoading} />
        </div>

        <h2 className={styles.sectionTitle} style={{ marginTop: 8 }}>Personal information</h2>

        <div className={styles.formGroup}>
          <label className={styles.label}>Full Name</label>
          <input type="text" className={styles.input} placeholder="Your full name" value={fullName} onChange={e => setFullName(e.target.value)} disabled={saveLoading} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Mobile Number</label>
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
    </AuthCard>
  );
}
