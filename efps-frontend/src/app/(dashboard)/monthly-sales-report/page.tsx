'use client';

import { useEffect, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { StockAllocation, Transaction, ApiResponse, DashboardSummary } from '@/lib/types';
import styles from './Report.module.css';
import toast from 'react-hot-toast';

interface SalesRow {
  commodity: string;
  opening: number;
  received: number;
  distributed: number;
  closing: number;
  variance: number;
  unit: string;
}

function formatKg(v: number): string {
  return `${v.toFixed(1)} kg`;
}

export default function MonthlySalesReportPage() {
  const [rows, setRows] = useState<SalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(false);
      try {
        const [stockResult, txResult, summaryResult] = await Promise.allSettled([
          api.get<StockAllocation[]>('/stock'),
          api.get<ApiResponse<Transaction[]>>('/transactions?limit=5000'),
          api.get<DashboardSummary>('/dashboard/summary'),
        ]);

        const stock = stockResult.status === 'fulfilled' ? stockResult.value : [];
        const transactions = txResult.status === 'fulfilled' ? txResult.value.data : [];
        const summary = summaryResult.status === 'fulfilled' ? summaryResult.value : null;

        const txByCommodity: Record<string, number> = {};
        for (const tx of transactions) {
          txByCommodity[tx.commodity] = (txByCommodity[tx.commodity] || 0) + tx.quantity_kg;
        }

        const computed: SalesRow[] = stock.map(s => {
          const allocated = s.allocated_kg;
          const lifted = s.lifted_kg;
          const distributed = txByCommodity[s.commodity] || 0;
          const closing = allocated - distributed;
          const variance = lifted - distributed;
          return {
            commodity: s.commodity,
            opening: allocated,
            received: lifted,
            distributed,
            closing: Math.max(0, closing),
            variance,
            unit: 'kg',
          };
        });

        if (computed.length === 0 && summary?.monthly_sales) {
          for (const sale of summary.monthly_sales) {
            computed.push({
              commodity: sale.commodity,
              opening: 0,
              received: 0,
              distributed: sale.quantity,
              closing: 0,
              variance: 0,
              unit: 'kg',
            });
          }
        }

        setRows(computed);
      } catch (err) {
        setError(true);
        if (err instanceof Error) toast.error(err.message);
        else toast.error('Failed to load sales data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleExportCsv = () => {
    if (rows.length === 0) {
      toast.error('No data to export');
      return;
    }
    const csv = [
      'Commodity,Opening,Received,Distributed,Closing,Variance',
      ...rows.map(r => `${r.commodity},${r.opening},${r.received},${r.distributed},${r.closing},${r.variance}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-sales-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Monthly Sales Report</h2>
          <p className="text-muted">Detailed breakdown of commodity distributions for the current month.</p>
        </div>
        <button className="btn" style={{ backgroundColor: 'var(--primary-navy)', color: 'white' }} onClick={handleExportCsv}>
          <Download size={16} style={{ marginRight: '8px' }} />
          Download CSV
        </button>
      </header>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <Loader2 className="spin" size={24} style={{ margin: '0 auto' }} />
          <p className="text-muted" style={{ marginTop: '12px' }}>Loading sales data...</p>
        </div>
      ) : error ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p style={{ fontWeight: 600 }}>Error loading sales data</p>
          <p className="text-muted" style={{ marginTop: '8px' }}>Please check your connection and try again.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
          <p className="text-muted">No sales data available for this month. Start recording transactions to see the report.</p>
        </div>
      ) : (
        <div className="card">
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Commodity</th>
                  <th className={styles.th}>Opening Balance</th>
                  <th className={styles.th}>Received</th>
                  <th className={styles.th}>Distributed</th>
                  <th className={styles.th}>Closing Balance</th>
                  <th className={styles.th}>Variance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.commodity} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.commodity}>{r.commodity}</div>
                      <span className={styles.badge}>{r.unit === 'L' ? 'Liquid' : 'Grain'}</span>
                    </td>
                    <td className={styles.td}>{formatKg(r.opening)}</td>
                    <td className={styles.td}>{formatKg(r.received)}</td>
                    <td className={styles.td}>{formatKg(r.distributed)}</td>
                    <td className={styles.td}>{formatKg(r.closing)}</td>
                    <td className={styles.td} style={{ color: r.variance === 0 ? 'var(--online-green)' : r.variance < 0 ? 'var(--offline-red)' : 'var(--accent-amber)', fontWeight: 500 }}>
                      {formatKg(r.variance)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
