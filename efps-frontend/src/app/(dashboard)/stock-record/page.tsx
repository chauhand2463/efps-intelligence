'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Eye, Printer, Copy, AlertCircle, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { monthToApi } from '@/lib/utils';
import toast from 'react-hot-toast';
import type { StockAllocation, Transaction, LiftingEntry, ApiResponse } from '@/lib/types';
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

export default function StockRecordPage() {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState('Wheat');
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState('2026');
  
  const [activeItem, setActiveItem] = useState('Wheat');
  const [activeMonth, setActiveMonth] = useState('June');
  const [activeYear, setActiveYear] = useState('2026');
  const [records, setRecords] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleViewRecord = async () => {
    setActiveItem(selectedItem);
    setActiveMonth(selectedMonth);
    setActiveYear(selectedYear);
    setLoading(true);
    try {
      const apiMonth = monthToApi(selectedMonth, selectedYear);
      const monthPrefix = apiMonth.slice(0, 7);

      const [stockAllocations, transactions, liftingResult] = await Promise.all([
        api.get<StockAllocation[]>('/stock'),
        api.get<Transaction[]>(`/transactions?month=${apiMonth}&commodity=${selectedItem}`) ?? [],
        api.get<LiftingEntry[]>(`/lifting?commodity=${encodeURIComponent(selectedItem)}`) ?? [],
      ]);

      const allocation = (stockAllocations ?? []).find(s => s.commodity === selectedItem);
      const openingBalance = allocation?.allocated_kg ?? 0;

      const liftingByDate: Record<string, number> = {};
      for (const entry of liftingResult) {
        const entryMonth = entry.created_at?.slice(0, 7) ?? '';
        if (entryMonth !== monthPrefix) continue;
        const date = entry.created_at?.split('T')[0] ?? '';
        liftingByDate[date] = (liftingByDate[date] || 0) + entry.quantity_kg;
      }

      const txByDate: Record<string, Transaction[]> = {};
      for (const tx of transactions) {
        const date = tx.transaction_date.split('T')[0];
        if (!txByDate[date]) txByDate[date] = [];
        txByDate[date].push(tx);
      }

      const allDates = new Set([...Object.keys(liftingByDate), ...Object.keys(txByDate)]);
      const sortedDates = [...allDates].sort();

      const computedRecords: StockRow[] = [];
      let running = openingBalance;
      for (const dateStr of sortedDates) {
        const inStock = liftingByDate[dateStr] || 0;
        const dayTxs = txByDate[dateStr] || [];
        const outStock = dayTxs.reduce((sum, tx) => sum + tx.quantity_kg, 0);
        const opening = running;
        const closing = opening + inStock - outStock;
        const formattedDate = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        });
        computedRecords.push({
          date: formattedDate,
          opening: Math.round(opening * 100) / 100,
          inStock: Math.round(inStock * 100) / 100,
          outStock: Math.round(outStock * 100) / 100,
          closing: Math.round(closing * 100) / 100,
          remarks: dayTxs[0]?.remarks || '—',
        });
        running = closing;
      }
      setRecords(computedRecords);
      setError('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch stock record';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const currentRecords = records;
  
  // Calculate totals
  const totalIn = currentRecords.reduce((sum, r) => sum + (r.inStock ?? 0), 0);
  const totalOut = currentRecords.reduce((sum, r) => sum + (r.outStock ?? 0), 0);
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
              {['Wheat', 'Rice', 'Sugar', 'Kerosene', 'Oil', 'Pulses'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
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

        <button className={styles.entryBtn} onClick={() => router.push('/incoming-stock')}>
          <Plus size={18} />
          <span>New Stock Entry</span>
        </button>
        <button className={styles.accentBtn} onClick={async () => {
          toast.loading('Loading all items for print...', { id: 'print-all' });
          const items = ['Wheat', 'Rice', 'Sugar', 'Kerosene', 'Oil', 'Pulses'];
          const apiMonth = monthToApi(selectedMonth, selectedYear);
          const monthPrefix = apiMonth.slice(0, 7);
          const allRecords: StockRow[] = [];
          try {
            for (const item of items) {
              const stockAllocations = await api.get<StockAllocation[]>('/stock');
              const allocation = (stockAllocations ?? []).find(s => s.commodity === item);
              const opening = allocation?.allocated_kg ?? 0;
              const [transactions, liftingResult] = await Promise.all([
                api.get<Transaction[]>(`/transactions?month=${apiMonth}&commodity=${item}`) ?? [],
                api.get<LiftingEntry[]>(`/lifting?commodity=${encodeURIComponent(item)}`) ?? [],
              ]);
              const liftingByDate: Record<string, number> = {};
              for (const entry of liftingResult) {
                const entryMonth = entry.created_at?.slice(0, 7) ?? '';
                if (entryMonth !== monthPrefix) continue;
                const date = entry.created_at?.split('T')[0] ?? '';
                liftingByDate[date] = (liftingByDate[date] || 0) + entry.quantity_kg;
              }
              const txByDate: Record<string, Transaction[]> = {};
              for (const tx of transactions) {
                const date = tx.transaction_date.split('T')[0];
                if (!txByDate[date]) txByDate[date] = [];
                txByDate[date].push(tx);
              }
              const allDates = new Set([...Object.keys(liftingByDate), ...Object.keys(txByDate)]);
              const sortedDates = [...allDates].sort();
              allRecords.push({ date: `--- ${item} ---`, opening: 0, inStock: 0, outStock: 0, closing: 0, remarks: '', isPlaceholder: true });
              let running = opening;
              for (const dateStr of sortedDates) {
                const inStock = liftingByDate[dateStr] || 0;
                const dayTxs = txByDate[dateStr] || [];
                const outStock = dayTxs.reduce((sum, tx) => sum + tx.quantity_kg, 0);
                allRecords.push({
                  date: new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                  opening: Math.round(running * 100) / 100,
                  inStock: Math.round(inStock * 100) / 100,
                  outStock: Math.round(outStock * 100) / 100,
                  closing: Math.round((running + inStock - outStock) * 100) / 100,
                  remarks: dayTxs[0]?.remarks || '—',
                });
                running = running + inStock - outStock;
              }
            }
            setRecords(allRecords);
            toast.success('All items loaded', { id: 'print-all' });
            setTimeout(() => window.print(), 100);
          } catch {
            toast.error('Failed to load some items', { id: 'print-all' });
          }
        }}>
          <Copy size={18} />
          <span>Print All at Once</span>
        </button>
      </section>

      {/* Error Banner */}
      {error && (
        <div style={{
          backgroundColor: '#FEF2F2',
          border: '1px solid #FECACA',
          color: '#991B1B',
          padding: '12px 16px',
          borderRadius: 4,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 14,
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* ZONE 2: LOADED REPORT STATE */}
      <section className="card">
        <div className={styles.reportHeader}>
          <div>
            <h2 className={styles.reportTitle}>{activeItem} — Date-wise Stock Record</h2>
            <p className={styles.reportSub}>{activeMonth} {activeYear}</p>
          </div>
          <div className={styles.balanceBadge}>
            <span className={styles.badgeDot}></span>
            <span>Opening Balance: {records.length > 0 ? records[0].opening.toFixed(2) : '0.00'} kg</span>
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
              {loading ? (
                <tr>
                  <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '40px 24px' }}>
                    Loading stock record...
                  </td>
                </tr>
              ) : currentRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className={styles.td} style={{ textAlign: 'center', padding: '40px 24px' }}>
                    Select filters and click &ldquo;View Record&rdquo; to load data.
                  </td>
                </tr>
              ) : (
                currentRecords.map((row, idx) => (
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
                ))
              )}
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
