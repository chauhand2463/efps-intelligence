'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { RefreshCw, Database, Clock, AlertTriangle, CheckCircle, XCircle, Loader2, BarChart3, Users, Package, Upload, FileText, Trash2, FileSpreadsheet, Key, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSync } from '@/lib/api-hooks';
import type { SyncJob, SyncDashboardData, ImportResult } from '@/lib/types';
import styles from './Sync.module.css';
import * as XLSX from 'xlsx';

interface ImportBeneficiaryRow {
  hofAsPerNFSA: string;
  rationCardNo: string;
  cardCategory: string;
  familyMember: number;
  cardHolderName: string;
  lpgStatus: string;
  pngStatus: string;
  address: string;
  village: string;
}

const KNOWN_KEYS: Record<string, Record<string, string>> = {
  rationCardNo: { rationcardno: '1', rationcard: '1', rationcardnumber: '1', rcmembers: '1', rcno: '1', rcnofps: '1' },
  hofAsPerNFSA: { hofaspernfsa: '1', headoffamily: '1', name: '1', headofamily: '1', familyhead: '1', holdername: '1', head: '1', beneficiaryname: '1' },
  cardCategory: { cardcategory: '1', category: '1', cardtype: '1', rationcardtype: '1', nfsacategory: '1', typeofcard: '1' },
  familyMember: { familymember: '1', members: '1', membercount: '1', familysize: '1', totalmembers: '1', nooffamilymembers: '1' },
  cardHolderName: { cardholdername: '1', holdername: '1', cardname: '1', nameoncard: '1' },
  lpgStatus: { lpgstatus: '1', lpg: '1', lpgconnection: '1' },
  pngStatus: { pngstatus: '1', png: '1', pngconnection: '1' },
  address: { address: '1', fulladdress: '1', residentialaddress: '1' },
  village: { village: '1', town: '1', city: '1', locality: '1', area: '1' },
};

function normalizeKey(k: string): string {
  return k.toLowerCase().replace(/[\s_\-()]+/g, '').replace(/[^a-z0-9]/g, '');
}

function findFirst(data: Record<string, string>, field: string): string {
  const aliases = KNOWN_KEYS[field];
  if (!aliases) return data[field] ?? '';
  const normData: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    normData[normalizeKey(k)] = v;
  }
  for (const alias of Object.keys(aliases)) {
    if (normData[alias] !== undefined && normData[alias] !== '') return normData[alias];
  }
  return '';
}

function mapRow(data: Record<string, string>): ImportBeneficiaryRow {
  return {
    hofAsPerNFSA: findFirst(data, 'hofAsPerNFSA'),
    rationCardNo: findFirst(data, 'rationCardNo'),
    cardCategory: findFirst(data, 'cardCategory') || 'NFSA-AAY',
    familyMember: parseInt(findFirst(data, 'familyMember') || '1', 10) || 1,
    cardHolderName: findFirst(data, 'cardHolderName'),
    lpgStatus: findFirst(data, 'lpgStatus'),
    pngStatus: findFirst(data, 'pngStatus'),
    address: findFirst(data, 'address'),
    village: findFirst(data, 'village'),
  };
}

function parseCsv(text: string): ImportBeneficiaryRow[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const rows: ImportBeneficiaryRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ''; });
    rows.push(mapRow(row));
  }
  return rows;
}

function parseExcel(data: ArrayBuffer): ImportBeneficiaryRow[] {
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const raw = XLSX.utils.sheet_to_json<Record<string, string>>(workbook.Sheets[sheetName], { defval: '' });
  const rows: ImportBeneficiaryRow[] = [];
  for (const item of raw) {
    const normalized: Record<string, string> = {};
    for (const [key, val] of Object.entries(item)) {
      normalized[key.toLowerCase().replace(/[\s-]+/g, '')] = String(val ?? '');
    }
    rows.push(mapRow(normalized));
  }
  return rows;
}

