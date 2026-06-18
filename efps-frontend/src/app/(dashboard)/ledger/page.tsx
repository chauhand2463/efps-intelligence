'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import styles from './StockLedger.module.css';
import * as XLSX from 'xlsx';

// ── Types ────────────────────────────────────────────────
interface StockLedgerRow {
  id: string; dealer_id: string; fps_id: string; shop_name: string;
  commodity: string; department: string; fiscal_month: string;
  opening_kg: number; inbound_kg: number; outbound_kg: number;
  closing_kg: number; unit: string; updated_at: string; avg_monthly_offtake: number;
}

interface FinLedgerRow {
  id: string; dealer_id: string; entry_type: string;
  reference_type: string; reference_id: string | null;
  amount_rs: number; direction: string; description: string;
  fiscal_month: string; recorded_at: string; linked_ration_card: string | null;
}

interface FinSummary {
  dealer_id: string; fiscal_month: string;
  total_credits_rs: string; total_debits_rs: string; net_balance_rs: string;
  sale_count: number; udhari_given_count: number; udhari_received_count: number;
}

type Tab = 'stock' | 'financial' | 'upload';

// ── Helpers ──────────────────────────────────────────────
const DEPT_COLORS: Record<string, string> = {
  REGULAR_FPS: styles.badgeFps,
  MDM: styles.badgeMdm,
  ICDS: styles.badgeIcds,
};

const COMMODITIES = ['All', 'Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses'];
const ENTRY_TYPES = ['All', 'sale', 'expense', 'income', 'udhari_given', 'udhari_received', 'shop_rent', 'commission', 'settlement'];

function formatKg(v: number): string {
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 3 });
}

function formatRs(v: number): string {
  return '₹' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 });
}

function getMonth(offset = 0): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offset);
  return d.toISOString().split('T')[0];
}

// ── Main Component ──────────────────────────────────────
export default function LedgerPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stock');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Stock & Financial Ledger</h1>
      </div>

      <div className={styles.tabs}>
        {(['stock', 'financial', 'upload'] as const).map(t => (
          <button key={t} className={`${styles.tab} ${tab === t ? styles.active : ''}`} onClick={() => setTab(t)}>
            {t === 'stock' ? 'Stock Ledger' : t === 'financial' ? 'Financial Ledger' : 'Upload Data'}
          </button>
        ))}
      </div>

      {tab === 'stock' && <StockLedgerPanel />}
      {tab === 'financial' && <FinancialLedgerPanel />}
      {tab === 'upload' && <UploadPanel dealerId={user?.id ?? ''} />}
    </div>
  );
}

