'use client';

import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  AlertCircle, ShieldCheck, Plus, Printer, RefreshCw, Download, Upload,
  Users, Package, TrendingUp, DollarSign, Activity, Bell, Settings,
  LogOut, ChevronRight, Clock, Database, Server, Wifi, CheckCircle,
  XCircle, AlertTriangle, BarChart3, FileText, Search,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import type { MasterDashboard } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { DonutChart } from '@/components/ui/DonutChart';
import styles from './Dashboard.module.css';

const STATUS_COLORS: Record<string, string> = {
  healthy: 'var(--online-green)', connected: 'var(--online-green)', success: 'var(--online-green)',
  running: 'var(--info-blue)', pending: 'var(--warning-orange)',
  failed: 'var(--offline-red)', unknown: 'var(--text-muted)', 'out_of_stock': 'var(--offline-red)',
  critical: 'var(--offline-red)', low: 'var(--warning-orange)', moderate: 'var(--info-blue)', sufficient: 'var(--online-green)',
};

function StatusDot({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
      backgroundColor: STATUS_COLORS[status.toLowerCase()] ?? 'var(--text-muted)',
      flexShrink: 0,
    }} />
  );
}

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string | number; sub?: string; icon?: React.ReactNode; color?: string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiTop}>
        <span className={styles.kpiLabel}>{label}</span>
        {icon && <span style={{ color: 'var(--text-muted)', opacity: 0.5 }}>{icon}</span>}
      </div>
      <p className={styles.kpiValue}>{value}</p>
      {sub && <span className={styles.kpiSub}>{sub}</span>}
    </div>
  );
}

