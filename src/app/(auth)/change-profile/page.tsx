'use client';

import { useState } from 'react';
import useRouter from 'next/navigation';
import Link from 'next/link';
import { Save, UserCircle, ArrowLeft } from 'lucide-react';
import styles from './ChangeProfile.module.css';

export default function ChangeProfilePage() {
  const [fpsId] = useState('FS-9982-KA');
  const [areaId, setAreaId] = useState('KA-01-North');
  const [address, setAddress] = useState('12, Main Road, Near Gram Panchayat');
  const [fullName, setFullName] = useState('Ramesh Patel');
  const [mobile, setMobile] = useState('+91 9876543210');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Profile information updated successfully!');
    // Redirect to login page
    window.location.href = '/login';
  };

  return (
    <div className={styles.container}>
      <div className="card" style={{ width: '100%', maxWidth: '540px' }}>
        <div className={styles.header}>
          <h2 className={styles.title}>Change Profile Info</h2>
          <p className={`${styles.subtitle} text-muted`}>Update details before signing into dashboard</p>
        </div>
        
        <hr className={styles.divider} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', backgroundColor: 'var(--surface-gray)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            <UserCircle size={40} />
          </div>
          <div>
            <button className="btn" style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', color: 'var(--text-dark)', padding: '6px 12px', fontSize: '13px', height: 'auto' }}>
              Upload Photo
            </button>
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
            <input 
              type="text" 
              className={styles.input} 
              value={areaId} 
              onChange={(e) => setAreaId(e.target.value)} 
            />
          </div>

          <div className={styles.formGroup}>
            <label className="label">Shop Address</label>
            <input 
              type="text" 
              className={styles.input} 
              value={address} 
              onChange={(e) => setAddress(e.target.value)} 
            />
          </div>

          <h3 className={styles.sectionTitle}>Personal Information</h3>

          <div className={styles.formGroup}>
            <label className="label">Full Name</label>
            <input 
              type="text" 
              className={styles.input} 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className="label">Mobile Number</label>
            <input 
              type="tel" 
              className={styles.input} 
              value={mobile} 
              onChange={(e) => setMobile(e.target.value)} 
            />
          </div>

          <div className={styles.actions}>
            <Link href="/login" style={{ flex: 1, display: 'flex' }}>
              <button type="button" className={styles.cancelBtn}>
                Cancel
              </button>
            </Link>
            <button type="submit" className={styles.saveBtn}>
              <Save size={16} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
