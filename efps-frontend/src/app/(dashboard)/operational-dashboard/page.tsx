'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, Users, Package, RefreshCw, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useDashboard, useTransactions } from '@/lib/api-hooks';
import type { DashboardSummary } from '@/lib/types';
import styles from './Operational.module.css';

export default function OperationalDashboardPage() {
  const router = useRouter();
  const { getSummary } = useDashboard();
  const { getSummary: getTxSummary } = useTransactions();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentTx, setRecentTx] = useState<Array<{ name: string; time: string; amount: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getSummary();
      setSummary(data);
      const txSummary = await getTxSummary();
      if (txSummary?.monthly_sales) {
        const txList = txSummary.monthly_sales.slice(0, 5).map(s => ({
          name: `${s.commodity} - ${s.quantity} kg`,
          time: `₹${s.amount.toFixed(2)}`,
          amount: `${s.quantity} kg`,
        }));
        setRecentTx(txList);
      }
    } catch (err) {
      setError(true);
      if (err instanceof Error) toast.error(err.message);
      else toast.error('Failed to load operational data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <Loader2 className="spin" size={32} style={{ margin: '0 auto' }} />
        <p className="text-muted" style={{ marginTop: '16px' }}>Loading operational data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <AlertTriangle size={32} style={{ margin: '0 auto', color: 'var(--offline-red)' }} />
        <p style={{ marginTop: '12px', fontWeight: 600 }}>Could not load operational data</p>
        <button className="btn" style={{ marginTop: '12px', backgroundColor: 'var(--primary-navy)', color: 'white' }} onClick={loadData}>
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Operational Dashboard</h2>
          <p className={styles.subtitle}>Real-time monitoring of FPS devices and transactions.</p>
        </div>
        <button className="btn" style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', color: 'var(--primary-navy)' }} onClick={loadData}>
          <RefreshCw size={16} style={{ marginRight: '8px' }} />
          Refresh Data
        </button>
      </header>

      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Today Transactions</span>
            <div className={styles.metricIcon}><Activity size={20} /></div>
          </div>
          <p className={styles.metricValue}>{summary?.today_transactions ?? 0}</p>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Today Quantity</span>
            <div className={styles.metricIcon}><Package size={20} /></div>
          </div>
          <p className={styles.metricValue}>{summary?.today_quantity ?? 0} kg</p>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Beneficiaries</span>
            <div className={styles.metricIcon}><Users size={20} /></div>
          </div>
          <p className={styles.metricValue}>{summary?.total_beneficiaries ?? 0}</p>
        </div>
        
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Stock Sync Status</span>
            <div className={styles.metricIcon}><Package size={20} /></div>
          </div>
          <p className={styles.metricValue} style={{ color: 'var(--online-green)' }}>Active</p>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className="card">
          <h3 className={styles.sectionTitle}>Monthly Summary</h3>
          <div className={styles.deviceList}>
            <div className={styles.deviceItem}>
              <div className={styles.deviceInfo}>
                <Activity size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.deviceName}>Month Transactions</div>
                  <div className={styles.deviceMeta}>{summary?.month_transactions ?? 0} total</div>
                </div>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusOnline}`}>{summary?.month_quantity ?? 0} kg</span>
            </div>
            
            <div className={styles.deviceItem}>
              <div className={styles.deviceInfo}>
                <Package size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.deviceName}>Stock Allocated</div>
                  <div className={styles.deviceMeta}>{summary?.allocated_kg ?? 0} kg allocated</div>
                </div>
              </div>
              <span className={`${styles.statusBadge} ${styles.statusOnline}`}>{summary?.lifted_kg ?? 0} kg lifted</span>
            </div>
            
            <div className={styles.deviceItem}>
              <div className={styles.deviceInfo}>
                <Users size={24} color="var(--text-muted)" />
                <div>
                  <div className={styles.deviceName}>Pending Deliveries</div>
                  <div className={styles.deviceMeta}>Beneficiaries awaiting distribution</div>
                </div>
              </div>
              <span className={`${styles.statusBadge} ${(summary?.pending_deliveries ?? 0) > 0 ? styles.statusOffline : styles.statusOnline}`}>
                {summary?.pending_deliveries ?? 0}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '12px' }}>
            <h3 className={styles.sectionTitle} style={{ borderBottom: 'none', margin: 0, paddingBottom: 0 }}>Monthly Sales</h3>
            <button onClick={() => router.push('/sales')} style={{ background: 'none', border: 'none', color: 'var(--accent-amber)', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                View All <ChevronRight size={14} />
            </button>
          </div>
          
          <div className={styles.transactionList}>
            {recentTx.length === 0 ? (
              <div className={styles.transactionItem}>
                <div className={styles.txDetails}>
                  <span className={styles.txName}>No sales data yet</span>
                  <span className={styles.txTime}>Start recording transactions</span>
                </div>
              </div>
            ) : (
              recentTx.map((tx, i) => (
                <div key={i} className={styles.transactionItem}>
                  <div className={styles.txDetails}>
                    <span className={styles.txName}>{tx.name}</span>
                    <span className={styles.txTime}>{tx.time}</span>
                  </div>
                  <span className={styles.txAmount}>{tx.amount}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
