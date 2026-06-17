'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useDashboard } from '@/lib/api-hooks';
import type { DashboardSummary } from '@/lib/types';
import styles from './Dashboard.module.css';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const router = useRouter();
  const { dealer } = useAuth();
  const dashboard = useDashboard();
  const getSummaryRef = useRef(dashboard.getSummary);
  useEffect(() => { getSummaryRef.current = dashboard.getSummary; });
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryError, setSummaryError] = useState(false);

  useEffect(() => {
    getSummaryRef.current()
      .then(setSummary)
      .catch(() => {
        setSummaryError(true);
        toast.error('Failed to load dashboard summary');
      });
  }, []);

  const statCards = summary ? [
    { label: "Today's Transactions", value: summary.today_transactions },
    { label: "Today's Quantity", value: `${summary.today_quantity} kg` },
    { label: 'Month Transactions', value: summary.month_transactions },
    { label: 'Month Quantity', value: `${summary.month_quantity} kg` },
    { label: 'Allocated', value: `${summary.allocated_kg} kg` },
    { label: 'Lifted', value: `${summary.lifted_kg} kg` },
    { label: 'Beneficiaries', value: summary.total_beneficiaries },
    { label: 'Pending Deliveries', value: summary.pending_deliveries },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', paddingBottom: '40px' }}>
      <section>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Compliance Dashboard</h2>
            <p className="text-muted">Manage and audit your monthly FPS distributions and stock balances.</p>
          </div>
          <div className={styles.actions}>
            <button className={styles.exportBtn} onClick={() => window.print()} disabled={!summary}>
              Print Report
            </button>
            <button onClick={() => router.push('/manual-sale')}>+ NEW RECORD</button>
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
                {summaryError ? (
                  <p className="text-muted" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px' }}>
                    Could not load dashboard data. Check your connection and try again.
                  </p>
                ) : !summary ? (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px' }}>
                    <Loader2 className="spin" size={24} style={{ margin: '0 auto' }} />
                    <p className="text-muted" style={{ marginTop: '12px' }}>Loading summary...</p>
                  </div>
                ) : (
                  statCards.map((stat) => (
                    <div key={stat.label} className={styles.statCard}>
                      <span className={styles.statLabel}>{stat.label}</span>
                      <p className={styles.statValue}>{stat.value}</p>
                    </div>
                  ))
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
                {summaryError
                  ? 'Unable to check alerts'
                  : summary
                    ? `${summary.low_stock_alerts} low stock alert(s) active`
                    : 'Loading alerts...'}
              </p>
            </div>

            <div className={styles.dealerCard}>
              <span className={styles.dealerLabel}>Active Dealer</span>
              <p className={styles.dealerName}>{dealer?.fps_id ? `${dealer.fps_id} - ${summary ? 'Connected' : 'Loading...'}` : 'Not connected'}</p>
              <div className={styles.verifiedRow}>
                <ShieldCheck color="var(--accent-amber)" size={20} />
                <span className={styles.verifiedText}>Authorized by Govt of Gujarat</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
