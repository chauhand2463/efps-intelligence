import { Activity, Cpu, Users, Package, RefreshCw, ChevronRight } from 'lucide-react';
import styles from './Operational.module.css';

export default function OperationalDashboardPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Operational Dashboard</h2>
          <p className={styles.subtitle}>Real-time monitoring of FPS devices and transactions.</p>
        </div>
        <button className="btn" style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', color: 'var(--primary-navy)' }}>
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          Refresh Data
        </button>
      </header>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Active Devices</span>
            <div className={styles.metricIcon}><Cpu size={20} /></div>
          </div>
          <p className={styles.metricValue}>3 / 4</p>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Daily Transactions</span>
            <div className={styles.metricIcon}><Activity size={20} /></div>
          </div>
          <p className={styles.metricValue}>142</p>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Citizens Served</span>
            <div className={styles.metricIcon}><Users size={20} /></div>
          </div>
          <p className={styles.metricValue}>89</p>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Stock Sync Status</span>
            <div className={styles.metricIcon}><Package size={20} /></div>
          </div>
          <p className={styles.metricValue} style={{ color: 'var(--online-green)' }}>Synced</p>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className="card">
          <h3 className={styles.sectionTitle}>Device Status</h3>
          <div className={styles.deviceList}>
            <div className={styles.deviceItem}>
              <div className={styles.deviceInfo}>
                <Cpu size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.deviceName}>Main PoS Terminal</div>
                  <div className={styles.deviceMeta}>ID: POS-8291 • Last ping: 2 mins ago</div>
                </div>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusOnline}`}>Online</span>
            </div>
            
            <div className={styles.deviceItem}>
              <div className={styles.deviceInfo}>
                <Cpu size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.deviceName}>Weighing Scale Integration</div>
                  <div className={styles.deviceMeta}>ID: WSC-1102 • Last ping: 5 mins ago</div>
                </div>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusOnline}`}>Online</span>
            </div>
            
            <div className={styles.deviceItem}>
              <div className={styles.deviceInfo}>
                <Cpu size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.deviceName}>Iris Scanner</div>
                  <div className={styles.deviceMeta}>ID: IRS-4432 • Last ping: 1 min ago</div>
                </div>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusOnline}`}>Online</span>
            </div>
            
            <div className={styles.deviceItem}>
              <div className={styles.deviceInfo}>
                <Cpu size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.deviceName}>Fingerprint Scanner 2</div>
                  <div className={styles.deviceMeta}>ID: FPR-0091 • Last ping: 2 hours ago</div>
                </div>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusOffline}`}>Offline</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <h3 className={styles.sectionTitle} style={{ borderBottom: 'none', margin: 0, paddingBottom: 0 }}>Recent Transactions</h3>
            <button style={{ background: 'none', border: 'none', color: 'var(--accent-amber)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                View All <ChevronRight size={14} />
            </button>
          </div>
          
          <div className={styles.transactionList}>
            <div className={styles.transactionItem}>
              <div className={styles.txDetails}>
                <span className={styles.txName}>Aadhar Auth - Wheat</span>
                <span className={styles.txTime}>10:42 AM • TXN-99821</span>
              </div>
              <span className={styles.txAmount}>15 kg</span>
            </div>
            <div className={styles.transactionItem}>
              <div className={styles.txDetails}>
                <span className={styles.txName}>Aadhar Auth - Rice</span>
                <span className={styles.txTime}>10:35 AM • TXN-99820</span>
              </div>
              <span className={styles.txAmount}>5 kg</span>
            </div>
            <div className={styles.transactionItem}>
              <div className={styles.txDetails}>
                <span className={styles.txName}>OTP Auth - Sugar</span>
                <span className={styles.txTime}>10:15 AM • TXN-99819</span>
              </div>
              <span className={styles.txAmount}>2 kg</span>
            </div>
            <div className={styles.transactionItem}>
              <div className={styles.txDetails}>
                <span className={styles.txName}>Aadhar Auth - Wheat</span>
                <span className={styles.txTime}>09:50 AM • TXN-99818</span>
              </div>
              <span className={styles.txAmount}>20 kg</span>
            </div>
            <div className={styles.transactionItem}>
              <div className={styles.txDetails}>
                <span className={styles.txName}>Iris Auth - Rice</span>
                <span className={styles.txTime}>09:30 AM • TXN-99817</span>
              </div>
              <span className={styles.txAmount}>10 kg</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
