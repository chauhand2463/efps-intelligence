'use client';

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { ClipboardList, Printer, Info, CheckCircle, TrendingUp, RefreshCcw, Loader2 } from 'lucide-react';
import styles from './PendingCustomers.module.css';
import { api } from '@/lib/api';
import type { Beneficiary } from '@/lib/types';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

interface PendingItem {
  beneficiary_id: string;
  head_of_family: string;
  ration_card_no: string;
}

export default function PendingCustomersPage() {
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonth]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [activeCategory, setActiveCategory] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const [pendingData, setPendingData] = useState<PendingItem[]>([]);
  const [portabilityData, setPortabilityData] = useState<Beneficiary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [pending, beneficiaries] = await Promise.all([
        api.get<PendingItem[]>('/transactions/pending'),
        api.get<Beneficiary[]>('/beneficiaries'),
      ]);
      setPendingData(pending);
      setPortabilityData(beneficiaries);
      setHasSearched(true);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const mappedPending = pendingData.map((item, idx) => ({
    srNo: idx + 1,
    rationCard: item.ration_card_no,
    name: item.head_of_family,
    category: '—' as const,
    members: '—' as const,
    lastReceived: '—' as const,
  }));

  const mappedPortability = portabilityData.map((item, idx) => ({
    srNo: idx + 1,
    rationCard: item.ration_card_no,
    name: item.head_of_family,
    category: item.category ?? '—',
    members: item.member_count,
    portabilityShop: '—' as const,
  }));

  const filteredPending = mappedPending.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.rationCard.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPortability = mappedPortability.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.rationCard.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayData = activeCategory === 1 ? filteredPending : filteredPortability;
  const showSuccessState = hasSearched && activeCategory === 1 && filteredPending.length === 0 && !loading;

  const handleExportExcel = () => {
    if (displayData.length === 0) {
      toast.error('No data to export');
      return;
    }
    const headers = activeCategory === 1
      ? 'SrNo,Ration Card No,Card Holder Name,Category,Members,Last Received'
      : 'SrNo,Ration Card No,Card Holder Name,Category,Members,Portability Shop';
    const csv = [
      headers,
      ...displayData.map(c =>
        `${c.srNo},${c.rationCard},${c.name},${c.category},${c.members},${'lastReceived' in c ? c.lastReceived : (c as { portabilityShop: string }).portabilityShop}`
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pending-customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  const handleDownloadSummary = () => {
    if (portabilityData.length === 0) {
      toast.error('No summary data available');
      return;
    }
    const total = portabilityData.length;
    const pending = pendingData.length;
    const rate = total > 0 ? ((total - pending) / total * 100).toFixed(1) : '100.0';
    const csv = [
      `Monthly Summary - ${selectedMonth} ${selectedYear}`,
      `Total Beneficiaries,${total}`,
      `Pending Distribution,${pending}`,
      `Distribution Rate,${rate}%`,
      ',,',
      'SrNo,Ration Card No,Card Holder Name',
      ...pendingData.map((p, i) => `${i + 1},${p.ration_card_no},${p.head_of_family}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-summary-${selectedMonth.toLowerCase()}-${selectedYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Monthly summary downloaded');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <ClipboardList size={22} />
        </div>
        <h1 className={styles.title}>Pending Customers List</h1>
      </div>

      <section className={styles.detailCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <ClipboardList size={20} className={styles.cardTitleIcon} />
            <h3 className={styles.cardTitle}>Detail Report: Customers Pending to Receive Ration</h3>
          </div>
          <div className={styles.cardActionBtns}>
            <button className={styles.exportBtn} onClick={handleExportExcel}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
              Export Excel
            </button>
            <button className={styles.printBtn} onClick={() => window.print()}>
              <Printer size={16} />
              Print Report
            </button>
          </div>
        </div>

        <div className={styles.filterBox}>
          <div className={styles.filterGrid}>
            <div>
              <label className={styles.filterLabel}>Report Month</label>
              <div className={styles.monthYearRow}>
                <select
                  className={styles.monthSelect}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
                <select
                  className={styles.yearSelect}
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button className={styles.viewListBtn} onClick={() => fetchData()}>
                  View List
                </button>
              </div>
            </div>

            <div>
              <label className={styles.filterLabel}>Filter Category</label>
              <div className={styles.segmentedToggle}>
                <button
                  className={`${styles.segmentBtn} ${activeCategory === 1 ? styles.activeSegment : ''}`}
                  onClick={() => setActiveCategory(1)}
                >
                  1. Pending to Receive Grain
                </button>
                <button
                  className={`${styles.segmentBtn} ${activeCategory === 2 ? styles.activeSegment : ''}`}
                  onClick={() => setActiveCategory(2)}
                >
                  2. Received from Other Shop
                </button>
              </div>
            </div>

            <div>
              <label className={styles.filterLabel}>Search Customer</label>
              <div className={styles.searchBoxWrapper}>
                <input
                  className={styles.searchInput}
                  type="text"
                  placeholder="RC Number or Name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div className={styles.infoNote}>
          <Info size={18} className={styles.infoNoteIcon} />
          <p className={styles.infoNoteText}>
            Note: If your customer has already received grain from another shop under the Portability scheme, they will not appear in the &quot;Pending&quot; list. Please use Category 2 to verify portability transactions.
          </p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '48px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
            <Loader2 className="spin" size={24} style={{ marginRight: '8px' }} />
            Loading customers...
          </div>
        ) : showSuccessState ? (
          <>
            <div className={styles.successBanner}>
              <div className={styles.successIconCircle}>
                <CheckCircle size={48} color="#10B981" />
              </div>
              <h4 className={styles.successTitle}>Excellent!</h4>
              <p className={styles.successDesc}>
                All your customers have received their grain for <strong>{selectedMonth}-{selectedYear}</strong>. None are pending!
              </p>
              <div className={styles.successActionRow}>
                <button className={styles.downloadSummaryBtn} onClick={handleDownloadSummary}>
                  Download Monthly Summary
                </button>
              </div>
            </div>
            <div className={styles.auditIllustration}>
              <span className={styles.auditBgIcon}>✓</span>
              <div className={styles.auditTextBlock}>
                <p className={styles.auditLabel}>Efficiency Audit</p>
                <p className={styles.auditDesc}>Distribution Compliance achieved for the current cycle.</p>
              </div>
            </div>
          </>
        ) : (
          hasSearched && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.th}>Sr No.</th>
                    <th className={styles.th}>Ration Card No.</th>
                    <th className={styles.th}>Card Holder Name</th>
                    <th className={styles.th}>Category</th>
                    <th className={styles.th}>Members</th>
                    {activeCategory === 1
                      ? <th className={styles.th}>Last Received</th>
                      : <th className={styles.th}>Portability Shop</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  {displayData.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                        No customers found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    displayData.map((cust, idx) => (
                      <tr key={cust.srNo} className={`${styles.tr} ${idx % 2 === 0 ? styles.trOdd : styles.trEven}`}>
                        <td className={styles.td}>{cust.srNo}</td>
                        <td className={styles.td} style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>{cust.rationCard}</td>
                        <td className={styles.td} style={{ fontWeight: 600 }}>{cust.name}</td>
                        <td className={styles.td}>{cust.category}</td>
                        <td className={styles.td}>{cust.members}</td>
                        <td className={styles.td}>
                          {'lastReceived' in cust ? cust.lastReceived : (cust as { portabilityShop: string }).portabilityShop}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )
        )}
      </section>

      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Beneficiaries</span>
          <p className={styles.statValue}>{portabilityData.length.toLocaleString()}</p>
          <div className={`${styles.statTrend} ${styles.statTrendGreen}`}>
            <TrendingUp size={14} />
            Active records
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Distribution Rate</span>
          <p className={styles.statValue}>
            {portabilityData.length > 0
              ? `${(((portabilityData.length - pendingData.length) / portabilityData.length) * 100).toFixed(1)}%`
              : '100.0%'}
          </p>
          <div className={`${styles.statTrend} ${styles.statTrendGreen}`}>
            <CheckCircle size={14} />
            Cycle in Progress
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Pending</span>
          <p className={styles.statValue}>{pendingData.length}</p>
          <div className={`${styles.statTrend} ${styles.statTrendNeutral}`}>
            <RefreshCcw size={14} />
            Awaiting distribution
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Active Beneficiaries</span>
          <p className={styles.statValue}>{portabilityData.filter(b => b.is_active).length}</p>
          <div className={`${styles.statTrend} ${styles.statTrendRed}`}>
            Current cycle
          </div>
        </div>
      </div>
    </div>
  );
}
