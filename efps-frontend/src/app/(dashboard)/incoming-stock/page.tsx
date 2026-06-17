'use client';

import { useEffect, useState } from 'react';
import { Package, Inbox, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import type { StockAllocation } from '@/lib/types';
import { Card } from '@/components/ui/Card';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import styles from './IncomingStock.module.css';
import toast from 'react-hot-toast';

export default function IncomingStockPage() {
  const [stockData, setStockData] = useState<StockAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchStock = async () => {
    setLoading(true);
    setError(false);
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

  useEffect(() => { fetchStock(); }, []);

  const getType = (commodity: string) => {
    if (commodity === 'Rice' || commodity === 'Wheat') return 'Grains';
    if (commodity === 'Sugar') return 'Sugar';
    if (commodity === 'Oil' || commodity === 'Kerosene') return 'Oil';
    return commodity;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Package size={22} />
        </div>
        <div className={styles.headerContent}>
          <h1 className={styles.title}>Stock Allocations</h1>
          <p className={styles.description}>View and manage monthly stock allocations</p>
        </div>
      </div>

      {error && (
        <div className={styles.errorBanner}>
          <AlertTriangle size={20} style={{ color: 'var(--offline-red)', flexShrink: 0 }} />
          <div className={styles.errorContent}>
            <p className={styles.errorTitle}>Connection Error</p>
            <p className={styles.errorText}>Could not load stock data. Please try again later.</p>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchStock} style={{ marginLeft: 'auto' }}>
            Retry
          </Button>
        </div>
      )}

      <Card>
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-4)' }}>
            {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : stockData.length === 0 ? (
          <EmptyState
            icon={<Inbox size={48} />}
            title="No stock allocations found"
            description="No stock records for the current cycle."
            action={
              <Button size="sm" variant="secondary" onClick={fetchStock}>
                Refresh
              </Button>
            }
          />
        ) : (
          <>
            <div className={styles.sectionHeader}>
              <Package size={18} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Current Month Stock</h2>
            </div>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Commodity</th>
                    <th>Type</th>
                    <th>Allocated (kg)</th>
                    <th>Lifted (kg)</th>
                    <th>Remaining (kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {stockData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.month}</td>
                      <td>{item.commodity}</td>
                      <td>{getType(item.commodity)}</td>
                      <td>{item.allocated_kg}</td>
                      <td>{item.lifted_kg}</td>
                      <td>{item.remaining_kg ?? (item.allocated_kg - item.lifted_kg)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