function LiveStatusChip({ label, status }: { label: string; status: string }) {
  return (
    <div className={styles.liveChip}>
      <StatusDot status={status} />
      <span className={styles.liveChipLabel}>{label}</span>
      <span className={styles.liveChipValue}>{status}</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { dealer, logout } = useAuth();

  const { data: dash, isLoading, isError, failureCount, refetch } = useQuery<MasterDashboard>({
    queryKey: ['dashboard-master'],
    queryFn: async () => {
      try {
        return await api.get<MasterDashboard>('/dashboard/master');
      } catch (err: any) {
        if (err?.code === 'TOKEN_EXPIRED' || err?.statusCode === 401) {
          await logout();
          router.push('/login?expired=1');
          throw err;
        }
        throw err;
      }
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  if (isLoading) return <LoadingState />;
  if (isError || !dash) return <ErrorState message={failureCount > 2 ? 'Session expired. Please re-login.' : 'Could not load dashboard data'} onRetry={() => refetch()} />;

  const { kpis, distributionProgress, stockByCommodity, beneficiarySummary, distributionHistory, financialSummary, systemHealth } = dash;

  return (
    <div className={styles.container}>
      {/* ===== HEADER ===== */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.brand}>
            <ShieldCheck size={20} style={{ color: 'var(--accent-amber)' }} />
            <span style={{ fontWeight: 700, fontSize: 18 }}>eFPS Master</span>
          </div>
          <span className={styles.subtitle}>FPS MANAGEMENT SYSTEM &middot; Government of Gujarat</span>
        </div>
        <div className={styles.headerCenter}>
          <LiveStatusChip label="Server" status={systemHealth.server} />
          <LiveStatusChip label="DB" status={systemHealth.database} />
          <LiveStatusChip label="Redis" status={systemHealth.redis} />
          <LiveStatusChip label="Worker" status={systemHealth.worker} />
          <LiveStatusChip label="eFPS" status={systemHealth.efps} />
          <LiveStatusChip label="IPDS" status={systemHealth.ipds} />
          <div className={styles.liveChip}>
            <Clock size={12} />
            <span style={{ fontSize: 11, fontWeight: 500 }}>{new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        <div className={styles.headerRight}>
          <button className={styles.iconBtn} onClick={() => router.push('/updates')}><Bell size={16} /></button>
          <button className={styles.iconBtn} onClick={() => router.push('/profile/edit')}><Settings size={16} /></button>
          <div className={styles.dealerBadge}>
            <span>{dealer?.fps_id}</span>
          </div>
        </div>
      </header>

      {/* ===== QUICK ACTIONS ===== */}
      <section className={styles.quickActions}>
        <button className={styles.qAction} onClick={() => router.push('/manual-sale')}><Plus size={14} /> New Sale</button>
        <button className={styles.qAction} onClick={() => router.push('/customers')}><Users size={14} /> Beneficiaries</button>
        <button className={styles.qAction} onClick={() => router.push('/stock-record')}><Package size={14} /> Stock</button>
        <button className={styles.qAction} onClick={() => window.print()}><Printer size={14} /> Print</button>
        <button className={styles.qAction} onClick={() => router.push('/monthly-sales-report')}><FileText size={14} /> Reports</button>
        <button className={styles.qAction} onClick={() => router.push('/sync')}><RefreshCw size={14} /> Sync</button>
      </section>

      {/* ===== KPI GRID ===== */}
      <section className={styles.kpiGrid}>
        <Card><KpiCard label="Total Ration Cards" value={kpis.rationCards.total} sub={`${kpis.rationCards.aay} AAY · ${kpis.rationCards.phh} PHH`} icon={<Users size={16} />} /></Card>
        <Card><KpiCard label="Today Distribution" value={`${kpis.todayDistribution.cardsServed}`} sub={`${kpis.todayDistribution.quantityDistributed} kg · ${kpis.todayDistribution.membersServed} members`} icon={<Activity size={16} />} /></Card>
        <Card><KpiCard label="Remaining" value={kpis.remainingDistribution.pendingCards} sub={`Est: ${kpis.remainingDistribution.estimatedCompletion}`} icon={<Clock size={16} />} /></Card>
        <Card><KpiCard label="Current Stock" value={`${kpis.currentStock.available} kg`} sub={`${kpis.currentStock.lowStock} low stock alerts`} icon={<Package size={16} />} /></Card>
        <Card><KpiCard label="Govt Allocation" value={`${kpis.governmentAllocation.remaining} kg`} sub={`${kpis.governmentAllocation.shortage} shortage`} icon={<TrendingUp size={16} />} /></Card>
        <Card><KpiCard label="Revenue" value={`\u20B9${kpis.revenue.monthlyIncome.toLocaleString()}`} sub={`Today: \u20B9${kpis.revenue.todayIncome}`} icon={<DollarSign size={16} />} /></Card>
        <Card><KpiCard label="Sync Status" value={kpis.syncStatus.efps} sub={`${kpis.syncStatus.queue} queued · ${kpis.syncStatus.failedJobs} failed`} icon={<RefreshCw size={16} />} /></Card>
        <Card><KpiCard label="Alerts" value={kpis.alerts.pendingIssues + kpis.alerts.portalErrors + kpis.alerts.stockShortage} sub={`${kpis.alerts.beneficiaryIssues} beneficiary issues`} icon={<Bell size={16} />} color="var(--warning-orange)" /></Card>
      </section>

      {/* ===== DISTRIBUTION PROGRESS + STOCK ===== */}
      <div className={styles.twoCol}>
        {/* DISTRIBUTION PROGRESS */}
        <Card>
          <div className={styles.sectionH}>
            <h3>Distribution Progress</h3>
            <span className={styles.trend}>{distributionProgress.trend}</span>
          </div>
          <div className={styles.donutRow}>
            <DonutChart
              segments={[
                { value: distributionProgress.completed, color: 'var(--online-green)', label: 'Completed' },
                { value: distributionProgress.pending, color: 'var(--surface-gray-dark)', label: 'Pending' },
              ]}
              centerText={`${distributionProgress.percentage}%`}
              centerSubtext={`${distributionProgress.completed} / ${distributionProgress.target}`}
            />
            <div className={styles.donutStats}>
              <div><span className={styles.donutStatValue}>{distributionProgress.target}</span><span className={styles.donutStatLabel}>Target</span></div>
              <div><span className={styles.donutStatValue}>{distributionProgress.completed}</span><span className={styles.donutStatLabel}>Completed</span></div>
              <div><span className={styles.donutStatValue}>{distributionProgress.pending}</span><span className={styles.donutStatLabel}>Pending</span></div>
            </div>
          </div>
        </Card>

        {/* STOCK BY COMMODITY */}
        <Card>
          <div className={styles.sectionH}>
            <h3>Stock by Commodity</h3>
            <button className={styles.sectionAction} onClick={() => router.push('/stock')}>View All <ChevronRight size={14} /></button>
          </div>
          <div className={styles.stockTable}>
            <div className={styles.stockHeader}>
              <span>Commodity</span><span>Allocated</span><span>Available</span><span>Status</span>
            </div>
            {stockByCommodity.map((s) => (
              <div key={s.commodity} className={styles.stockRow}>
                <span style={{ fontWeight: 500 }}>{s.commodity}</span>
                <span>{s.allocated} kg</span>
                <span>{s.available} kg</span>
                <span className={styles.stockStatus}>
                  <StatusDot status={s.status} />
                  <span style={{ fontSize: 11, textTransform: 'capitalize' }}>{s.status === 'sufficient' ? 'OK' : s.status}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== BENEFICIARY SUMMARY ===== */}
      <Card>
        <div className={styles.sectionH}>
          <h3>Beneficiary Dashboard</h3>
          <div className={styles.benSummary}>
            <span className={styles.benChip}>{beneficiarySummary.totalFamilies} Families</span>
            <span className={styles.benChip}>{beneficiarySummary.totalMembers} Members</span>
            <span className={styles.benChip}>{beneficiarySummary.todayServed} Served Today</span>
          </div>
        </div>
        <div className={styles.benGrid}>
          <div><span>Total</span><strong>{beneficiarySummary.totalFamilies}</strong></div>
          <div><span>AAY</span><strong>{kpis.rationCards.aay}</strong></div>
          <div><span>PHH</span><strong>{kpis.rationCards.phh}</strong></div>
          <div><span>APL</span><strong>{kpis.rationCards.priority}</strong></div>
          <div><span>BPL</span><strong>{kpis.rationCards.nonPriority}</strong></div>
          <div><span>Pending</span><strong>{beneficiarySummary.pending}</strong></div>
          <div><span>Inactive</span><strong>{beneficiarySummary.inactive}</strong></div>
          <div><span>Portability</span><strong>{beneficiarySummary.portability}</strong></div>
        </div>
      </Card>

      {/* ===== DISTRIBUTION HISTORY ===== */}
      <Card>
        <div className={styles.sectionH}>
          <h3>Distribution History</h3>
          <button className={styles.sectionAction} onClick={() => router.push('/transactions')}>View All <ChevronRight size={14} /></button>
        </div>
        {(distributionHistory?.length ?? 0) > 0 ? (
          <div className={styles.historyTable}>
            <div className={styles.historyHeader}>
              <span>Date</span><span>Beneficiary</span><span>Commodity</span><span>Qty</span><span>Amount</span><span>Status</span>
            </div>
            {distributionHistory.slice(0, 5).map((tx) => (
              <div key={tx.id} className={styles.historyRow}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{tx.date}</span>
                <span style={{ fontWeight: 500 }}>{tx.beneficiary}</span>
                <span>{tx.commodity}</span>
                <span>{tx.quantity} kg</span>
                <span>\u20B9{tx.amount}</span>
                <span className={styles.stockStatus}><StatusDot status={tx.status} />{tx.status}</span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--space-6)', fontSize: 13 }}>
            No distribution history yet. Start by recording a sale.
          </p>
        )}
      </Card>

      {/* ===== FINANCIAL SUMMARY ===== */}
      <div className={styles.twoCol}>
        <Card>
          <div className={styles.sectionH}>
            <h3>Financial Summary</h3>
            <DollarSign size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className={styles.finGrid}>
            <div><span>Commission</span><strong>\u20B9{financialSummary.commission.toLocaleString()}</strong></div>
            <div><span>Incentive</span><strong>\u20B9{financialSummary.governmentIncentive.toLocaleString()}</strong></div>
            <div><span>Bank Deposits</span><strong>\u20B9{financialSummary.bankDeposits.toLocaleString()}</strong></div>
            <div><span>Expenses</span><strong>\u20B9{financialSummary.expenses.toLocaleString()}</strong></div>
            <div><span>Net Profit</span><strong style={{ color: financialSummary.profit >= 0 ? 'var(--online-green)' : 'var(--offline-red)' }}>\u20B9{financialSummary.profit.toLocaleString()}</strong></div>
          </div>
        </Card>

        {/* SYSTEM HEALTH */}
        <Card>
          <div className={styles.sectionH}>
            <h3>System Health</h3>
            <Activity size={16} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className={styles.healthGrid}>
            {[
              ['Server', systemHealth.server],
              ['Database', systemHealth.database],
              ['Redis', systemHealth.redis],
              ['Worker', systemHealth.worker],
              ['eFPS Portal', systemHealth.efps],
              ['IPDS Portal', systemHealth.ipds],
            ].map(([label, status]) => (
              <div key={label as string} className={styles.healthRow}>
                <span>{label as string}</span>
                <span className={styles.healthStatus}>
                  <StatusDot status={status as string} />
                  <span style={{ textTransform: 'capitalize' }}>{(status as string)?.replace('_', ' ')}</span>
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ===== FOOTER ===== */}
      <footer className={styles.footer}>
        <span>eFPS Master v1.0.0 &middot; Build 2026.06.18</span>
        <span className={styles.footerDealer}>
          <ShieldCheck size={12} />
          {systemHealth.dealer.full_name} ({systemHealth.dealer.fps_id}) &middot; {systemHealth.dealer.district ?? 'Gujarat'}
        </span>
      </footer>
    </div>
  );
}

function LoadingState() {
  return (
    <div className={styles.container}>
      {[1, 2, 3].map((row) => (
        <div key={row} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
          {[1, 2, 3, 4].map((c) => <SkeletonCard key={c} />)}
        </div>
      ))}
    </div>
  );
}
