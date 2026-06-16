'use client';

import { useState } from 'react';
import { ClipboardList, Download, Printer, Info, CheckCircle, TrendingUp, RefreshCcw } from 'lucide-react';
import styles from './PendingCustomers.module.css';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

// Mock data for pending customers (Category 1)
const PENDING_CUSTOMERS = [
  { srNo: 1, rationCard: 'GJ-0456-8923', name: 'Rajesh Kumar', category: 'BPL', members: 5, lastReceived: 'Apr-2026' },
  { srNo: 2, rationCard: 'GJ-0412-3341', name: 'Sunita Patel', category: 'AAY', members: 3, lastReceived: 'Apr-2026' },
  { srNo: 3, rationCard: 'GJ-0391-7744', name: 'Harish Mehta', category: 'BPL', members: 4, lastReceived: 'May-2026' },
  { srNo: 4, rationCard: 'GJ-0460-2213', name: 'Kamla Sharma', category: 'APL', members: 6, lastReceived: 'Mar-2026' },
  { srNo: 5, rationCard: 'GJ-0388-5517', name: 'Dinesh Solanki', category: 'BPL', members: 2, lastReceived: 'May-2026' },
];

// Mock data for portability (Category 2)
const PORTABILITY_CUSTOMERS = [
  { srNo: 1, rationCard: 'GJ-0510-1122', name: 'Meena Rao', category: 'BPL', members: 4, portabilityShop: 'FPS-Morbi-6' },
  { srNo: 2, rationCard: 'GJ-0503-8891', name: 'Arvind Nair', category: 'AAY', members: 3, portabilityShop: 'FPS-Morbi-2' },
];

export default function PendingCustomersPage() {
  const currentMonth = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonth]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [activeCategory, setActiveCategory] = useState<1 | 2>(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(true);
  // Simulate all customers received for current month (success state)
  const [showSuccessState] = useState(false);

  const filteredPending = PENDING_CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.rationCard.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPortability = PORTABILITY_CUSTOMERS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.rationCard.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const displayData = activeCategory === 1 ? filteredPending : filteredPortability;

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <ClipboardList size={22} />
        </div>
        <h1 className={styles.title}>Pending Customers List</h1>
      </div>

      {/* Detail Report Card */}
      <section className={styles.detailCard}>
        {/* Card Header */}
        <div className={styles.cardHeader}>
          <div className={styles.cardTitleRow}>
            <ClipboardList size={20} className={styles.cardTitleIcon} />
            <h3 className={styles.cardTitle}>Detail Report: Customers Pending to Receive Ration</h3>
          </div>
          <div className={styles.cardActionBtns}>
            <button
              className={styles.exportBtn}
              onClick={() => alert('Exporting to Excel...')}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg>
              Export Excel
            </button>
            <button
              className={styles.printBtn}
              onClick={() => window.print()}
            >
              <Printer size={16} />
              Print Report
            </button>
          </div>
        </div>

        {/* Filter Row */}
        <div className={styles.filterBox}>
          <div className={styles.filterGrid}>
            {/* Month / Year */}
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
                <button
                  className={styles.viewListBtn}
                  onClick={() => setHasSearched(true)}
                >
                  View List
                </button>
              </div>
            </div>

            {/* Segmented Toggle */}
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

            {/* Search */}
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
                <button className={styles.searchBtn} type="button">
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className={styles.infoNote}>
          <Info size={18} className={styles.infoNoteIcon} />
          <p className={styles.infoNoteText}>
            Note: If your customer has already received grain from another shop under the Portability scheme, they will not appear in the &quot;Pending&quot; list. Please use Category 2 to verify portability transactions.
          </p>
        </div>

        {/* Success State (if all distributed) */}
        {showSuccessState ? (
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
                <button
                  className={styles.downloadSummaryBtn}
                  onClick={() => alert('Downloading Monthly Summary...')}
                >
                  Download Monthly Summary
                </button>
              </div>
            </div>
            <div className={styles.auditIllustration}>
              <span className={styles.auditBgIcon}>✓</span>
              <div className={styles.auditTextBlock}>
                <p className={styles.auditLabel}>Efficiency Audit v4.2</p>
                <p className={styles.auditDesc}>100% Distribution Compliance achieved for the current cycle.</p>
              </div>
            </div>
          </>
        ) : (
          /* Pending Table */
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

      {/* Stats Snapshot */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Total Beneficiaries</span>
          <p className={styles.statValue}>1,482</p>
          <div className={`${styles.statTrend} ${styles.statTrendGreen}`}>
            <TrendingUp size={14} />
            2.4% vs last month
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Distribution Rate</span>
          <p className={styles.statValue}>
            {PENDING_CUSTOMERS.length === 0 ? '100.0%' : `${(((1482 - PENDING_CUSTOMERS.length) / 1482) * 100).toFixed(1)}%`}
          </p>
          <div className={`${styles.statTrend} ${styles.statTrendGreen}`}>
            <CheckCircle size={14} />
            Cycle in Progress
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Portability In</span>
          <p className={styles.statValue}>42</p>
          <div className={`${styles.statTrend} ${styles.statTrendNeutral}`}>
            <RefreshCcw size={14} />
            External customers
          </div>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Stock Balance (Wheat)</span>
          <p className={styles.statValue}>45.2 <span className={styles.statValueUnit}>QT</span></p>
          <div className={`${styles.statTrend} ${styles.statTrendRed}`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Low Stock Alert
          </div>
        </div>
      </div>
    </div>
  );
}
