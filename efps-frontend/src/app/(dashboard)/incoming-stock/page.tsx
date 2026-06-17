'use client';

import { useEffect, useState } from 'react';
import { Package, Inbox, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import type { StockAllocation } from '@/lib/types';
import styles from './IncomingStock.module.css';
import toast from 'react-hot-toast';

export default function IncomingStockPage() {
  const [stockData, setStockData] = useState<StockAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        const data = await api.get<StockAllocation[]>('/stock');
        setStockData(data);
      } catch {
        setError(true);
        toast.error('Failed to fetch stock data');
      } finally {
        setLoading(false);
      }
    };
    fetchStock();
  }, []);

  const getType = (commodity: string) => {
    if (commodity === 'Rice' || commodity === 'Wheat') return 'Grains';
    if (commodity === 'Sugar') return 'Sugar';
    if (commodity === 'Oil' || commodity === 'Kerosene') return 'Oil';
    return commodity;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <Package size={24} />
        </div>
        <h1 className={styles.title}>Stock Allocations</h1>
      </div>

      {error && (
        <div className={styles.banner} style={{ borderLeft: '4px solid var(--offline-red)', marginBottom: '16px' }}>
          <div className={styles.bannerLeft}>
            <div className={styles.bannerIconBox}>
              <AlertTriangle size={24} style={{ color: 'var(--offline-red)' }} />
            </div>
            <div>
              <h2 className={styles.bannerTitle}>Connection Error</h2>
              <p className={styles.bannerText}>Could not load stock data. Please try again later.</p>
            </div>
          </div>
        </div>
      )}

      <section className="card">
        <div className={styles.cardContent}>
          <div className={styles.cardHeader}>
            <Package className="text-primary" size={24} />
            <h3 className={styles.cardTitle}>Current Month Stock</h3>
          </div>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Month</th>
                  <th className={styles.th}>Commodity</th>
                  <th className={styles.th}>Type</th>
                  <th className={styles.th}>Allocated (kg)</th>
                  <th className={styles.th}>Lifted (kg)</th>
                  <th className={styles.th}>Remaining (kg)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.emptyState}>
                        <p className={styles.emptyTitle}>Loading stock data...</p>
                      </div>
                    </td>
                  </tr>
                ) : stockData.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <div className={styles.emptyState}>
                        <div className={styles.emptyIconBox}>
                          <Inbox size={40} />
                        </div>
                        <div>
                          <p className={styles.emptyTitle}>No stock allocations found.</p>
                          <p className={styles.emptyDesc}>No stock records for the current cycle.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  stockData.map((item) => (
                    <tr key={item.id}>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{item.month}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{item.commodity}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{getType(item.commodity)}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{item.allocated_kg}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{item.lifted_kg}</td>
                      <td style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-light)' }}>{item.remaining_kg ?? (item.allocated_kg - item.lifted_kg)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
