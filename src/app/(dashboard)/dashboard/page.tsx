import OperationalDashboardPage from '../operational-dashboard/page';
import MonthlySalesReportPage from '../monthly-sales-report/page';
import styles from './Dashboard.module.css';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '40px' }}>
      {/* 1. Operational Dashboard */}
      <section>
        <OperationalDashboardPage />
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

      {/* 2. Compliance Dashboard (Original Dashboard logic) */}
      <section>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Compliance Dashboard</h2>
            <p className="text-muted">Manage and audit your monthly FPS distributions and stock balances.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.exportBtn}>EXPORT PDF</button>
            <button>+ NEW RECORD</button>
          </div>
        </header>
        
        <div className={styles.grid}>
          {/* Main Column */}
          <div className={styles.mainCol}>
            <div className="card">
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Monthly Distribution Summary</h3>
                <div className={styles.statusIndicator}>
                  <div className={styles.dot}></div>
                  <span className={styles.statusText}>LIVE SYSTEM</span>
                </div>
              </div>
              
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Total Wheat</span>
                  <p className={styles.statValue}>4,280 kg</p>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Total Rice</span>
                  <p className={styles.statValue}>1,850 kg</p>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Sugar / Oil</span>
                  <p className={styles.statValue}>420 units</p>
                </div>
              </div>
            </div>
          </div>

          {/* Side Column */}
          <div className={styles.sideCol}>
            <div className={`card ${styles.alertCard}`}>
              <div className={styles.alertIconBox}>
                <AlertCircle size={32} />
              </div>
              <h4 className={styles.alertTitle}>System Alert</h4>
              <p className="text-muted" style={{ fontSize: '13px' }}>
                Physical stock audit required before next distribution cycle starts.
              </p>
            </div>
            
            <div className={styles.dealerCard}>
              <span className={styles.dealerLabel}>Active Dealer</span>
              <p className={styles.dealerName}>A.D. Chauhan</p>
              <div className={styles.verifiedRow}>
                <ShieldCheck color="var(--accent-amber)" size={20} />
                <span className={styles.verifiedText}>Authorized by Govt of Gujarat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

      {/* 3. Monthly Sales Report */}
      <section>
        <MonthlySalesReportPage />
      </section>
    </div>
  );
}
