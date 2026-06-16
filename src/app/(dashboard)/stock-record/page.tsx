'use client';

import { useState } from 'react';
import { CalendarDays, Eye, Printer, Copy } from 'lucide-react';
import styles from './StockRecord.module.css';

interface StockRow {
  date: string;
  opening: number;
  inStock: number;
  outStock: number;
  closing: number;
  remarks: string;
  isPlaceholder?: boolean;
}

const mockData: Record<string, StockRow[]> = {
  Wheat: [
    { date: '01 Jun 2026', opening: 500.00, inStock: 0.00, outStock: 45.00, closing: 455.00, remarks: '—' },
    { date: '02 Jun 2026', opening: 455.00, inStock: 200.00, outStock: 60.00, closing: 595.00, remarks: 'New stock arrived from Central Hub' },
    { date: '03 Jun 2026', opening: 595.00, inStock: 0.00, outStock: 30.00, closing: 565.00, remarks: '—' },
    { date: '04 Jun 2026', opening: 565.00, inStock: 0.00, outStock: 0.00, closing: 565.00, remarks: '—', isPlaceholder: true }
  ],
  Rice: [
    { date: '01 Jun 2026', opening: 300.00, inStock: 0.00, outStock: 20.00, closing: 280.00, remarks: '—' },
    { date: '02 Jun 2026', opening: 280.00, inStock: 150.00, outStock: 40.00, closing: 390.00, remarks: 'Weekly allocation received' },
    { date: '03 Jun 2026', opening: 390.00, inStock: 0.00, outStock: 25.00, closing: 365.00, remarks: '—' },
    { date: '04 Jun 2026', opening: 365.00, inStock: 0.00, outStock: 0.00, closing: 365.00, remarks: '—', isPlaceholder: true }
  ],
  Sugar: [
    { date: '01 Jun 2026', opening: 80.00, inStock: 0.00, outStock: 5.00, closing: 75.00, remarks: '—' },
    { date: '02 Jun 2026', opening: 75.00, inStock: 50.00, outStock: 10.00, closing: 115.00, remarks: 'Govt subsidy quota load' },
    { date: '03 Jun 2026', opening: 115.00, inStock: 0.00, outStock: 8.00, closing: 107.00, remarks: '—' },
    { date: '04 Jun 2026', opening: 107.00, inStock: 0.00, outStock: 0.00, closing: 107.00, remarks: '—', isPlaceholder: true }
  ]
};

export default function StockRecordPage() {
  const [selectedItem, setSelectedItem] = useState('Wheat');
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState('2026');
  
  const [activeItem, setActiveItem] = useState('Wheat');
  const [activeMonth, setActiveMonth] = useState('June');
  const [activeYear, setActiveYear] = useState('2026');

  const handleViewRecord = () => {
    setActiveItem(selectedItem);
    setActiveMonth(selectedMonth);
    setActiveYear(selectedYear);
  };

  const currentRecords = mockData[activeItem] || [];
  
  // Calculate totals
  const totalIn = currentRecords.reduce((sum, r) => sum + (r.isPlaceholder ? 0 : r.inStock), 0);
  const totalOut = currentRecords.reduce((sum, r) => sum + (r.isPlaceholder ? 0 : r.outStock), 0);
  const netClosing = currentRecords.length > 0 ? currentRecords[currentRecords.length - 1].closing : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <CalendarDays size={24} />
        </div>
        <h1 className={styles.title}>Stock Record (Date-wise)</h1>
      </div>

      {/* ZONE 1: FILTER BAR */}
      <section className={styles.filterBar}>
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Item:</label>
            <select 
              className={styles.filterSelect}
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
            >
              <option value="Wheat">Wheat</option>
              <option value="Rice">Rice</option>
              <option value="Sugar">Sugar</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Month:</label>
            <select 
              className={styles.filterSelect}
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            >
              <option value="June">June</option>
              <option value="July">July</option>
              <option value="August">August</option>
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Year:</label>
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
            <button className={styles.primaryBtn} onClick={handleViewRecord}>
              <Eye size={18} />
              <span>View Record</span>
            </button>
            <button className={styles.secondaryBtn} onClick={() => window.print()}>
              <Printer size={18} />
              <span>Single Print</span>
            </button>
          </div>
        </div>

        <button className={styles.accentBtn} onClick={() => window.print()}>
          <Copy size={18} />
          <span>Print All at Once</span>
        </button>
      </section>

      {/* ZONE 2: LOADED REPORT STATE */}
      <section className="card">
        <div className={styles.reportHeader}>
          <div>
            <h2 className={styles.reportTitle}>{activeItem} — Date-wise Stock Record</h2>
            <p className={styles.reportSub}>{activeMonth} {activeYear}</p>
          </div>
          <div className={styles.balanceBadge}>
            <span className={styles.badgeDot}></span>
            <span>Opening Balance: 0 kg</span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Date</th>
                <th className={`${styles.th} ${styles.thRight}`}>Opening Stock</th>
                <th className={`${styles.th} ${styles.thRight}`}>Stock In</th>
                <th className={`${styles.th} ${styles.thRight}`}>Stock Out</th>
                <th className={`${styles.th} ${styles.thRight}`}>Closing Stock</th>
                <th className={styles.th}>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {currentRecords.map((row, idx) => (
                <tr 
                  key={idx} 
                  className={`${styles.tr} ${row.isPlaceholder ? styles.placeholderRow : ''}`}
                  style={idx % 2 === 1 ? { backgroundColor: '#F8FAFC' } : undefined}
                >
                  <td className={styles.td}>{row.date}</td>
                  <td className={`${styles.td} ${styles.tdRight}`}>{row.opening.toFixed(2)}</td>
                  <td className={`${styles.td} ${styles.tdRight} ${row.inStock > 0 ? styles.textIn : ''}`}>
                    {row.inStock > 0 ? `+${row.inStock.toFixed(2)}` : row.inStock.toFixed(2)}
                  </td>
                  <td className={`${styles.td} ${styles.tdRight} ${row.outStock > 0 ? styles.textOut : ''}`}>
                    {row.outStock.toFixed(2)}
                  </td>
                  <td className={`${styles.td} ${styles.tdRight} ${styles.textBold}`}>{row.closing.toFixed(2)}</td>
                  <td className={`${styles.td} ${row.remarks === '—' ? styles.remarksMuted : ''}`}>{row.remarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className={styles.summaryContainer}>
          <div className={styles.totalsRow}>
            <div className={styles.totalGroup}>
              <p className={styles.totalLabel}>Total Stock In</p>
              <p className={styles.totalValueGreen}>{totalIn.toFixed(2)} kg</p>
            </div>
            <div className={styles.totalGroup}>
              <p className={styles.totalLabel}>Total Stock Out</p>
              <p className={styles.totalValueRed}>{totalOut.toFixed(2)} kg</p>
            </div>
          </div>

          <div className={styles.netClosingBox}>
            <span className={styles.netLabel}>Net Closing Balance:</span>
            <span className={styles.netValue}>{netClosing.toFixed(2)} kg</span>
          </div>
        </div>
      </section>

      {/* Connectivity Readout (Cockpit-style) */}
      <footer className={styles.footer}>
        <div className={styles.footerLeft}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot}></span>
            <span className={styles.statusText}>System Online</span>
          </div>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot}></span>
            <span className={styles.statusText}>Database Encrypted</span>
          </div>
        </div>
        <p className={styles.copyrightText}>© 2026 eFPS Master - Licensed Authority Portal</p>
      </footer>
    </div>
  );
}
