'use client';

import { useEffect, useRef, useState } from 'react';
import { RefreshCw, Database, Clock, AlertTriangle, CheckCircle, XCircle, Loader2, BarChart3, Users, Package, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSync } from '@/lib/api-hooks';
import type { SyncJob, SyncDashboardData } from '@/lib/types';
import styles from './Sync.module.css';

export default function SyncPage() {
  const sync = useSync();
  const syncRef = useRef(sync);
  useEffect(() => { syncRef.current = sync; });

  const [activeTab, setActiveTab] = useState<'status' | 'history'>('status');
  const [dashboard, setDashboard] = useState<SyncDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const data = await syncRef.current.getSelfDashboard();
      setDashboard(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load sync dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      await syncRef.current.triggerPrioritySync();
      toast.success('Priority sync enqueued');
      setTimeout(loadDashboard, 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger sync');
    } finally {
      setSyncing(false);
    }
  };

  const lastSync = dashboard?.lastSync ?? null;
  const history = dashboard?.syncHistory ?? [];

  const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; className: string }> = {
    pending: { label: 'Pending', icon: Clock, className: styles.statusPending },
    running: { label: 'Syncing', icon: RefreshCw, className: styles.statusRunning },
    success: { label: 'Success', icon: CheckCircle, className: styles.statusSuccess },
    failed: { label: 'Failed', icon: XCircle, className: styles.statusFailed },
  };

  const getStatusBadge = (status: string) => {
    const cfg = statusConfig[status] ?? statusConfig.failed;
    const Icon = cfg.icon;
    return <span className={`${styles.statusBadge} ${cfg.className}`}><Icon size={12} />{cfg.label}</span>;
  };

  if (loading) {
    return (
      <div className={styles.center}>
        <Loader2 size={32} className="spin" />
        <p className={styles.loadingText}>Loading sync dashboard...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>EFPS Sync</h2>
          <p className={styles.subtitle}>Synchronize your FPS data with the Government eFPS portal</p>
        </div>
        <div className={styles.headerActions}>
          <button className={styles.refreshBtn} onClick={loadDashboard}>
            <RefreshCw size={16} />
            Refresh
          </button>
          <button className={styles.syncNowBtn} onClick={handleSyncNow} disabled={syncing}>
            {syncing ? <Loader2 size={16} className="spin" /> : <Database size={16} />}
            {syncing ? 'Syncing...' : 'Sync Now'}
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Last Sync</span>
            <Database size={18} className={styles.metricIcon} />
          </div>
          <p className={styles.metricValue}>
            {lastSync
              ? new Date(lastSync.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
              : 'Never'}
          </p>
          {lastSync && <span className={styles.metricMeta}>{getStatusBadge(lastSync.status)}</span>}
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Queue</span>
            <BarChart3 size={18} className={styles.metricIcon} />
          </div>
          <p className={styles.metricValue}>{dashboard?.queueLength ?? 0}</p>
          <span className={styles.metricMeta}>jobs waiting</span>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Beneficiaries</span>
            <Users size={18} className={styles.metricIcon} />
          </div>
          <p className={styles.metricValue}>{dashboard?.totalBeneficiaries ?? 0}</p>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Transactions</span>
            <Package size={18} className={styles.metricIcon} />
          </div>
          <p className={styles.metricValue}>{dashboard?.totalTransactions ?? 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'status' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Sync Status
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Sync History
        </button>
        <div className={styles.tabIndicator} style={{ left: activeTab === 'status' ? '0' : '50%' }} />
      </div>

      {activeTab === 'status' && (
        <div className={styles.syncStatusSection}>
          {!lastSync ? (
            <div className={styles.emptyState}>
              <Database size={48} />
              <h3>No sync data yet</h3>
              <p>Click Sync Now to start synchronizing with the eFPS portal</p>
            </div>
          ) : (
            <div className={styles.currentSyncCard}>
              <div className={styles.currentSyncHeader}>
                <h3>Latest Sync</h3>
                {getStatusBadge(lastSync.status)}
              </div>
              <div className={styles.currentSyncBody}>
                <div className={styles.syncDetailRow}>
                  <span className={styles.detailLabel}>Sync Mode</span>
                  <span className={styles.detailValue}>{lastSync.sync_mode}</span>
                </div>
                <div className={styles.syncDetailRow}>
                  <span className={styles.detailLabel}>Started</span>
                  <span className={styles.detailValue}>{lastSync.started_at ? new Date(lastSync.started_at).toLocaleString('en-IN') : '-'}</span>
                </div>
                <div className={styles.syncDetailRow}>
                  <span className={styles.detailLabel}>Completed</span>
                  <span className={styles.detailValue}>{lastSync.completed_at ? new Date(lastSync.completed_at).toLocaleString('en-IN') : 'In progress...'}</span>
                </div>
                <div className={styles.syncDetailRow}>
                  <span className={styles.detailLabel}>Processed Records</span>
                  <span className={styles.detailValue}>{lastSync.processed_count}</span>
                </div>
                <div className={styles.syncDetailRow}>
                  <span className={styles.detailLabel}>Quarantined Records</span>
                  <span className={styles.detailValue} style={{ color: lastSync.quarantined_count > 0 ? 'var(--offline-red)' : undefined }}>
                    {lastSync.quarantined_count}
                  </span>
                </div>
                {lastSync.error_message && (
                  <div className={styles.errorBox}>
                    <AlertTriangle size={16} />
                    <span>{lastSync.error_message}</span>
                  </div>
                )}
                {lastSync.error_detail && lastSync.error_detail.length > 0 && (
                  <div className={styles.errorDetailBox}>
                    {lastSync.error_detail.map((e, i) => <p key={i} className={styles.errorLine}>{e}</p>)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className={styles.historySection}>
          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <Clock size={48} />
              <h3>No sync history</h3>
              <p>Sync history will appear here after the first synchronization</p>
            </div>
          ) : (
            <div className={styles.historyTable}>
              <div className={styles.historyTableHeader}>
                <span>Date</span>
                <span>Status</span>
                <span>Mode</span>
                <span>Processed</span>
                <span>Quarantined</span>
                <span>Duration</span>
              </div>
              {history.map((job: SyncJob) => (
                <div key={job.id} className={styles.historyRow}>
                  <span className={styles.historyDate}>{new Date(job.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  <span>{getStatusBadge(job.status)}</span>
                  <span className={styles.historyMode}>{job.sync_mode}</span>
                  <span>{job.processed_count}</span>
                  <span style={{ color: job.quarantined_count > 0 ? 'var(--offline-red)' : undefined }}>{job.quarantined_count}</span>
                  <span className={styles.historyDuration}>
                    {job.started_at && job.completed_at
                      ? `${Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)}s`
                      : '-'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quarantine Alert */}
      {(dashboard?.recentQuarantined ?? 0) > 0 && (
        <div className={styles.quarantineAlert}>
          <AlertTriangle size={16} />
          <span>{dashboard?.recentQuarantined} records quarantined in last sync. Check the sync details for more information.</span>
        </div>
      )}
    </div>
  );
}
