'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  User, CheckSquare, Bell, Settings, ChevronDown, 
  Star, Users, ShieldAlert, Calendar, Save, FileText 
} from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Profile.module.css';
import { api, ApiRequestError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { DealerDto } from '@/lib/types';

export default function FpsProfileDashboardPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [shopName, setShopName] = useState('');
  const [address, setAddress] = useState('');
  const [fpsuId, setFpsuId] = useState('');
  const [areaId, setAreaId] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [aadhaar, setAadhaar] = useState('XXXX-XXXX-8821');
  const [panNumber, setPanNumber] = useState('ABCDE1234F');
  const [licenseValidity, setLicenseValidity] = useState('2028-03-31');
  const [aayCards, setAayCards] = useState(0);
  const [phhCards, setPhhCards] = useState(0);

  const initialRef = useRef<Record<string, string>>({
    shopName: '', address: '', areaId: '', mobileNumber: '', fpsuId: '',
  });

  // Formatting date for display: YYYY-MM-DD to DD-MAR-YYYY style
  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '31-MAR-2028';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${day}-${months[monthIndex] || 'MAR'}-${year}`;
  };

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<DealerDto>('/auth/me');
        setShopName(data.full_name);
        setAddress(data.address ?? '');
        setFpsuId(data.fps_id);
        setAreaId(data.area_id ?? '');
        setMobileNumber(data.mobile);

        initialRef.current = {
          shopName: data.full_name,
          address: data.address ?? '',
          areaId: data.area_id ?? '',
          mobileNumber: data.mobile,
          fpsuId: data.fps_id,
        };

        if (user?.id) {
          try {
            const stats = await api.get<{ aay_cards: number; phh_cards: number }>(`/dealers/${user.id}/stats`);
            setAayCards(stats.aay_cards ?? 0);
            setPhhCards(stats.phh_cards ?? 0);
          } catch { /* stats optional */ }
        }
      } catch (err) {
        if (err instanceof ApiRequestError) toast.error(err.message);
        else toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    })();
  }, [user?.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await api.patch(`/dealers/${user.id}`, {
        full_name: shopName,
        address,
        area_id: areaId,
      });
      toast.success('FPS Profile updated successfully!');
    } catch (err) {
      if (err instanceof ApiRequestError) toast.error(err.message);
      else toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset changes?')) {
      const init = initialRef.current;
      setShopName(init.shopName);
      setAddress(init.address);
      setAreaId(init.areaId);
      setMobileNumber(init.mobileNumber);
    }
  };

  // Compute Total Active Cards
  const totalCards = aayCards + phhCards;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.mainCard} style={{ textAlign: 'center', padding: '48px' }}>
          Loading profile...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Top Header Bar */}
      <header className={styles.topHeaderBar}>
        <div className={styles.topLeftBlock}>
          <div className={styles.topLogoText}>
            <FileText className={styles.topLogoIcon} size={20} />
            <span>eFPS Master</span>
          </div>
        </div>

        <div className={styles.topRightBlock}>
          <button className={styles.iconButton} aria-label="Notifications">
            <Bell size={18} />
            <span className={styles.notificationBadge}></span>
          </button>

          <button className={styles.iconButton} aria-label="Settings">
            <Settings size={18} />
          </button>

          <div className={styles.profileInfo}>
            <div className={styles.profileText}>
              <span className={styles.profileName}>A.D. Chauhan</span>
              <span className={styles.profileRole}>ID: 3617</span>
            </div>
            <div className={styles.avatarContainer}>
              <div style={{ backgroundColor: 'var(--primary-navy)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                AD
              </div>
            </div>
            <ChevronDown className={styles.chevronIcon} size={16} />
          </div>
        </div>
      </header>

      {/* Page Title Block */}
      <div className={styles.pageHeader}>
        <div className={styles.headerIconBox}>
          <User size={24} />
        </div>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>FPS Profile</h1>
          <p className={styles.pageSubtitle}>Shop Dealer Information &amp; Verification Portal</p>
        </div>
      </div>

      {/* Main Container Card */}
      <div className={styles.mainCard}>
        {/* Section 1: Static display panel */}
        <div className={styles.staticInfoGrid}>
          <div className={styles.staticField}>
            <span className={styles.infoLabel}>FPSU ID</span>
            <span className={styles.infoValue}>{fpsuId}</span>
          </div>

          <div className={styles.staticField}>
            <span className={styles.infoLabel}>Shop Name</span>
            <span className={styles.infoValue}>{shopName}</span>
          </div>

          <div className={styles.staticFieldFullWidth}>
            <span className={styles.infoLabel}>Registered Address</span>
            <span className={styles.infoValue}>{address}</span>
          </div>

          <div className={styles.staticField}>
            <span className={styles.infoLabel}>Area ID</span>
            <span className={styles.infoValue}>{areaId}</span>
          </div>

          <div className={styles.staticField}>
            <span className={styles.infoLabel}>Mobile Number</span>
            <span className={styles.infoValue}>{mobileNumber}</span>
          </div>

          <div className={styles.staticField}>
            <span className={styles.infoLabel}>UID / Aadhaar</span>
            <span className={styles.infoValue}>{aadhaar}</span>
          </div>

          <div className={styles.staticField}>
            <span className={styles.infoLabel}>PAN Number</span>
            <span className={styles.infoValue}>{panNumber}</span>
          </div>

          <div className={styles.staticField}>
            <span className={styles.infoLabel}>License Validity</span>
            <span className={styles.infoValue}>{formatDisplayDate(licenseValidity)}</span>
          </div>
        </div>

        {/* Section 2: Metric Cards Row */}
        <div className={styles.metricsRow}>
          {/* Card 1: Purple background */}
          <div className={styles.metricCardPurple}>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>AAY Cards</span>
              <span className={styles.metricValue}>{aayCards}</span>
            </div>
            <div className={styles.metricIconCircle}>
              <Star size={20} fill="white" />
            </div>
          </div>

          {/* Card 2: Green background */}
          <div className={styles.metricCardGreen}>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>PHH Cards</span>
              <span className={styles.metricValue}>{phhCards}</span>
            </div>
            <div className={styles.metricIconCircle}>
              <Users size={20} />
            </div>
          </div>

          {/* Card 3: White background / Orange dashed border */}
          <div className={styles.metricCardActive}>
            <div className={styles.metricContent}>
              <span className={styles.metricLabelOrange}>Total Active Cards</span>
              <span className={styles.metricValue}>{totalCards}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Editable Form */}
        <form className={styles.formBlock} onSubmit={handleSave}>
          <div className={styles.formHeader}>
            <CheckSquare className={styles.formHeaderIcon} size={20} />
            <h2 className={styles.formTitle}>Enter / Update Profile Information</h2>
          </div>

          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className="label">Shop Name</label>
              <input 
                type="text" 
                className={styles.input} 
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">Registered Address</label>
              <input 
                type="text" 
                className={styles.input} 
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">FPSU ID (System Locked)</label>
              <input 
                type="text" 
                className={`${styles.input} ${styles.inputReadOnly}`} 
                value={fpsuId}
                readOnly
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">Area ID</label>
              <input 
                type="text" 
                className={styles.input} 
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">Mobile Number</label>
              <input 
                type="text" 
                className={styles.input} 
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">UID / Aadhaar Card Number</label>
              <input 
                type="text" 
                className={styles.input} 
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">License Validity</label>
              <input 
                type="date" 
                className={styles.input} 
                value={licenseValidity}
                onChange={(e) => setLicenseValidity(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">PAN Number</label>
              <input 
                type="text" 
                className={styles.input} 
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value)}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">AAY Cards Count</label>
              <input 
                type="number" 
                className={styles.input} 
                value={aayCards}
                onChange={(e) => setAayCards(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>

            <div className={styles.formGroup}>
              <label className="label">PHH Cards Count</label>
              <input 
                type="number" 
                className={styles.input} 
                value={phhCards}
                onChange={(e) => setPhhCards(Math.max(0, parseInt(e.target.value, 10) || 0))}
              />
            </div>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={handleReset}>
              Cancel Changes
            </button>
            <button type="submit" className={styles.saveBtn} disabled={saving}>
              <Save size={18} />
              {saving ? 'Saving...' : 'Save Profile Data'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
