'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  BookOpen, TrendingUp, Upload, Download, RefreshCw, Search,
  AlertCircle, ChevronLeft, ChevronRight, Loader2, FileSpreadsheet,
  Package, DollarSign, Filter, ArrowUpDown, CheckCircle, XCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SkeletonTable, SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './StockLedger.module.css';
import * as XLSX from 'xlsx';

interface StockLedgerRow {
  id: string; commodity: string; department: string; fiscal_month: string;
  opening_kg: number; inbound_kg: number; outbound_kg: number;
  closing_kg: number; unit: string; avg_monthly_offtake: number;
}

interface FinLedgerRow {
  id: string; entry_type: string; direction: string; amount_rs: number;
  description: string; fiscal_month: string; recorded_at: string;
  linked_ration_card: string | null;
}

interface FinSummary {
  fiscal_month: string; net_balance_rs: string;
  sale_count: number; udhari_given_count: number; udhari_received_count: number;
}

type Tab = 'stock' | 'financial' | 'upload';

const COMMODITIES = ['All', 'Rice', 'Wheat', 'Sugar', 'Kerosene', 'Oil', 'Pulses'];
const ENTRY_TYPES = ['All', 'sale', 'expense', 'income', 'udhari_given', 'udhari_received', 'shop_rent', 'commission', 'settlement'];

function fmtKg(v: number): string {
  return Number(v).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 3 });
}
function fmtRs(v: number): string {
  return '\u20B9' + Number(v).toLocaleString(undefined, { minimumFractionDigits: 2 });
}
function currMonth(offset = 0): string {
  const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + offset);
  return d.toISOString().split('T')[0];
}
function monthLabel(m: string): string {
  if (!m) return '';
  const d = new Date(m + 'T00:00:00');
  return d.toLocaleString('en-IN', { month: 'short', year: 'numeric' });
}

function deptClass(dept: string): string {
  if (dept === 'REGULAR_FPS') return styles.deptFps;
  if (dept === 'MDM') return styles.deptMdm;
  if (dept === 'ICDS') return styles.deptIcds;
  return '';
}

