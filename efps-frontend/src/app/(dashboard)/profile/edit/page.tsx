'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  User, CheckSquare, Star, Users, Save, FileText 
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
  const [aayCards, setAayCards] = useState(0);
  const [phhCards, setPhhCards] = useState(0);

  const initialRef = useRef<Record<string, string>>({
    shopName: '', address: '', areaId: '', mobileNumber: '', fpsuId: '',
  });

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
        mobile: mobileNumber,
      });
      toast.success('Profile updated successfully!');
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
      <header className={styles.topHeaderBar}>
        <div className={styles.topLeftBlock}>
          <div className={styles.topLogoText}>
            <FileText className={styles.topLogoIcon} size={20} />
            <span>eFPS Master</span>
          </div>
        </div>

        <div className={styles.topRightBlock}>
          <div className={styles.profileInfo}>
            <div className={styles.profileText}>
              <span className={styles.profileName}>{shopName || 'Dealer'}</span>
              <span className={styles.profileRole}>ID: {fpsuId}</span>
            </div>
            <div className={styles.avatarContainer}>
              <div style={{ backgroundColor: 'var(--primary-navy)', color: 'white', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>
                {shopName ? shopName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'FP'}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.pageHeader}>
        <div className={styles.headerIconBox}>
          <User size={24} />
        </div>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>FPS Profile</h1>
          <p className={styles.pageSubtitle}>Shop Dealer Information &amp; Verification Portal</p>
        </div>
      </div>

      <div className={styles.mainCard}>
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
        </div>

        <div className={styles.metricsRow}>
          <div className={styles.metricCardPurple}>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>AAY Cards</span>
              <span className={styles.metricValue}>{aayCards}</span>
            </div>
            <div className={styles.metricIconCircle}>
              <Star size={20} fill="white" />
            </div>
          </div>

          <div className={styles.metricCardGreen}>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>PHH Cards</span>
              <span className={styles.metricValue}>{phhCards}</span>
            </div>
            <div className={styles.metricIconCircle}>
              <Users size={20} />
            </div>
          </div>

          <div className={styles.metricCardActive}>
            <div className={styles.metricContent}>
              <span className={styles.metricLabelOrange}>Total Active Cards</span>
              <span className={styles.metricValue}>{totalCards}</span>
            </div>
          </div>
        </div>

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
