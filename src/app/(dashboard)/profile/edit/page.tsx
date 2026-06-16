'use client';

import { Save, UserCircle } from 'lucide-react';
import styles from './Profile.module.css';

export default function EditProfilePage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Edit Profile</h2>
          <p className={styles.subtitle}>Update your shop details and personal information.</p>
        </div>
      </header>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
            <div style={{ width: '80px', height: '80px', backgroundColor: 'var(--surface-gray)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <UserCircle size={48} />
            </div>
            <div>
                <button className="btn" style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', color: 'var(--text-dark)', padding: '8px 16px', fontSize: '13px', height: 'auto' }}>
                    Upload New Photo
                </button>
            </div>
        </div>

        <form className={styles.formGrid}>
          <h3 className={styles.sectionTitle}>Shop Information</h3>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>FPS ID (Read Only)</label>
            <input type="text" className={`${styles.input} ${styles.inputReadOnly}`} value="FS-9982-KA" readOnly />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Area ID</label>
            <input type="text" className={styles.input} defaultValue="KA-01-North" />
          </div>

          <div className={`${styles.formGroup} ${styles.fullWidth}`}>
            <label className={styles.label}>Shop Address</label>
            <input type="text" className={styles.input} defaultValue="12, Main Road, Near Gram Panchayat" />
          </div>

          <h3 className={styles.sectionTitle} style={{ marginTop: '16px' }}>Personal Information</h3>

          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input type="text" className={styles.input} defaultValue="Ramesh Patel" />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.label}>Mobile Number</label>
            <input type="tel" className={styles.input} defaultValue="+91 9876543210" />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn}>Cancel</button>
            <button type="submit" className={styles.saveBtn}>
              <Save size={18} />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
