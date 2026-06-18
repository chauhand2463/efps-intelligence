'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Package, RefreshCw, Save, Users, History, Plus, X, Search,
  AlertTriangle, CheckCircle, Loader2, ExternalLink, ArrowUpDown,
  Printer, Download,
} from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import styles from './StockEntry.module.css';

const COMMODITIES = ['Wheat', 'Rice', 'Sugar', 'Kerosene', 'Oil', 'Pulses'];

interface CommodityRow {
  commodityId: string | null;
  name: string;
  allocated: number;
  received: number;
  damaged: number;
  available: number;
  short: number;
  remarks: string;
  saved: boolean;
}

interface AllocationRow {
  id: string;
  beneficiary_id: string;
  commodity: string;
  allocated_quantity: number;
  lifted_quantity: number;
  remaining_quantity: number;
  status: string;
  ration_card_no: string;
  head_of_family: string;
  category: string;
}

interface HistoryRow {
  date: string;
  commodity: string;
  quantity: number;
  type: string;
  ref_no: string;
  status: string;
}

export default function StockEntryPage() {
  const [activeTab, setActiveTab] = useState<'entry' | 'allocations' | 'history'>('entry');
  const [commodities, setCommodities] = useState<CommodityRow[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAllocModal, setShowAllocModal] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [allocBeneficiary, setAllocBeneficiary] = useState('');
  const [allocCommodity, setAllocCommodity] = useState('Rice');
  const [allocQuantity, setAllocQuantity] = useState('');
  const [benefSearch, setBenefSearch] = useState('');
  const [benefResults, setBenefResults] = useState<Array<{ id: string; head_of_family: string; ration_card_no: string }>>([]);
  const [searching, setSearching] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);

  const fetchToday = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<{ date: string; commodities: CommodityRow[] }>('/stock/today');
      setCommodities(data.commodities);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to load stock data');
    } finally { setLoading(false); }
  }, []);

  const fetchAllocations = useCallback(async () => {
    try {
      const data = await api.get<AllocationRow[]>('/allocations/monthly');
      setAllocations(data);
    } catch { /* ignore */ }
  }, []);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      const resp = await api.get<{ data: any[]; meta: any }>(`/transactions?page=${page}&limit=20`, { rawResponse: true });
      const mapped: HistoryRow[] = (resp.data ?? []).map((tx: any) => ({
        date: tx.transaction_date,
        commodity: tx.commodity,
        quantity: tx.quantity_kg,
        type: 'sale',
        ref_no: tx.id,
        status: 'completed',
      }));
      setHistory(mapped);
      setHistoryTotal(resp.meta?.total ?? 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchToday(); fetchAllocations(); fetchHistory(); }, []);

  const updateRow = (idx: number, field: 'received' | 'damaged' | 'remarks', value: string | number) => {
    setCommodities(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'received' || field === 'damaged') {
        const r = field === 'received' ? Number(value) : next[idx].received;
        const d = field === 'damaged' ? Number(value) : next[idx].damaged;
        if (r > next[idx].allocated) {
          toast.error(`${next[idx].name}: Received quantity (${r}) cannot exceed allocation (${next[idx].allocated})`);
        }
      }
      return next;
    });
  };

  const handleSave = async () => {
    const entries = commodities
      .filter(c => c.received > 0 || c.damaged > 0)
      .map(c => ({
        commodityId: c.commodityId ?? c.name,
        commodity: c.name,
        received: c.received,
        damaged: c.damaged,
        remarks: c.remarks,
      }));

    if (entries.length === 0) { toast.error('Enter at least one commodity'); return; }

    for (const e of entries) {
      if (e.received > commodities.find(c => c.name === e.commodity)?.allocated!) {
        toast.error(`${e.commodity}: Received exceeds government allocation`);
        return;
      }
    }

    setSaving(true);
    try {
      await api.post('/stock/entry', { date: new Date().toISOString().split('T')[0], entries });
      toast.success('Stock entry saved successfully');
      fetchToday();
      fetchHistory();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save stock entry');
    } finally { setSaving(false); }
  };

  const handleAllocate = async () => {
    if (!allocBeneficiary || !allocQuantity || Number(allocQuantity) <= 0) {
      toast.error('Select a beneficiary and enter a valid quantity');
      return;
    }
    setAllocating(true);
    try {
      await api.post('/allocations', {
        beneficiary_id: allocBeneficiary,
        commodity: allocCommodity,
        allocated_quantity: Number(allocQuantity),
        allocation_month: new Date().toISOString().slice(0, 7) + '-01',
      });
      toast.success('Allocation saved');
      setShowAllocModal(false);
      setAllocBeneficiary('');
      setAllocQuantity('');
      fetchAllocations();
    } catch (err: any) {
      toast.error(err?.message || 'Allocation failed');
    } finally { setAllocating(false); }
  };

  const searchBeneficiaries = async (q: string) => {
    setBenefSearch(q);
    if (q.length < 2) { setBenefResults([]); return; }
    setSearching(true);
    try {
      const data = await api.get<Array<{ id: string; head_of_family: string; ration_card_no: string }>>(`/beneficiaries/search?q=${encodeURIComponent(q)}&limit=10`);
      setBenefResults(data);
    } catch { setBenefResults([]); }
    finally { setSearching(false); }
  };

  const totalReceived = commodities.reduce((s, c) => s + c.received, 0);
  const totalDamaged = commodities.reduce((s, c) => s + c.damaged, 0);
  const totalAvailable = commodities.reduce((s, c) => s + Math.max(0, c.received - c.damaged), 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIcon}><Package size={22} /></div>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Stock Entry</h1>
          <p className={styles.subtitle}>Record government allocations and manage commodity distribution</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className={styles.refreshBtn} onClick={() => { fetchToday(); fetchAllocations(); fetchHistory(); }}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className={styles.entryBtn} onClick={() => window.print()}>
            <Printer size={14} /> Print
          </button>
        </div>
      </div>

      {/* Sync Status Bar */}
      <div className={styles.syncBar}>
        <CheckCircle size={16} className={styles.syncBarIcon} />
        <span>eFPS sync active. Government allocations are auto-filled after synchronization.</span>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'entry' ? styles.tabActive : ''}`} onClick={() => setActiveTab('entry')}>
          <Package size={14} style={{ marginRight: 6 }} /> Stock Entry
        </button>
        <button className={`${styles.tab} ${activeTab === 'allocations' ? styles.tabActive : ''}`} onClick={() => setActiveTab('allocations')}>
          <Users size={14} style={{ marginRight: 6 }} /> Allocations
        </button>
        <button className={`${styles.tab} ${activeTab === 'history' ? styles.tabActive : ''}`} onClick={() => setActiveTab('history')}>
          <History size={14} style={{ marginRight: 6 }} /> History
        </button>
      </div>

      {activeTab === 'entry' && (
        <Card>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Today's Stock Entry — {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</h3>
            <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
          </div>

          {loading ? (
            <div className={styles.emptyState}><Loader2 size={32} className="spin" /><p>Loading allocations...</p></div>
          ) : (
            <>
              <div className={styles.entryGrid}>
                <table className={styles.entryTable}>
                  <thead>
                    <tr>
                      <th>Commodity</th>
                      <th>Unit</th>
                      <th style={{ textAlign: 'right' }}>Govt Allocation</th>
                      <th style={{ textAlign: 'right' }}>Received</th>
                      <th style={{ textAlign: 'right' }}>Damaged</th>
                      <th style={{ textAlign: 'right' }}>Available</th>
                      <th style={{ textAlign: 'right' }}>Short</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commodities.map((c, i) => {
                      const avail = Math.max(0, c.received - c.damaged);
                      const short = Math.max(0, c.allocated - c.received);
                      const receivedErr = c.received > c.allocated;
                      const damagedErr = c.damaged > c.received;
                      return (
                        <tr key={c.name}>
                          <td><span className={styles.commodityName}>{c.name}</span></td>
                          <td>Kg</td>
                          <td style={{ textAlign: 'right' }}>
                            <input className={styles.inputReadonly} value={c.allocated} readOnly />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              className={`${styles.inputEditable} ${receivedErr ? styles.inputError : ''}`}
                              type="number" min="0" step="0.001"
                              value={c.received || ''}
                              placeholder="0"
                              onChange={e => updateRow(i, 'received', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <input
                              className={`${styles.inputEditable} ${damagedErr ? styles.inputError : ''}`}
                              type="number" min="0" step="0.001"
                              value={c.damaged || ''}
                              placeholder="0"
                              onChange={e => updateRow(i, 'damaged', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={`${styles.autoValue} ${avail > 0 ? styles.positive : styles.neutral}`}>
                              {avail.toFixed(2)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <span className={`${styles.autoValue} ${short > 0 ? styles.negative : styles.neutral}`}>
                              {short.toFixed(2)}
                            </span>
                          </td>
                          <td>
                            <input
                              className={styles.inputEditable}
                              style={{ width: 140 }}
                              value={c.remarks || ''}
                              placeholder="—"
                              onChange={e => updateRow(i, 'remarks', e.target.value)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: 32, justifyContent: 'flex-end', marginTop: 16, padding: '12px 0', borderTop: '1px solid var(--border-light)' }}>
                <div><span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Received</span><br /><span style={{ fontSize: 18, fontWeight: 700, color: 'var(--online-green)' }}>{totalReceived.toFixed(2)} kg</span></div>
                <div><span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Damaged</span><br /><span style={{ fontSize: 18, fontWeight: 700, color: 'var(--offline-red)' }}>{totalDamaged.toFixed(2)} kg</span></div>
                <div><span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Total Available</span><br /><span style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-navy)' }}>{totalAvailable.toFixed(2)} kg</span></div>
              </div>
            </>
          )}
        </Card>
      )}

      {activeTab === 'allocations' && (
        <Card>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Monthly Allocations</h3>
            <button className={styles.saveBtn} onClick={() => setShowAllocModal(true)}>
              <Plus size={14} /> Allocate
            </button>
          </div>

          {allocations.length === 0 ? (
            <div className={styles.emptyState}>
              <Users size={40} style={{ opacity: 0.3 }} />
              <h3>No allocations yet</h3>
              <p>Allocate commodities to beneficiaries to track distribution.</p>
            </div>
          ) : (
            <div className={styles.entryGrid}>
              <table className={styles.entryTable}>
                <thead>
                  <tr>
                    <th>Ration Card</th>
                    <th>Family Head</th>
                    <th>Commodity</th>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Allocated</th>
                    <th style={{ textAlign: 'right' }}>Lifted</th>
                    <th style={{ textAlign: 'right' }}>Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(a => {
                    const statusClass = a.status === 'active' ? styles.allocActive : a.status === 'completed' ? styles.allocCompleted : a.status === 'cancelled' ? styles.allocCancelled : styles.allocPending;
                    return (
                      <tr key={a.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{a.ration_card_no}</td>
                        <td style={{ fontWeight: 500 }}>{a.head_of_family}</td>
                        <td>{a.commodity}</td>
                        <td>{a.category}</td>
                        <td style={{ textAlign: 'right' }}>{a.allocated_quantity}</td>
                        <td style={{ textAlign: 'right' }}>{a.lifted_quantity}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>{a.remaining_quantity}</td>
                        <td><span className={`${styles.allocBadge} ${statusClass}`}>{a.status}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'history' && (
        <Card>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Transaction History</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select className={styles.searchInput} style={{ width: 140, height: 36 }} onChange={e => { /* filter by type */ }}>
                <option value="all">All Types</option>
                <option value="receipt">Receipt</option>
                <option value="sale">Sale</option>
                <option value="damage">Damage</option>
                <option value="adjustment">Adjustment</option>
              </select>
            </div>
          </div>

          {history.length === 0 ? (
            <div className={styles.emptyState}>
              <History size={40} style={{ opacity: 0.3 }} />
              <h3>No transactions yet</h3>
              <p>Stock entry and allocation history will appear here.</p>
            </div>
          ) : (
            <div className={styles.entryGrid}>
              <table className={styles.historyTable}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Commodity</th>
                    <th style={{ textAlign: 'right' }}>Quantity</th>
                    <th>Type</th>
                    <th>Reference</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(h.date).toLocaleDateString('en-IN')}</td>
                      <td style={{ fontWeight: 500 }}>{h.commodity}</td>
                      <td style={{ textAlign: 'right' }}>{h.quantity} kg</td>
                      <td><span className={`${styles.allocBadge} ${h.type === 'receipt' ? styles.allocActive : h.type === 'sale' ? styles.allocCompleted : styles.allocPending}`}>{h.type}</span></td>
                      <td style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-muted)' }}>{h.ref_no?.slice(0, 8)}...</td>
                      <td><span className={`${styles.allocBadge} ${h.status === 'completed' ? styles.allocActive : styles.allocPending}`}>{h.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {historyTotal > 20 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, padding: 16 }}>
                  <button className={styles.refreshBtn} disabled={historyPage <= 1} onClick={() => { setHistoryPage(p => p - 1); fetchHistory(historyPage - 1); }}>Previous</button>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)', alignSelf: 'center' }}>Page {historyPage} of {Math.ceil(historyTotal / 20)}</span>
                  <button className={styles.refreshBtn} disabled={historyPage >= Math.ceil(historyTotal / 20)} onClick={() => { setHistoryPage(p => p + 1); fetchHistory(historyPage + 1); }}>Next</button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {showAllocModal && (
        <div className={styles.modalOverlay} onClick={() => setShowAllocModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>New Allocation</h3>
              <button onClick={() => setShowAllocModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.modalField}>
              <label>Search Beneficiary</label>
              <input
                className={styles.searchInput}
                style={{ width: '100%' }}
                placeholder="Type name or ration card number..."
                value={benefSearch}
                onChange={e => searchBeneficiaries(e.target.value)}
              />
              {searching && <Loader2 size={14} className="spin" style={{ marginTop: 4 }} />}
              {benefResults.length > 0 && (
                <div style={{ marginTop: 8, border: '1px solid var(--border-light)', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                  {benefResults.map(b => (
                    <div
                      key={b.id}
                      onClick={() => { setAllocBeneficiary(b.id); setBenefSearch(`${b.head_of_family} (${b.ration_card_no})`); setBenefResults([]); }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between' }}
                    >
                      <span style={{ fontWeight: 500 }}>{b.head_of_family}</span>
                      <span style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>{b.ration_card_no}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.modalField}>
              <label>Commodity</label>
              <select value={allocCommodity} onChange={e => setAllocCommodity(e.target.value)}>
                {COMMODITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className={styles.modalField}>
              <label>Allocated Quantity (kg)</label>
              <input
                type="number" min="0" step="0.001" placeholder="e.g. 5"
                value={allocQuantity}
                onChange={e => setAllocQuantity(e.target.value)}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={`${styles.modalBtn} ${styles.modalBtnSecondary}`} onClick={() => setShowAllocModal(false)}>Cancel</button>
              <button className={`${styles.modalBtn} ${styles.modalBtnPrimary}`} onClick={handleAllocate} disabled={allocating || !allocBeneficiary || !allocQuantity}>
                {allocating ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                {allocating ? 'Allocating...' : 'Confirm Allocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