// ── Stock Ledger Panel ───────────────────────────────────
function StockLedgerPanel() {
  const { user } = useAuth();
  const [data, setData] = useState<StockLedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [commodity, setCommodity] = useState('');
  const [department, setDepartment] = useState('');
  const [fiscalMonth, setFiscalMonth] = useState(getMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  function buildUrl(base: string, p: number): string {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (commodity) params.set('commodity', commodity);
    if (department) params.set('department', department);
    if (fiscalMonth) params.set('fiscal_month', fiscalMonth);
    return `${base}?${params.toString()}`;
  }

  const fetchData = useCallback(async (p: number) => {
    const id = ++fetchId.current;
    setLoading(true); setError(null);
    try {
      const url = buildUrl('/ledger/stock', p);
      const data: any = await api.get(url);
      if (id === fetchId.current) {
        setData(data?.data ?? []);
        setTotal(data?.total ?? 0);
        setPage(p);
      }
    } catch (err: any) {
      if (id === fetchId.current) setError(err?.response?.data?.message || err.message || 'Failed to load');
    } finally {
      if (id === fetchId.current) setLoading(false);
    }
  }, [commodity, department, fiscalMonth]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className={styles.filters}>
        <select className={styles.select} value={commodity} onChange={e => setCommodity(e.target.value)}>
          {COMMODITIES.map(c => <option key={c} value={c === 'All' ? '' : c}>{c}</option>)}
        </select>
        <select className={styles.select} value={department} onChange={e => setDepartment(e.target.value)}>
          <option value="">All Departments</option>
          <option value="REGULAR_FPS">Regular FPS</option>
          <option value="MDM">MDM</option>
          <option value="ICDS">ICDS</option>
        </select>
        <input type="month" className={styles.select} value={fiscalMonth.slice(0, 7)} onChange={e => setFiscalMonth(e.target.value + '-01')} />
        <button className={styles.searchBtn} onClick={() => fetchData(1)} disabled={loading}>Search</button>
      </div>

      {error && <div className={styles.error}><span>⚠</span> {error}</div>}

      {loading ? (
        <div className={styles.loader}>Loading stock ledger...</div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>No stock ledger entries found</div>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Commodity</th>
                <th>Department</th>
                <th>Month</th>
                <th>Opening</th>
                <th>Inbound</th>
                <th>Outbound</th>
                <th>Closing</th>
                <th>Avg Offtake</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td><strong>{row.commodity}</strong></td>
                  <td><span className={`${styles.deptBadge} ${DEPT_COLORS[row.department] || ''}`}>{row.department}</span></td>
                  <td>{row.fiscal_month?.slice(0, 7)}</td>
                  <td className={styles.positive}>{formatKg(row.opening_kg)}</td>
                  <td className={styles.positive}>{formatKg(row.inbound_kg)}</td>
                  <td className={styles.negative}>{formatKg(row.outbound_kg)}</td>
                  <td><strong>{formatKg(row.closing_kg)}</strong></td>
                  <td>{formatKg(row.avg_monthly_offtake)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => fetchData(page - 1)}>← Prev</button>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Financial Ledger Panel ───────────────────────────────
function FinancialLedgerPanel() {
  const { user } = useAuth();
  const [data, setData] = useState<FinLedgerRow[]>([]);
  const [summary, setSummary] = useState<FinSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [entryType, setEntryType] = useState('');
  const [fiscalMonth, setFiscalMonth] = useState(getMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  function buildFinUrl(base: string, p: number): string {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) });
    if (entryType) params.set('entry_type', entryType);
    if (fiscalMonth) params.set('fiscal_month', fiscalMonth);
    return `${base}?${params.toString()}`;
  }

  const fetchData = useCallback(async (p: number) => {
    const id = ++fetchId.current;
    setLoading(true); setError(null);
    try {
      const [ledgerData, summaryData]: [any, any] = await Promise.all([
        api.get(buildFinUrl('/ledger/financial', p)),
        api.get('/ledger/financial/summary'),
      ]);
      if (id === fetchId.current) {
        setData(ledgerData?.data ?? []);
        setTotal(ledgerData?.total ?? 0);
        setSummary(Array.isArray(summaryData) ? summaryData : []);
        setPage(p);
      }
    } catch (err: any) {
      if (id === fetchId.current) setError(err?.response?.data?.message || err.message || 'Failed to load');
    } finally {
      if (id === fetchId.current) setLoading(false);
    }
  }, [entryType, fiscalMonth]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {summary.length > 0 && (
        <div className={styles.summaryGrid}>
          {summary.slice(0, 3).map(s => (
            <div key={s.fiscal_month} className={styles.summaryCard}>
              <div className={styles.summaryLabel}>{s.fiscal_month?.slice(0, 7)}</div>
              <div className={styles.summaryValue}>{formatRs(parseFloat(s.net_balance_rs))}</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                {s.sale_count} sales · {s.udhari_given_count} udhari given · {s.udhari_received_count} received
              </div>
            </div>
          ))}
        </div>
      )}

      <div className={styles.filters}>
        <select className={styles.select} value={entryType} onChange={e => setEntryType(e.target.value)}>
          {ENTRY_TYPES.map(t => <option key={t} value={t === 'All' ? '' : t}>{t}</option>)}
        </select>
        <input type="month" className={styles.select} value={fiscalMonth.slice(0, 7)} onChange={e => setFiscalMonth(e.target.value + '-01')} />
        <button className={styles.searchBtn} onClick={() => fetchData(1)} disabled={loading}>Search</button>
      </div>

      {error && <div className={styles.error}><span>⚠</span> {error}</div>}

      {loading ? (
        <div className={styles.loader}>Loading financial ledger...</div>
      ) : data.length === 0 ? (
        <div className={styles.empty}>No financial ledger entries found</div>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Direction</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Ration Card</th>
                <th>Month</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <tr key={row.id}>
                  <td>{new Date(row.recorded_at).toLocaleDateString()}</td>
                  <td><span className={styles.badge}>{row.entry_type}</span></td>
                  <td>
                    <span className={`${styles.badge} ${row.direction === 'credit' ? styles.badgeCredit : styles.badgeDebit}`}>
                      {row.direction}
                    </span>
                  </td>
                  <td><strong>{formatRs(row.amount_rs)}</strong></td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.description}</td>
                  <td>{row.linked_ration_card || '—'}</td>
                  <td>{row.fiscal_month?.slice(0, 7)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pagination}>
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={styles.pageBtn} disabled={page <= 1} onClick={() => fetchData(page - 1)}>← Prev</button>
              <button className={styles.pageBtn} disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>Next →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Upload Panel ─────────────────────────────────────────
function UploadPanel({ dealerId }: { dealerId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null); setError(null);
    try {
      const buf = await f.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: '' });
      setPreview(rows.slice(0, 20));
    } catch {
      setError('Could not parse file. Ensure it is a valid .xlsx or .csv.');
      setPreview([]);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleUpload = useCallback(async () => {
    if (preview.length === 0) return;
    setLoading(true); setResult(null); setError(null);
    try {
      const res: any = await api.post('/sync/import/transactions/flexible', {
        rows: preview,
        source: 'EXCEL_SYNC',
      });
      setResult(res);
      toast.success(`Imported: ${res.inserted} new, ${res.updated} updated`);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err.message || 'Upload failed';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [preview]);

  const detectedHeaders = preview.length > 0 ? Object.keys(preview[0]) : [];

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Import Transactions from File</h2>
      <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
        Upload the government portal Excel/CSV export. Column headers are automatically mapped
        (e.g., <code>RATION CARD NO</code>, <code>Head of Family</code>, <code>Quantity (Kg)</code>).
        Existing transactions are matched by ration card + month + commodity — duplicates are skipped or overridden.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }}
      />

      <div
        className={`${styles.uploadArea} ${dragging ? styles.dragging : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <svg className={styles.uploadIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
        </svg>
        <div className={styles.uploadText}>Drop Excel/CSV file here or click to browse</div>
        <div className={styles.uploadHint}>Supports .xlsx, .xls, .csv from Gujarat eFPS portal</div>
      </div>

      {file && (
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>{file.name}</span>
          <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
          <button className={styles.removeBtn} onClick={() => { setFile(null); setPreview([]); setResult(null); setError(null); }}>Remove</button>
        </div>
      )}

      {detectedHeaders.length > 0 && (
        <div className={styles.fieldMapping}>
          <div className={styles.fieldMappingTitle}>Detected Column Mapping</div>
          <div className={styles.mappingGrid}>
            {detectedHeaders.map(h => (
              <div key={h} className={styles.mappingLabel}>{h}</div>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
            Headers are normalized automatically — no renaming needed
          </div>
        </div>
      )}

      {preview.length > 0 && !result && (
        <div className={styles.previewSection}>
          <div className={styles.fieldMappingTitle}>Preview ({preview.length} rows)</div>
          <div style={{ maxHeight: 300, overflow: 'auto' }}>
            <table className={styles.previewTable}>
              <thead>
                <tr>
                  {detectedHeaders.map(h => <th key={h}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    {detectedHeaders.map(h => <td key={h}>{row[h]}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <div className={`${styles.resultBanner} ${styles.resultError}`}>
          <svg className={styles.resultIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>{error}</div>
        </div>
      )}

      {result && (
        <div className={`${styles.resultBanner} ${styles.resultSuccess}`}>
          <svg className={styles.resultIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <strong>Import Complete</strong>
            <div className={styles.resultStats}>
              <span className={`${styles.statBadge} ${styles.statInserted}`}>+{result.inserted} new</span>
              <span className={`${styles.statBadge} ${styles.statUpdated}`}>~{result.updated} updated</span>
              <span className={`${styles.statBadge} ${styles.statSkipped}`}>= {result.skipped} unchanged</span>
              {result.errors > 0 && <span className={`${styles.statBadge} ${styles.statErrors}`}>! {result.errors} errors</span>}
            </div>
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button className={styles.btnPrimary} onClick={handleUpload} disabled={preview.length === 0 || loading}>
          {loading ? 'Importing...' : `Import ${preview.length} Transactions`}
        </button>
        {result && <button className={styles.btnSecondary} onClick={() => { setFile(null); setPreview([]); setResult(null); setError(null); }}>Upload Another File</button>}
      </div>
    </div>
  );
}
