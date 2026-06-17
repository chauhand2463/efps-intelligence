'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ShieldCheck, Plus, Printer } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { DashboardSummary } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import styles from './Dashboard.module.css';

export default function DashboardPage() {
  const router = useRouter();
  const { dealer } = useAuth();

  const { data: summary, isLoading, isError, refetch } = useQuery<DashboardSummary>({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get<DashboardSummary>('/dashboard/summary'),
    staleTime: 30_000,
  });

  const statCards = [
    { label: "Today's Transactions", value: summary?.today_transactions, key: 'today_tx' },
    { label: "Today's Quantity", value: summary ? `${summary.today_quantity} kg` : null, key: 'today_qty' },
    { label: 'Month Transactions', value: summary?.month_transactions, key: 'month_tx' },
    { label: 'Month Quantity', value: summary ? `${summary.month_quantity} kg` : null, key: 'month_qty' },
    { label: 'Allocated', value: summary ? `${summary.allocated_kg} kg` : null, key: 'alloc' },
    { label: 'Lifted', value: summary ? `${summary.lifted_kg} kg` : null, key: 'lift' },
    { label: 'Beneficiaries', value: summary?.total_beneficiaries, key: 'benef' },
    { label: 'Pending Deliveries', value: summary?.pending_deliveries, key: 'pend' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.description}>Overview of your FPS distribution and stock status</p>
        </div>
        <div className={styles.actions}>
          <Button variant="secondary" size="sm" onClick={() => window.print()} disabled={!summary}>
            <Printer size={16} />
            Print Report
          </Button>
          <Button size="sm" onClick={() => router.push('/manual-sale')}>
            <Plus size={16} />
            New Record
          </Button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.mainCol}>
          <Card>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>Monthly Distribution Summary</h2>
              <div className={styles.statusBadge}>
                <div className={styles.statusDot} />
                Live System
              </div>
            </div>

            {isError ? (
              <ErrorState
                message="Could not load dashboard data. Check your connection and try again."
                onRetry={() => refetch()}
              />
            ) : isLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : (
              <div className={styles.statsGrid}>
                {statCards.map((stat) => (
                  <div key={stat.key} className={styles.statCard}>
                    <span className={styles.statLabel}>{stat.label}</span>
                    <p className={styles.statValue}>{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className={styles.sideCol}>
          <Card>
            <div className={styles.alertCard}>
              <div className={styles.alertIcon}>
                <AlertCircle size={22} />
              </div>
              <div className={styles.alertContent}>
                <h3 className={styles.alertTitle}>System Alert</h3>
                <p className={styles.alertText}>
                  {isError
                    ? 'Unable to check alerts'
                    : summary
                      ? `${summary.low_stock_alerts} low stock alert(s) active`
                      : 'Loading alerts...'}
                </p>
              </div>
            </div>
          </Card>

          <div className={styles.dealerCard}>
            <span className={styles.dealerLabel}>Active Dealer</span>
            <p className={styles.dealerName}>
              {dealer?.fps_id
                ? `${dealer.fps_id}`
                : 'Not connected'}
            </p>
            <div className={styles.verifiedRow}>
              <ShieldCheck size={18} color="rgba(255,255,255,0.6)" />
              <span className={styles.verifiedText}>Authorized by Govt of Gujarat</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
