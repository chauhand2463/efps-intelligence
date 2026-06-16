'use client';

import { useEffect, useState } from 'react';
import OperationalDashboardPage from '../operational-dashboard/page';
import MonthlySalesReportPage from '../monthly-sales-report/page';
import styles from './Dashboard.module.css';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { useDashboard } from '@/lib/api-hooks';
import type { DashboardSummary } from '@/lib/types';

export default function DashboardPage() {
  const { getSummary } = useDashboard();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    getSummary().then(setSummary).catch(() => {});
  }, [getSummary]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '48px', paddingBottom: '40px' }}>
      <section>
        <OperationalDashboardPage />
      </section>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-light)' }} />

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
                {summary ? (
                  <>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Today&apos;s Transactions</span>
                      <p className={styles.statValue}>{summary.today_transactions}</p>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Today&apos;s Quantity</span>
                      <p className={styles.statValue}>{summary.today_quantity} kg</p>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Month Transactions</span>
                      <p className={styles.statValue}>{summary.month_transactions}</p>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Month Quantity</span>
                      <p className={styles.statValue}>{summary.month_quantity} kg</p>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Allocated</span>
                      <p className={styles.statValue}>{summary.allocated_kg} kg</p>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Lifted</span>
                      <p className={styles.statValue}>{summary.lifted_kg} kg</p>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Beneficiaries</span>
                      <p className={styles.statValue}>{summary.total_beneficiaries}</p>
                    </div>
                    <div className={styles.statCard}>
                      <span className={styles.statLabel}>Pending Deliveries</span>
                      <p className={styles.statValue}>{summary.pending_deliveries}</p>
                    </div>
                  </>
                ) : (
                  <p className="text-muted">Loading summary...</p>
                )}
              </div>
            </div>
          </div>

          <div className={styles.sideCol}>
            <div className={`card ${styles.alertCard}`}>
              <div className={styles.alertIconBox}>
                <AlertCircle size={32} />
              </div>
              <h4 className={styles.alertTitle}>System Alert</h4>
              <p className="text-muted" style={{ fontSize: '13px' }}>
                {summary ? `${summary.low_stock_alerts} low stock alert(s) active` : 'Loading alerts...'}
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

      <section>
        <MonthlySalesReportPage />
      </section>
    </div>
  );
}
