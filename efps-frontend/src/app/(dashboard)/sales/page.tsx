'use client';

import { useState, useEffect } from 'react';
import { BarChart2, Eye, Printer, Info, CheckCircle, Download, FileText, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { Transaction } from '@/lib/types';
import styles from './Sales.module.css';
import toast from 'react-hot-toast';

interface SalesRow {
  date: string;
  qty: number;
  rate: number;
  amount: number;
}

const itemLabels: Record<string, string> = {
  wheat: 'Wheat',
  rice: 'Rice',
  sugar: 'Sugar',
  kerosene: 'Kerosene',
};

const commodityMap: Record<string, string> = {
  wheat: 'Wheat',
  rice: 'Rice',
  sugar: 'Sugar',
  kerosene: 'Kerosene',
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
      setOverlayDesc(`Sending combined commodity group reports for ${activeMonth} ${activeYear} to connected printer system.`);
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

  const handleExportCsv = () => {
    if (currentRows.length === 0) {
      toast.error('No data to export');
      return;
    }
    const csv = [
      'Date,Quantity (kg),Rate (₹/kg),Amount (₹)',
      ...currentRows.map(r => `${r.date},${r.qty},${r.rate},${r.amount}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-${activeCommodity}-${activeMonth}-${activeYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  const handleDownloadPdf = () => {
    window.print();
    toast.success('PDF download initiated via browser print');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <BarChart2 size={24} />
        </div>
        <h1 className={styles.title}>Item-wise Sales</h1>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterFlex}>
          <div className={styles.filterControls}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>SELECT COMMODITY</label>
              <select 
                className={styles.filterSelect}
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
              >
                <option value="">Select item or combine group...</option>
                <option value="wheat">Wheat</option>
                <option value="rice">Rice</option>
                <option value="sugar">Sugar</option>
                <option value="kerosene">Kerosene</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>MONTH</label>
              <select 
                className={styles.filterSelect}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              >
                <option value="June">June</option>
                <option value="July">July</option>
                <option value="August">August</option>
                <option value="May">May</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>YEAR</label>
              <select 
                className={styles.filterSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

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
        </div>
      </section>

      <div>
        {!showReport ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIconContainer}>
              <Info size={36} />
            </div>
            <h3 className={styles.emptyTitle}>No Item Selected</h3>
            <p className={styles.emptyDesc}>
              Please use the selectors above to choose a commodity to view the detailed sales breakdown.
            </p>
          </div>
        ) : (
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

                <div className={styles.reportFooter}>
                  <div className={styles.syncStatus}>
                    <span className={styles.syncDot}></span>
                    <span className={styles.syncText}>Data synced with central server</span>
                  </div>
                  <div className={styles.actionLinks}>
                    <button className={styles.actionLink} onClick={handleExportCsv}>
                      <Download size={18} />
                      <span>Export CSV</span>
                    </button>
                    <button className={styles.actionLink} onClick={handleDownloadPdf}>
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