export default function SyncPage() {
  const sync = useSync();
  const syncRef = useRef(sync);
  useEffect(() => { syncRef.current = sync; });

  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'csv'>('status');
  const [dashboard, setDashboard] = useState<SyncDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [importRows, setImportRows] = useState<ImportBeneficiaryRow[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult & { fileName: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasCredentials, setHasCredentials] = useState<boolean | null>(null);
  const [showCredForm, setShowCredForm] = useState(false);
  const [credUsername, setCredUsername] = useState('');
  const [credPassword, setCredPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingCreds, setSavingCreds] = useState(false);

  const loadCredentials = async () => {
    try {
      const status = await syncRef.current.getCredentialsStatus();
      setHasCredentials(status.hasCredentials);
    } catch { setHasCredentials(false); }
  };

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

  useEffect(() => { loadDashboard(); loadCredentials(); }, []);

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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImportResult(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const isExcel = /\.xlsx?$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      let rows: ImportBeneficiaryRow[];
      if (isExcel) {
        rows = parseExcel(ev.target!.result as ArrayBuffer);
      } else {
        rows = parseCsv(ev.target!.result as string);
      }
      if (rows.length === 0) {
        toast.error('No valid rows found. Check headers (need rationCardNo, hofAsPerNFSA).');
        return;
      }
      setImportRows(rows);
      setImportFileName(file.name);
      toast.success(`Parsed ${rows.length} rows from ${file.name}`);
    };
    reader.onerror = () => { toast.error('Failed to read file'); };
    if (isExcel) {
      reader.readAsArrayBuffer(file);
    } else {
      reader.readAsText(file);
    }
  }, []);

  const handleImport = async () => {
    if (importRows.length === 0) return;
    setImporting(true);
    try {
      const result = await syncRef.current.importCsv(importRows);
      setImportResult({ ...result, fileName: importFileName });
      setImportRows([]);
      setImportFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadDashboard();
      toast.success(`Imported ${result.newRecords} new, ${result.updatedRecords} updated`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
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

      {/* Credentials Status */}
      <div className={styles.credBar}>
        <div className={styles.credInfo}>
          <Key size={16} />
          <span>eFPS Portal Credentials: </span>
          {hasCredentials === null ? (
            <Loader2 size={14} className="spin" />
          ) : hasCredentials ? (
            <span className={styles.credConfigured}><CheckCircle size={14} /> Configured</span>
          ) : (
            <span className={styles.credMissing}><AlertTriangle size={14} /> Not configured</span>
          )}
        </div>
        {!showCredForm ? (
          <button className={styles.credBtn} onClick={() => setShowCredForm(true)}>
            <Key size={14} /> {hasCredentials ? 'Update Credentials' : 'Set Credentials'}
          </button>
        ) : (
          <button className={styles.credBtnCancel} onClick={() => setShowCredForm(false)}>Cancel</button>
        )}
      </div>

      {showCredForm && (
        <div className={styles.credForm}>
          <h4 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, color: 'var(--text-dark)' }}>
            {hasCredentials ? 'Update' : 'Set'} eFPS Portal Credentials
          </h4>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Your credentials are encrypted with AES-256-GCM before storage.
            They are used only by the sync worker for Playwright-based data synchronization and are never exposed in API responses.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <input
              type="text" placeholder="eFPS Portal Username"
              value={credUsername}
              onChange={e => setCredUsername(e.target.value)}
              className={styles.credInput}
            />
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="eFPS Portal Password"
                value={credPassword}
                onChange={e => setCredPassword(e.target.value)}
                className={styles.credInput}
                style={{ width: '100%', paddingRight: 40 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className={styles.credBtnCancel} onClick={() => setShowCredForm(false)}>Cancel</button>
            <button
              className={styles.credBtn}
              disabled={savingCreds || !credUsername || !credPassword}
              onClick={async () => {
                setSavingCreds(true);
                try {
                  await syncRef.current.saveCredentials({ efps_username: credUsername, efps_password: credPassword });
                  toast.success('Credentials saved securely');
                  setShowCredForm(false);
                  setCredUsername('');
                  setCredPassword('');
                  loadCredentials();
                } catch (err: any) {
                  toast.error(err?.message || 'Failed to save credentials');
                } finally { setSavingCreds(false); }
              }}
            >
              {savingCreds ? <Loader2 size={14} className="spin" /> : <Key size={14} />}
              {savingCreds ? 'Saving...' : 'Save Credentials'}
            </button>
          </div>
        </div>
      )}

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
        <button
          className={`${styles.tab} ${activeTab === 'csv' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('csv')}
        >
          Import
        </button>
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

      {activeTab === 'csv' && (
        <div className={styles.csvSection}>
          <div className={styles.csvHeader}>
            <h3>Import Beneficiaries from File</h3>
            <p>Upload a <strong>CSV</strong> or <strong>Excel (.xlsx)</strong> file exported from your government portal. Required columns: <code>rationCardNo</code>, <code>hofAsPerNFSA</code>.</p>
          </div>

          {!importResult && (
            <div className={styles.csvUploadArea}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileSelect}
                className={styles.csvFileInput}
                id="import-file-input"
              />
              <label htmlFor="import-file-input" className={styles.csvDropZone}>
                <Upload size={32} />
                <strong>Click to select a file</strong>
                <span>Supports CSV (.csv) and Excel (.xlsx, .xls) — max 10,000 rows</span>
              </label>
            </div>
          )}

          {importRows.length > 0 && !importResult && (
            <div className={styles.csvPreview}>
              <div className={styles.csvPreviewHeader}>
                <span>
                  {/\.xlsx?$/i.test(importFileName) ? <FileSpreadsheet size={14} /> : <FileText size={14} />}
                  {importFileName} ({importRows.length} rows)
                </span>
                <button className={styles.csvClearBtn} onClick={() => { setImportRows([]); setImportFileName(''); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
                  <Trash2 size={14} /> Clear
                </button>
              </div>
              <div className={styles.csvTableWrap}>
                <table className={styles.csvTable}>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ration Card No</th>
                      <th>Head of Family</th>
                      <th>Category</th>
                      <th>Members</th>
                    </tr>
                  </thead>
                  <tbody>
                    {importRows.slice(0, 100).map((row, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td>{row.rationCardNo}</td>
                        <td>{row.hofAsPerNFSA}</td>
                        <td>{row.cardCategory}</td>
                        <td>{row.familyMember}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {importRows.length > 100 && <p className={styles.csvMore}>... and {importRows.length - 100} more rows</p>}
              <button className={styles.csvImportBtn} onClick={handleImport} disabled={importing}>
                {importing ? <Loader2 size={16} className="spin" /> : <Database size={16} />}
                {importing ? 'Importing...' : `Import ${importRows.length} Beneficiaries`}
              </button>
            </div>
          )}

          {importResult && (
            <div className={styles.csvResult}>
              <CheckCircle size={24} className={styles.csvResultIcon} />
              <div className={styles.csvResultBody}>
                <h4>Import Complete — {importResult.fileName}</h4>
                <div className={styles.csvResultStats}>
                  <div className={styles.csvResultStat}>
                    <span className={styles.csvResultStatValue}>{importResult.totalRecords}</span>
                    <span className={styles.csvResultStatLabel}>Total</span>
                  </div>
                  <div className={styles.csvResultStat}>
                    <span className={styles.csvResultStatValue} style={{ color: 'var(--online-green)' }}>{importResult.newRecords}</span>
                    <span className={styles.csvResultStatLabel}>New</span>
                  </div>
                  <div className={styles.csvResultStat}>
                    <span className={styles.csvResultStatValue} style={{ color: '#2563eb' }}>{importResult.updatedRecords}</span>
                    <span className={styles.csvResultStatLabel}>Updated</span>
                  </div>
                  <div className={styles.csvResultStat}>
                    <span className={styles.csvResultStatValue}>{importResult.unchangedRecords}</span>
                    <span className={styles.csvResultStatLabel}>Unchanged</span>
                  </div>
                  {importResult.errorCount > 0 && (
                    <div className={styles.csvResultStat}>
                      <span className={styles.csvResultStatValue} style={{ color: 'var(--offline-red)' }}>{importResult.errorCount}</span>
                      <span className={styles.csvResultStatLabel}>Errors</span>
                    </div>
                  )}
                </div>
                <p className={styles.csvResultHash}>Batch ID: <code>{importResult.batchId}</code></p>
                <div className={styles.csvResultActions}>
                  <a href="/customers" className={styles.csvViewBtn}>View Beneficiaries</a>
                  <button className={styles.csvResetBtn} onClick={() => { setImportResult(null); loadDashboard(); }}>Import Another File</button>
                </div>
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
