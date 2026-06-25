'use client';
import { useState } from 'react';
import { 
    Bell, Settings, AlertTriangle, FileText, Printer, Image, Loader2 
} from 'lucide-react';
import { api } from '@/lib/api';
import { monthToApi } from '@/lib/utils';
import type { StockAllocation, LiftingEntry, Transaction, ApiResponse } from '@/lib/types';
import styles from './MonthlyRecord.module.css';
import toast from 'react-hot-toast';

export default function MonthlyRecordPage() {
    const [month, setMonth] = useState('June');
    const [year, setYear] = useState('2026');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    interface MonthlyRow {
      commodity: string;
      opening: number;
      newIncome: number;
      total: number;
      qty: number;
      amount: number;
      closing: number;
    }

    const [rows, setRows] = useState<MonthlyRow[]>([]);

    const fetchMonthlyData = async () => {
      setLoading(true);
      setError(false);
      try {
        const [stockResult, liftingResult, txResult] = await Promise.all([
          api.get<StockAllocation[]>('/stock'),
          api.get<LiftingEntry[]>(`/lifting?month=${monthToApi(month, year)}`),
          api.get<Transaction[]>(`/transactions?limit=5000&month=${monthToApi(month, year)}`),
        ]);

        const liftingList = liftingResult ?? [];
        const txList = txResult ?? [];

        const liftingByCommodity: Record<string, number> = {};
        for (const entry of liftingList) {
          liftingByCommodity[entry.commodity] = (liftingByCommodity[entry.commodity] || 0) + entry.quantity_kg;
        }

        const amountByCommodity: Record<string, number> = {};
        for (const tx of txList) {
          amountByCommodity[tx.commodity] = (amountByCommodity[tx.commodity] || 0) + (tx.total_amount ?? 0);
        }

        const computedRows: MonthlyRow[] = (stockResult ?? []).map((stock) => {
          const opening = stock.allocated_kg;
          const newIncome = liftingByCommodity[stock.commodity] || 0;
          const total = opening + newIncome;
          const qty = stock.lifted_kg;
          const closing = stock.remaining_kg ?? total - qty;
          return {
            commodity: stock.commodity,
            opening,
            newIncome,
            total,
            qty,
            amount: amountByCommodity[stock.commodity] || 0,
            closing,
          };
        });

        setRows(computedRows);
      } catch {
        setError(true);
        toast.error('Failed to fetch monthly record');
      } finally {
        setLoading(false);
      }
    };

    return (
        <div className={styles.container}>
            <div className={styles.systemAlert}>
                <AlertTriangle size={16} />
                <span>System Alert: Stock Reconciliation for current cycle is now live. Please review allocations.</span>
            </div>

            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <FileText size={22} className={styles.titleIcon} style={{ color: '#1b3a6b' }} />
                    <h1>Monthly Record</h1>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.iconButton}>
                        <Bell size={20} />
                    </button>
                    <button className={styles.iconButton}>
                        <Settings size={20} />
                    </button>
                    <div className={styles.adminProfile}>
                        <div className={styles.adminInfo}>
                            <span className={styles.adminName}>Dealer</span>
                            <span className={styles.adminDetails}>Monthly Record</span>
                        </div>
                        <div className={styles.avatar}>DR</div>
                    </div>
                </div>
            </header>

            <div className={styles.contentCard}>
                <div className={styles.cardHeaderRow}>
                    <div className={styles.selectorsSection}>
                        <div className={styles.fieldGroup}>
                            <label>Select Month</label>
                            <select 
                                className={styles.selectInput}
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                            >
                                <option value="January">January</option>
                                <option value="February">February</option>
                                <option value="March">March</option>
                                <option value="April">April</option>
                                <option value="May">May</option>
                                <option value="June">June</option>
                                <option value="July">July</option>
                                <option value="August">August</option>
                                <option value="September">September</option>
                                <option value="October">October</option>
                                <option value="November">November</option>
                                <option value="December">December</option>
                            </select>
                        </div>
                        
                        <div className={styles.fieldGroup}>
                            <label>Select Year</label>
                            <select 
                                className={styles.selectInput}
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                            >
                                <option value="2024">2024</option>
                                <option value="2025">2025</option>
                                <option value="2026">2026</option>
                                <option value="2027">2027</option>
                            </select>
                        </div>

                        <button className={styles.viewBtn} onClick={fetchMonthlyData}>
                            <span className={styles.greenDot}></span>
                            View Record
                        </button>
                    </div>

                    <button className={styles.printBtn} onClick={() => window.print()}>
                        <Printer size={16} />
                        Print
                    </button>
                </div>

                <div className={styles.documentContainer}>
                    <h2 className={styles.docHeading}>FAIR PRICE SHOP MONTHLY RECORD (GOVERNMENT REGULATED PRICES)</h2>
                    <p className={styles.docSubheading}>Month: {month} - {year}</p>

                    <table className={styles.docTable}>
                        <thead>
                            <tr>
                                <th rowSpan={2} style={{ width: '40px' }}>#</th>
                                <th rowSpan={2}>Item Name</th>
                                <th rowSpan={2}>Opening Stock (Kg)</th>
                                <th rowSpan={2}>New Income (Kg)</th>
                                <th rowSpan={2}>Total Qty (1+2)</th>
                                <th colSpan={2}>Total Sales (Monthly)</th>
                                <th rowSpan={2}>Closing Stock (3-4)</th>
                            </tr>
                            <tr>
                                <th>QTY (KG)</th>
                                <th>AMOUNT (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className={styles.emptyState}>
                                            <Loader2 className={styles.emptyIcon} size={48} />
                                            <p className={styles.emptyText}>Loading data...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : error ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className={styles.emptyState}>
                                            <AlertTriangle size={48} style={{ color: 'var(--offline-red)' }} />
                                            <p className={styles.emptyText}>Error loading data. Please try again.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : rows.length === 0 ? (
                                <tr>
                                    <td colSpan={8}>
                                        <div className={styles.emptyState}>
                                            <Image className={styles.emptyIcon} size={48} />
                                            <p className={styles.emptyText}>No data available for this month.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                rows.map((row, idx) => (
                                    <tr key={row.commodity}>
                                        <td>{idx + 1}</td>
                                        <td>{row.commodity}</td>
                                        <td>{row.opening}</td>
                                        <td>{row.newIncome}</td>
                                        <td>{row.total}</td>
                                        <td>{row.qty}</td>
                                        <td>{row.amount}</td>
                                        <td>{row.closing}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    <div className={styles.docFooter}>
                        <div className={styles.generationInfo}>
                            <div className={styles.dateField}>Date: ____________________</div>
                            <div>Generated on: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        </div>

                        <div className={styles.signatureArea}>
                            <div className={styles.signatureLine}></div>
                            <div className={styles.signatureLabel}>DEALER&apos;S SIGNATURE</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
