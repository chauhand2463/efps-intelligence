'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { ArrowLeft, Search, CheckCircle, XCircle, User, MapPin, Building, Lock, UserPlus, Loader2, Globe, ChevronDown, Check, Shield } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import { AuthCard } from '@/components/auth/AuthCard';
import { ProgressStepper } from '@/components/auth/ProgressStepper';
import { SubmitButton } from '@/components/auth/SubmitButton';
import styles from './Register.module.css';

interface LookupResult {
  exists: boolean;
  dealer: { fps_id: string; full_name: string } | null;
}

const STEPS = [
  { label: 'Verify' },
  { label: 'Details' },
  { label: 'Profile' },
  { label: 'Sync' },
  { label: 'Password' },
];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  const [fpsId, setFpsId] = useState('');
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'notfound'>('idle');
  const [lookupName, setLookupName] = useState('');

  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [taluka, setTaluka] = useState('');
  const [areaId, setAreaId] = useState('');

  const [enableSync, setEnableSync] = useState(false);
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
        toast.success('FPS ID verified!');
      } else {
        setLookupState('notfound');
        toast('FPS ID not found — you can fill in details manually.', { icon: 'ℹ️' });
      }
    } catch (err) {
      setLookupState('idle');
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Lookup failed');
    }
  }

  function canProceedFromStep(current: number): boolean {
    switch (current) {
      case 0: return lookupState === 'found' || lookupState === 'notfound';
      case 1: return !!areaId.trim();
      case 2: return !!fullName.trim() && !!mobile.trim() && /^\d{10}$/.test(mobile.trim());
      case 3: return !enableSync || (!!efpsUsername.trim() && !!efpsPassword.trim());
      case 4: return password.length >= 8 && password === confirmPassword && agree;
      default: return true;
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
        area_id: areaId.trim() || undefined,
        efps_username: enableSync ? (efpsUsername.trim() || undefined) : undefined,
        efps_password: enableSync ? (efpsPassword.trim() || undefined) : undefined,
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
    <AuthCard maxWidth={520}>
      <Link href="/login" className={styles.backLink}>
        <ArrowLeft size={16} />
        Back to Login
      </Link>

      <div style={{ marginBottom: 8 }}>
        <h1 className={styles.title}>Create new account</h1>
        <p className={styles.subtitle}>Register your FPS shop to access the dashboard</p>
      </div>

      <ProgressStepper steps={STEPS} currentStep={step} />

      <form onSubmit={handleSubmit}>
        {step === 0 && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>FPS ID / Primary Shop Number</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '12px 40px 12px 14px',
                      height: 48,
                      fontSize: 14,
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      border: `1px solid ${lookupState === 'found' ? '#10B981' : lookupState === 'notfound' ? '#EF4444' : '#D0D5DD'}`,
                      borderRadius: 14,
                      outline: 'none',
                      fontFamily: 'inherit',
                      transition: 'border-color 0.15s ease',
                    }}
                    placeholder="Enter FPS ID"
                    value={fpsId}
                    onChange={e => { setFpsId(e.target.value); setLookupState('idle'); }}
                    disabled={submitting}
                  />
                  {lookupState === 'found' && (
                    <CheckCircle size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#10B981' }} />
                  )}
                  {lookupState === 'notfound' && (
                    <XCircle size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#EF4444' }} />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={lookupState === 'loading' || submitting}
                  style={{
                    height: 48,
                    padding: '0 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    border: 'none',
                    borderRadius: 14,
                    backgroundColor: '#0F172A',
                    color: 'white',
                    cursor: lookupState === 'loading' || submitting ? 'not-allowed' : 'pointer',
                    opacity: lookupState === 'loading' || submitting ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {lookupState === 'loading' ? <Loader2 size={18} className="spin" /> : <Search size={18} />}
                  Verify
                </button>
              </div>
              {lookupState === 'found' && (
                <p style={{ margin: '8px 0 0 0', fontSize: 12, color: '#10B981', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Shield size={14} />
                  Verified as <strong>{lookupName}</strong>
                </p>
              )}
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                type="button"
                onClick={() => canProceedFromStep(0) && setStep(1)}
                disabled={!canProceedFromStep(0)}
                style={{
                  width: '100%',
                  height: 48,
                  fontSize: 15,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  border: 'none',
                  borderRadius: 14,
                  backgroundColor: canProceedFromStep(0) ? '#0F172A' : '#E6E8EB',
                  color: canProceedFromStep(0) ? 'white' : '#94A3B8',
                  cursor: canProceedFromStep(0) ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => { if (canProceedFromStep(0)) e.currentTarget.style.backgroundColor = '#1E293B'; }}
                onMouseLeave={e => { if (canProceedFromStep(0)) e.currentTarget.style.backgroundColor = '#0F172A'; }}
              >
                Continue
                <ChevronDown size={18} style={{ transform: 'rotate(-90deg)' }} />
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>
                <Building size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Area ID
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  height: 48,
                  fontSize: 14,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D0D5DD',
                  borderRadius: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                placeholder="Enter Area ID"
                value={areaId}
                onChange={e => setAreaId(e.target.value)}
                disabled={submitting}
                onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                style={{
                  flex: 1,
                  height: 48,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  border: '1px solid #D0D5DD',
                  borderRadius: 14,
                  backgroundColor: 'white',
                  color: '#0F172A',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => canProceedFromStep(1) && setStep(2)}
                disabled={!canProceedFromStep(1)}
                style={{
                  flex: 1,
                  height: 48,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  border: 'none',
                  borderRadius: 14,
                  backgroundColor: canProceedFromStep(1) ? '#0F172A' : '#E6E8EB',
                  color: canProceedFromStep(1) ? 'white' : '#94A3B8',
                  cursor: canProceedFromStep(1) ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => { if (canProceedFromStep(1)) e.currentTarget.style.backgroundColor = '#1E293B'; }}
                onMouseLeave={e => { if (canProceedFromStep(1)) e.currentTarget.style.backgroundColor = '#0F172A'; }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 44px',
                    height: 48,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D5DD',
                    borderRadius: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Enter full name"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  disabled={submitting}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>Mobile Number</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', fontWeight: 500, fontSize: 14, zIndex: 1 }}>+91</span>
                <input
                  type="tel"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 48px',
                    height: 48,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D5DD',
                    borderRadius: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  placeholder="10-digit mobile number"
                  value={mobile}
                  onChange={e => setMobile(e.target.value)}
                  disabled={submitting}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>
                <MapPin size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Address
                <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 6 }}>(optional)</span>
              </label>
              <input
                type="text"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  height: 48,
                  fontSize: 14,
                  color: '#0F172A',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #D0D5DD',
                  borderRadius: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                placeholder="Village / City / Address"
                value={address}
                onChange={e => setAddress(e.target.value)}
                disabled={submitting}
                onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>
                  District
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 4 }}>(opt)</span>
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    height: 48,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D5DD',
                    borderRadius: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  placeholder="District"
                  value={district}
                  onChange={e => setDistrict(e.target.value)}
                  disabled={submitting}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>
                  Taluka
                  <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 400, marginLeft: 4 }}>(opt)</span>
                </label>
                <input
                  type="text"
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    height: 48,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D5DD',
                    borderRadius: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Taluka"
                  value={taluka}
                  onChange={e => setTaluka(e.target.value)}
                  disabled={submitting}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  height: 48,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  border: '1px solid #D0D5DD',
                  borderRadius: 14,
                  backgroundColor: 'white',
                  color: '#0F172A',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => canProceedFromStep(2) && setStep(3)}
                disabled={!canProceedFromStep(2)}
                style={{
                  flex: 1,
                  height: 48,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  border: 'none',
                  borderRadius: 14,
                  backgroundColor: canProceedFromStep(2) ? '#0F172A' : '#E6E8EB',
                  color: canProceedFromStep(2) ? 'white' : '#94A3B8',
                  cursor: canProceedFromStep(2) ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => { if (canProceedFromStep(2)) e.currentTarget.style.backgroundColor = '#1E293B'; }}
                onMouseLeave={e => { if (canProceedFromStep(2)) e.currentTarget.style.backgroundColor = '#0F172A'; }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div
              onClick={() => setEnableSync(!enableSync)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                border: `1px solid ${enableSync ? '#2563EB' : '#D0D5DD'}`,
                borderRadius: 14,
                cursor: 'pointer',
                marginBottom: enableSync ? 20 : 0,
                transition: 'border-color 0.15s ease',
                userSelect: 'none',
                backgroundColor: enableSync ? 'rgba(37,99,235,0.02)' : 'white',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Globe size={20} style={{ color: enableSync ? '#2563EB' : '#94A3B8' }} />
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#0F172A' }}>Government eFPS Sync</p>
                  <p style={{ margin: '2px 0 0 0', fontSize: 12, color: '#64748B' }}>Auto-sync beneficiary data from government portal</p>
                </div>
              </div>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `2px solid ${enableSync ? '#2563EB' : '#D0D5DD'}`,
                  backgroundColor: enableSync ? '#2563EB' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                {enableSync && <Check size={14} color="white" strokeWidth={3} />}
              </div>
            </div>

            {enableSync && (
              <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                <div style={{ marginBottom: 16, marginTop: 4 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>eFPS Username</label>
                  <input
                    type="text"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      height: 48,
                      fontSize: 14,
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D0D5DD',
                      borderRadius: 14,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    placeholder="eFPS portal username"
                    value={efpsUsername}
                    onChange={e => setEfpsUsername(e.target.value)}
                    disabled={submitting}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>eFPS Password</label>
                  <input
                    type="password"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      height: 48,
                      fontSize: 14,
                      color: '#0F172A',
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #D0D5DD',
                      borderRadius: 14,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                    placeholder="eFPS portal password"
                    value={efpsPassword}
                    onChange={e => setEfpsPassword(e.target.value)}
                    disabled={submitting}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setStep(2)}
                style={{
                  flex: 1,
                  height: 48,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  border: '1px solid #D0D5DD',
                  borderRadius: 14,
                  backgroundColor: 'white',
                  color: '#0F172A',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => canProceedFromStep(3) && setStep(4)}
                disabled={!canProceedFromStep(3)}
                style={{
                  flex: 1,
                  height: 48,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  border: 'none',
                  borderRadius: 14,
                  backgroundColor: canProceedFromStep(3) ? '#0F172A' : '#E6E8EB',
                  color: canProceedFromStep(3) ? 'white' : '#94A3B8',
                  cursor: canProceedFromStep(3) ? 'pointer' : 'not-allowed',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => { if (canProceedFromStep(3)) e.currentTarget.style.backgroundColor = '#1E293B'; }}
                onMouseLeave={e => { if (canProceedFromStep(3)) e.currentTarget.style.backgroundColor = '#0F172A'; }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>Create Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <input
                  type="password"
                  style={{
                    width: '100%',
                    padding: '12px 16px 12px 44px',
                    height: 48,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #D0D5DD',
                    borderRadius: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Min 8 chars, upper + lower + number"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={submitting}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>
              {password && <PasswordStrength password={password} />}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', marginBottom: 6, display: 'block' }}>Confirm Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
                <input
                  type="password"
                  style={{
                    width: '100%',
                    padding: '12px 44px 12px 44px',
                    height: 48,
                    fontSize: 14,
                    color: '#0F172A',
                    backgroundColor: '#FFFFFF',
                    border: `1px solid ${confirmPassword && password === confirmPassword ? '#10B981' : '#D0D5DD'}`,
                    borderRadius: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                  }}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  disabled={submitting}
                  onFocus={e => { e.currentTarget.style.borderColor = confirmPassword && password === confirmPassword ? '#10B981' : '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.12)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = confirmPassword && password === confirmPassword ? '#10B981' : '#D0D5DD'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                {confirmPassword && password === confirmPassword && (
                  <CheckCircle size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#10B981' }} />
                )}
              </div>
              {confirmPassword && password !== confirmPassword && (
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: '#EF4444' }}>Passwords do not match</p>
              )}
            </div>

            <div
              onClick={() => setAgree(!agree)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
                cursor: 'pointer',
                marginBottom: 20,
                padding: 4,
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 6,
                  border: `2px solid ${agree ? '#2563EB' : '#D0D5DD'}`,
                  backgroundColor: agree ? '#2563EB' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: 1,
                  transition: 'all 0.15s ease',
                }}
              >
                {agree && <Check size={14} color="white" strokeWidth={3} />}
              </div>
              <span style={{ fontSize: 13, color: '#0F172A', lineHeight: 1.5 }}>
                I confirm that the above details are correct and I agree to the{' '}
                <a href="#" style={{ color: '#2563EB', textDecoration: 'none', fontWeight: 600 }} onClick={e => e.stopPropagation()}>
                  Terms & Conditions
                </a>
                .
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <button
                type="button"
                onClick={() => setStep(3)}
                style={{
                  flex: 1,
                  height: 48,
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: 'inherit',
                  border: '1px solid #D0D5DD',
                  borderRadius: 14,
                  backgroundColor: 'white',
                  color: '#0F172A',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F9FA'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'white'}
              >
                Back
              </button>
              <SubmitButton loading={submitting} loadingText="Creating Account...">
                <UserPlus size={18} />
                Create Account
              </SubmitButton>
            </div>
          </div>
        )}
      </form>

      <p className={styles.footerText}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#0F172A', fontWeight: 600, textDecoration: 'none' }}>Login here</Link>
      </p>
    </AuthCard>
  );
}

function PasswordStrength({ password }: { password: string }) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const segments = [1, 2, 3, 4, 5];
  const getColor = (i: number) => {
    if (i > score) return '#E6E8EB';
    if (score <= 1) return '#EF4444';
    if (score <= 2) return '#F97316';
    if (score <= 3) return '#F59E0B';
    return '#10B981';
  };

  const labels = ['Weak', 'Fair', 'Good', 'Strong', 'Very strong'];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {segments.map(i => (
          <div key={i} style={{ height: 4, flex: 1, borderRadius: 2, backgroundColor: getColor(i), transition: 'background-color 0.2s ease' }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: getColor(score), fontWeight: 500, whiteSpace: 'nowrap' }}>
        {labels[Math.min(score, 4)]}
      </span>
    </div>
  );
}