export default function LedgerPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('stock');

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}><BookOpen size={22} /></div>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Stock & Financial Ledger</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>
            Track physical stock movements, financial transactions, and import government data
          </p>
        </div>
      </div>

      <div className={styles.tabs}>
        {[
          { id: 'stock' as Tab, label: 'Stock Ledger', icon: Package },
          { id: 'financial' as Tab, label: 'Financial Ledger', icon: DollarSign },
          { id: 'upload' as Tab, label: 'Upload Data', icon: Upload },
        ].map(t => (
          <button key={t.id} className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`} onClick={() => setTab(t.id)}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'stock' && <StockLedgerPanel />}
      {tab === 'financial' && <FinancialLedgerPanel />}
      {tab === 'upload' && <UploadPanel dealerId={user?.id ?? ''} />}
    </div>
  );
}

function StockLedgerPanel() {
  const [data, setData] = useState<StockLedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [commodity, setCommodity] = useState('');
  const [department, setDepartment] = useState('');
  const [fiscalMonth, setFiscalMonth] = useState(currMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  const fetchData = useCallback(async (p: number) => {
    const id = ++fetchId.current;
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (commodity) params.set('commodity', commodity);
      if (department) params.set('department', department);
      if (fiscalMonth) params.set('fiscal_month', fiscalMonth);
      const res: any = await api.get(`/ledger/stock?${params}`);
      if (id === fetchId.current) {
        setData(res?.data ?? []);
        setTotal(res?.total ?? 0);
        setPage(p);
      }
    } catch (err: any) {
      if (id === fetchId.current) setError(err?.message || 'Failed to load');
    } finally {
      if (id === fetchId.current) setLoading(false);
    }
  }, [commodity, department, fiscalMonth]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className={styles.sectionH}>
        <h3>Stock Movement Ledger</h3>
        <Button variant="ghost" size="sm" onClick={() => fetchData(page)} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

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
        <Button variant="primary" size="sm" onClick={() => fetchData(1)} disabled={loading}>
          <Search size={14} /> Search
        </Button>
      </div>

      {error && <div className={styles.error}><AlertCircle size={16} /> {error}</div>}

      {loading ? (
        <Card><SkeletonTable rows={4} /></Card>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package size={40} />}
            title="No Stock Ledger Data"
            description="No stock movements found for the selected filters. Try adjusting your search criteria."
          />
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Commodity</th>
                  <th>Department</th>
                  <th>Month</th>
                  <th style={{ textAlign: 'right' }}>Opening (kg)</th>
                  <th style={{ textAlign: 'right' }}>Inbound (kg)</th>
                  <th style={{ textAlign: 'right' }}>Outbound (kg)</th>
                  <th style={{ textAlign: 'right' }}>Closing (kg)</th>
                  <th style={{ textAlign: 'right' }}>Avg Offtake</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id}>
                    <td><strong>{row.commodity}</strong></td>
                    <td><span className={`${styles.departmentBadge} ${deptClass(row.department)}`}>{row.department}</span></td>
                    <td>{monthLabel(row.fiscal_month)}</td>
                    <td style={{ textAlign: 'right' }} className={styles.positive}>{fmtKg(row.opening_kg)}</td>
                    <td style={{ textAlign: 'right' }} className={styles.positive}>{fmtKg(row.inbound_kg)}</td>
                    <td style={{ textAlign: 'right' }} className={styles.negative}>{fmtKg(row.outbound_kg)}</td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtKg(row.closing_kg)}</strong></td>
                    <td style={{ textAlign: 'right' }}>{fmtKg(row.avg_monthly_offtake)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={styles.pageNav} disabled={page <= 1} onClick={() => fetchData(page - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className={styles.pageNav} disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function FinancialLedgerPanel() {
  const [data, setData] = useState<FinLedgerRow[]>([]);
  const [summary, setSummary] = useState<FinSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [entryType, setEntryType] = useState('');
  const [fiscalMonth, setFiscalMonth] = useState(currMonth());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchId = useRef(0);

  const fetchData = useCallback(async (p: number) => {
    const id = ++fetchId.current;
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (entryType) params.set('entry_type', entryType);
      if (fiscalMonth) params.set('fiscal_month', fiscalMonth);
      const [ledgerRes, summaryRes]: [any, any] = await Promise.all([
        api.get(`/ledger/financial?${params}`),
        api.get('/ledger/financial/summary'),
      ]);
      if (id === fetchId.current) {
        setData(ledgerRes?.data ?? []);
        setTotal(ledgerRes?.total ?? 0);
        setSummary(Array.isArray(summaryRes) ? summaryRes : []);
        setPage(p);
      }
    } catch (err: any) {
      if (id === fetchId.current) setError(err?.message || 'Failed to load');
    } finally {
      if (id === fetchId.current) setLoading(false);
    }
  }, [entryType, fiscalMonth]);

  useEffect(() => { fetchData(1); }, [fetchData]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      <div className={styles.sectionH}>
        <h3>Financial Ledger</h3>
        <Button variant="ghost" size="sm" onClick={() => fetchData(page)} disabled={loading}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {summary.length > 0 && (
        <div className={styles.summaryGrid}>
          {summary.slice(0, 3).map(s => (
            <div key={s.fiscal_month} className={styles.summaryCard}>
              <span className={styles.summaryLabel}>{monthLabel(s.fiscal_month)} Net</span>
              <span className={styles.summaryValue} style={{ color: parseFloat(s.net_balance_rs) >= 0 ? 'var(--online-green)' : 'var(--offline-red)' }}>
                {fmtRs(parseFloat(s.net_balance_rs))}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {s.sale_count} sales · {s.udhari_given_count} given · {s.udhari_received_count} received
              </span>
            </div>
          ))}
        </div>
      )}

      <div className={styles.filters}>
        <select className={styles.select} value={entryType} onChange={e => setEntryType(e.target.value)}>
          {ENTRY_TYPES.map(t => <option key={t} value={t === 'All' ? '' : t}>{t}</option>)}
        </select>
        <input type="month" className={styles.select} value={fiscalMonth.slice(0, 7)} onChange={e => setFiscalMonth(e.target.value + '-01')} />
        <Button variant="primary" size="sm" onClick={() => fetchData(1)} disabled={loading}>
          <Search size={14} /> Search
        </Button>
      </div>

      {error && <div className={styles.error}><AlertCircle size={16} /> {error}</div>}

      {loading ? (
        <Card><SkeletonTable rows={4} /></Card>
      ) : data.length === 0 ? (
        <Card>
          <EmptyState
            icon={<DollarSign size={40} />}
            title="No Financial Entries"
            description="No financial ledger entries found. Entries are created automatically when transactions are recorded."
          />
        </Card>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Direction</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th>Description</th>
                  <th>Ration Card</th>
                  <th>Month</th>
                </tr>
              </thead>
              <tbody>
                {data.map(row => (
                  <tr key={row.id}>
                    <td>{new Date(row.recorded_at).toLocaleDateString('en-IN')}</td>
                    <td><span className={`${styles.entryBadge}`}>{row.entry_type}</span></td>
                    <td>
                      <span className={`${styles.entryBadge} ${row.direction === 'credit' ? styles.entryCredit : styles.entryDebit}`}>
                        {row.direction === 'credit' ? <TrendingUp size={12} /> : <ArrowUpDown size={12} />}
                        {row.direction}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}><strong>{fmtRs(row.amount_rs)}</strong></td>
                    <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.description}</td>
                    <td>{row.linked_ration_card || '\u2014'}</td>
                    <td>{monthLabel(row.fiscal_month)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span>{(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={styles.pageNav} disabled={page <= 1} onClick={() => fetchData(page - 1)}>
                <ChevronLeft size={14} /> Prev
              </button>
              <button className={styles.pageNav} disabled={page >= totalPages} onClick={() => fetchData(page + 1)}>
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

function UploadPanel({ dealerId: _dealerId }: { dealerId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f); setResult(null); setError(null);
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
      const msg = err?.message || 'Upload failed';
      setError(msg); toast.error(msg);
    } finally { setLoading(false); }
  }, [preview]);

  const detectedHeaders = preview.length > 0 ? Object.keys(preview[0]) : [];

  return (
    <div>
      <div className={styles.sectionH}>
        <h3>Import Transactions from File</h3>
      </div>
      <Card>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
          Upload the government portal Excel/CSV export. Column headers are automatically mapped
          (e.g. <strong>RATION CARD NO</strong>, <strong>Head of Family</strong>, <strong>Quantity (Kg)</strong>).
          Existing transactions are matched by ration card + month + commodity to avoid duplicates.
        </p>

        <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }}
          onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />

        {!file && (
          <div
            className={`${styles.uploadArea} ${dragging ? styles.uploadAreaDragging : ''}`}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <FileSpreadsheet size={48} className={styles.uploadIcon} />
            <div className={styles.uploadText}>Drop Excel/CSV file here or click to browse</div>
            <div className={styles.uploadHint}>Supports .xlsx, .xls, .csv from Gujarat eFPS portal</div>
          </div>
        )}

        {file && (
          <div className={styles.fileInfo}>
            <FileSpreadsheet size={20} style={{ color: 'var(--online-green)' }} />
            <span className={styles.fileName}>{file.name}</span>
            <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
            <button className={styles.removeBtn} onClick={() => { setFile(null); setPreview([]); setResult(null); setError(null); }}>Remove</button>
          </div>
        )}

        {detectedHeaders.length > 0 && (
          <div className={styles.fieldMapping}>
            <div className={styles.fieldMappingTitle}>Detected Column Headers</div>
            <div className={styles.mappingGrid}>
              {detectedHeaders.map(h => <span key={h} className={styles.mappingChip}>{h}</span>)}
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
              Headers are normalized automatically — no renaming needed
            </p>
          </div>
        )}

        {preview.length > 0 && !result && (
          <div style={{ marginBottom: 24 }}>
            <div className={styles.fieldMappingTitle}>Preview ({preview.length} rows)</div>
            <div style={{ maxHeight: 300, overflow: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
              <table className={styles.previewTable}>
                <thead>
                  <tr>{detectedHeaders.map(h => <th key={h}>{h}</th>)}</tr>
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
            <XCircle size={24} className={styles.resultIcon} />
            <div>{error}</div>
          </div>
        )}

        {result && (
          <div className={`${styles.resultBanner} ${styles.resultSuccess}`}>
            <CheckCircle size={24} className={styles.resultIcon} />
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
          <Button variant="primary" size="md" onClick={handleUpload} disabled={preview.length === 0 || loading}>
            {loading ? <Loader2 size={16} /> : <Upload size={16} />}
            {loading ? 'Importing...' : `Import ${preview.length} Transactions`}
          </Button>
          {result && (
            <Button variant="secondary" size="md" onClick={() => { setFile(null); setPreview([]); setResult(null); setError(null); }}>
              <Upload size={16} /> Upload Another File
            </Button>
          )}
          {file && !result && (
            <Button variant="secondary" size="md" onClick={() => { setFile(null); setPreview([]); setError(null); }}>
              <XCircle size={16} /> Cancel
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
