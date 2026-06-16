'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Eye, Printer, Copy, Info, CheckCircle, Download, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Transaction } from '@/lib/types';
import styles from './Sales.module.css';

interface SalesRow {
  date: string;
  qty: number;
  rate: number;
  amount: number;
}

const itemLabels: Record<string, string> = {
  wheat: 'Wheat',
  rice: 'Rice (AAY)',
  sugar: 'Sugar',
  kerosene: 'Kerosene'
};

const commodityMap: Record<string, string> = {
  wheat: 'Wheat',
  rice: 'Rice',
  sugar: 'Sugar',
  kerosene: 'Kerosene'
};

export default function ItemWiseSalesPage() {
  const [selectedCommodity, setSelectedCommodity] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState('2026');
  
  const [activeCommodity, setActiveCommodity] = useState('');
  const [activeMonth, setActiveMonth] = useState('June');
  const [activeYear, setActiveYear] = useState('2026');
  const [showReport, setShowReport] = useState(false);

  const [overlayText, setOverlayText] = useState('');
  const [overlayDesc, setOverlayDesc] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);

  const [salesRows, setSalesRows] = useState<SalesRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [fetchKey, setFetchKey] = useState(0);

  const handleViewReport = () => {
    if (!selectedCommodity) return;
    setActiveCommodity(selectedCommodity);
    setActiveMonth(selectedMonth);
    setActiveYear(selectedYear);
    setShowReport(true);
    setFetchKey(k => k + 1);
  };

  const triggerPrintNotification = (type: 'single' | 'bulk') => {
    const itemName = itemLabels[activeCommodity || selectedCommodity] || 'Selected Commodity';
    if (type === 'single') {
      setOverlayText('Preparing Print...');
      setOverlayDesc(`Sending report for ${itemName} (${activeMonth} ${activeYear}) to connected printer system.`);
    } else {
      setOverlayText('Preparing Bulk Print...');
      setOverlayDesc(`Sending 4 combined commodity group reports for ${activeMonth} ${activeYear} to connected printer system.`);
    }
    setShowOverlay(true);
    setTimeout(() => {
      setShowOverlay(false);
      window.print();
    }, 1500);
  };

  useEffect(() => {
    if (!showReport || !activeCommodity) return;

    const fetchData = async () => {
      setIsLoading(true);
      setFetchError('');
      try {
        const commodity = commodityMap[activeCommodity];
        const data = await api.get<Transaction[]>(`/transactions?page=1&limit=1000&month=${encodeURIComponent(activeMonth)}&commodity=${encodeURIComponent(commodity)}`);

        const rows: SalesRow[] = data.map((t) => ({
          date: new Date(t.transaction_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
          qty: t.quantity_kg,
          rate: t.price_per_kg ?? 0,
          amount: t.total_amount ?? (t.quantity_kg * (t.price_per_kg ?? 0)),
        }));

        setSalesRows(rows);
      } catch {
        setFetchError('Failed to load sales data. Please try again.');
        setSalesRows([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [showReport, activeCommodity, activeMonth, activeYear, fetchKey]);

  const currentRows = salesRows;
  const totalQty = currentRows.reduce((sum, r) => sum + r.qty, 0);
  const totalAmount = currentRows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <BarChart2 size={24} />
        </div>
        <h1 className={styles.title}>Item-wise Sales</h1>
      </div>

      {/* ZONE 1: FILTER CARD */}
      <section className={styles.filterCard}>
        <div className={styles.filterFlex}>
          <div className={styles.filterControls}>
            {/* SELECT COMMODITY */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>SELECT COMMODITY</label>
              <select 
                className={styles.filterSelect}
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
              >
                <option value="">Select item or combine group...</option>
                <option value="wheat">Wheat</option>
                <option value="rice">Rice (AAY)</option>
                <option value="sugar">Sugar</option>
                <option value="kerosene">Kerosene</option>
              </select>
            </div>

            {/* VIEW MODE */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>VIEW MODE</label>
              <div className={styles.viewModeBox}>
                <CalendarDays size={18} />
                <span>Whole Month</span>
              </div>
            </div>

            {/* MONTH */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>MONTH</label>
              <select 
                className={styles.filterSelect}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="June">June</option>
                <option value="July">July</option>
              </select>
            </div>

            {/* YEAR */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>YEAR</label>
              <select 
                className={styles.filterSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2026">2026</option>
                <option value="2027">2027</option>
              </select>
            </div>

            {/* Buttons */}
            <div className={styles.btnGroup}>
              <button 
                className={styles.primaryBtn} 
                onClick={handleViewReport}
                disabled={!selectedCommodity}
                style={!selectedCommodity ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                <Eye size={18} />
                <span>View Report</span>
              </button>
              <button 
                className={styles.secondaryBtn} 
                onClick={() => triggerPrintNotification('single')}
                disabled={!showReport}
                style={!showReport ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
              >
                <Printer size={18} />
                <span>Single Print</span>
              </button>
            </div>
          </div>

          <div>
            <button 
              className={styles.accentBtn} 
              onClick={() => triggerPrintNotification('bulk')}
            >
              <Copy size={18} />
              <span>Print 4 Combine Groups at Once</span>
            </button>
          </div>
        </div>
      </section>

      {/* ZONE 2: CONTENT */}
      <div>
        {!showReport ? (
          /* EMPTY STATE CARD */
          <div className={styles.emptyCard}>
            <div className={styles.emptyIconContainer}>
              <Info size={36} />
            </div>
            <h3 className={styles.emptyTitle}>No Item Selected</h3>
            <p className={styles.emptyDesc}>
              Please use the selectors above to choose a specific commodity or a combine group to view the detailed sales breakdown.
            </p>
            <div className={styles.infoSteps}>
              <span className={styles.infoStep}>
                <Info size={16} /> Select Month
              </span>
              <span className={styles.infoStep}>
                <Info size={16} /> Choose Item
              </span>
              <span className={styles.infoStep}>
                <Info size={16} /> Click View Report
              </span>
            </div>
          </div>
        ) : (
          /* LOADED REPORT STATE */
          <div className={styles.reportCard}>
            {isLoading ? (
              <div className={styles.emptyCard} style={{ border: 'none' }}>
                <div className={styles.emptyIconContainer}>
                  <Loader2 size={36} className="animate-spin" />
                </div>
                <h3 className={styles.emptyTitle}>Loading sales data...</h3>
                <p className={styles.emptyDesc}>Fetching transactions for {itemLabels[activeCommodity]} ({activeMonth} {activeYear})</p>
              </div>
            ) : fetchError ? (
              <div className={styles.emptyCard} style={{ border: 'none' }}>
                <div className={styles.emptyIconContainer}>
                  <Info size={36} />
                </div>
                <h3 className={styles.emptyTitle}>Error Loading Data</h3>
                <p className={styles.emptyDesc}>{fetchError}</p>
              </div>
            ) : currentRows.length === 0 ? (
              <div className={styles.emptyCard} style={{ border: 'none' }}>
                <div className={styles.emptyIconContainer}>
                  <Info size={36} />
                </div>
                <h3 className={styles.emptyTitle}>No Sales Data</h3>
                <p className={styles.emptyDesc}>No transactions found for {itemLabels[activeCommodity]} in {activeMonth} {activeYear}.</p>
              </div>
            ) : (
              <>
                {/* Report Header */}
                <div className={styles.reportHeader}>
                  <div>
                    <h2 className={styles.reportTitle}>{itemLabels[activeCommodity]} — Item-wise Sales Report</h2>
                    <p className={styles.reportSub}>{activeMonth} {activeYear} · Whole Month View</p>
                  </div>
                  <div className={styles.totalBadgeGroup}>
                    <span className={styles.badgeLabel}>TOTAL SOLD</span>
                    <div className={styles.totalSoldBadge}>{totalQty.toFixed(0)} kg</div>
                  </div>
                </div>

                {/* Table */}
                <div className={styles.tableWrapper}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.th}>DATE</th>
                        <th className={`${styles.th} ${styles.thRight}`}>QUANTITY SOLD (kg)</th>
                        <th className={`${styles.th} ${styles.thRight}`}>RATE (₹/kg)</th>
                        <th className={`${styles.th} ${styles.thRight}`}>AMOUNT (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentRows.map((row, index) => (
                        <tr 
                          key={index} 
                          className={styles.tr}
                          style={index % 2 === 1 ? { backgroundColor: '#FAF8FF' } : undefined}
                        >
                          <td className={styles.td}>{row.date}</td>
                          <td className={`${styles.td} ${styles.tdRight}`}>{row.qty.toFixed(2)}</td>
                          <td className={`${styles.td} ${styles.tdRight}`}>{row.rate.toFixed(2)}</td>
                          <td className={`${styles.td} ${styles.tdRight} ${styles.tdBold}`}>₹ {row.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className={styles.tfoot}>
                      <tr>
                        <td className={styles.tfootTd}>GRAND TOTAL</td>
                        <td className={`${styles.tfootTd} ${styles.tfootTdRight}`}>{totalQty.toFixed(2)} kg</td>
                        <td className={styles.tfootTd}></td>
                        <td className={`${styles.tfootTd} ${styles.tfootTdRight}`}>₹ {totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Report Footer */}
                <div className={styles.reportFooter}>
                  <div className={styles.syncStatus}>
                    <span className={styles.syncDot}></span>
                    <span className={styles.syncText}>Data synced with central server</span>
                  </div>
                  <div className={styles.actionLinks}>
                    <button className={styles.actionLink} onClick={() => alert('CSV Export triggered')}>
                      <Download size={18} />
                      <span>Export CSV</span>
                    </button>
                    <button className={styles.actionLink} onClick={() => alert('PDF Download triggered')}>
                      <FileText size={18} />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Print Overlay Notification */}
      {showOverlay && (
        <div className={styles.overlay}>
          <div className={styles.overlayCard}>
            <div className={styles.overlayIconBox}>
              <CheckCircle size={36} />
            </div>
            <h4 className={styles.overlayTitle}>{overlayText}</h4>
            <p className={styles.overlayDesc}>{overlayDesc}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple fallback helper
function CalendarDays(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
      <path d="M8 14h.01" />
      <path d="M12 14h.01" />
      <path d="M16 14h.01" />
      <path d="M8 18h.01" />
      <path d="M12 18h.01" />
      <path d="M16 18h.01" />
    </svg>
  );
}
