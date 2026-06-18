'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Landmark, Search, RotateCcw, 
  Info, Save, Printer, CreditCard 
} from 'lucide-react';
import styles from './BankCommission.module.css';
import { api } from '@/lib/api';
import type { Commission } from '@/lib/types';
import toast from 'react-hot-toast';

interface Transaction {
  commissionId: string;
  srNo: string;
  fpsUid: string;
  transactionType: string;
  payableAmount: number;
  amountPaid: string;
  depositDate: string;
}

const MONTH_MAP: Record<string, string> = {
  'JAN': '01', 'FEB': '02', 'MAR': '03', 'APR': '04',
  'MAY': '05', 'JUN': '06', 'JUL': '07', 'AUG': '08',
  'SEP': '09', 'OCT': '10', 'NOV': '11', 'DEC': '12',
};

export default function BankCommissionPage() {
  const [financialYear, setFinancialYear] = useState('2026');
  const [reportingMonth, setReportingMonth] = useState('JUN');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const getMonthParam = useCallback(() => {
    return `${financialYear}-${MONTH_MAP[reportingMonth]}-01`;
  }, [financialYear, reportingMonth]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const month = getMonthParam();
      const commissionList: Commission[] = await api.get<Commission[]>(`/commission?month=${month}`);

      const mapped: Transaction[] = commissionList.map((c, idx) => ({
        commissionId: c.id,
        srNo: String(idx + 1).padStart(2, '0'),
        fpsUid: c.dealer_id ? c.dealer_id.substring(0, 9) : '',
        transactionType: `${c.commodity}${c.status ? ` (${c.status})` : ''}`,
        payableAmount: c.gross_commission,
        amountPaid: (c.amount_paid ?? c.net_commission).toFixed(2),
        depositDate: c.deposit_date ?? (c.created_at ? c.created_at.substring(0, 10) : ''),
      }));

      setTransactions(mapped);
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
      else toast.error('Failed to load commission data');
    } finally {
      setLoading(false);
    }
  }, [getMonthParam]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount).replace('INR', '₹').trim();
  };

  const handleAmountChange = (index: number, value: string) => {
    const updated = [...transactions];
    const cleanValue = value.replace(/[^0-9.]/g, '');
    updated[index].amountPaid = cleanValue;
    setTransactions(updated);
  };

  const handleDateChange = (index: number, value: string) => {
    const updated = [...transactions];
    updated[index].depositDate = value;
    setTransactions(updated);
  };

  const handleReset = () => {
    setFinancialYear('2026');
    setReportingMonth('JUN');
    loadData();
  };

  const totalPayable = transactions.reduce((sum, item) => sum + item.payableAmount, 0);
  const totalPaid = transactions.reduce((sum, item) => {
    const parsed = parseFloat(item.amountPaid);
    return sum + (isNaN(parsed) ? 0 : parsed);
  }, 0);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/commission/payments', {
        payments: transactions.map(t => ({
          commission_id: t.commissionId,
          amount_paid: parseFloat(t.amountPaid) || 0,
          deposit_date: t.depositDate || new Date().toISOString().split('T')[0],
        })),
      });
      toast.success('Commission payments recorded successfully!');
      loadData();
    } catch {
      toast.error('Failed to save commission payments');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = () => window.print();

  return (
    <div className={styles.container}>
      <header className={styles.topHeaderBar}>
        <div className={styles.topLeftBlock}>
          <div className={styles.topLogoText}>
            <Landmark className={styles.topLogoIcon} size={20} />
            <span>eFPS Master</span>
          </div>
          <div className={styles.topSeparator}></div>
          <div className={styles.topPortalText}>
            <CreditCard size={18} />
            <span>Commission Portal</span>
          </div>
        </div>
      </header>

      <div className={styles.titleSection}>
        <div className={styles.titleIconBox}>
          <CreditCard size={24} />
        </div>
        <div className={styles.titleBlock}>
          <h1 className={styles.pageTitle}>Bank Commission Entry</h1>
          <p className={styles.pageSubtitle}>(Refund Payment Report)</p>
        </div>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.filterRow}>
          <div className={styles.filterGroupLeft}>
            <div className={styles.inputFieldGroup}>
              <label className={styles.fieldLabel}>Financial Year</label>
              <select 
                className={styles.selectInput}
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>
            </div>

            <div className={styles.inputFieldGroup}>
              <label className={styles.fieldLabel}>Reporting Month</label>
              <select 
                className={styles.selectInput}
                value={reportingMonth}
                onChange={(e) => setReportingMonth(e.target.value)}
              >
                {Object.keys(MONTH_MAP).map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <button className={styles.viewDataBtn} onClick={loadData}>
              <Search size={16} />
              View Data
            </button>

            <button className={styles.resetBtn} onClick={handleReset}>
              <RotateCcw size={16} />
              Reset
            </button>
          </div>

          <div className={styles.lockBadge}>
            <Info size={16} className={styles.lockIcon} />
            <span>Edit amounts and dates as needed before saving.</span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', color: '#64748b' }}>
              Loading commission data...
            </div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr className={styles.tableHeadRow}>
                  <th className={`${styles.th} ${styles.thCenter}`} style={{ width: '80px' }}>SRNO</th>
                  <th className={`${styles.th} ${styles.thCenter}`} style={{ width: '120px' }}>FPS UID</th>
                  <th className={styles.th}>TRANSACTION TYPE</th>
                  <th className={`${styles.th} ${styles.thRight}`} style={{ width: '180px' }}>PAYABLE AMOUNT (₹)</th>
                  <th className={`${styles.th} ${styles.thRight}`} style={{ width: '180px' }}>AMOUNT PAID (₹)</th>
                  <th className={`${styles.th} ${styles.thCenter}`} style={{ width: '220px' }}>BANK DEPOSIT DATE</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                      No commission data found for the selected period.
                    </td>
                  </tr>
                ) : (
                  transactions.map((item, idx) => (
                    <tr key={item.srNo} className={styles.tableBodyRow}>
                      <td className={`${styles.td} ${styles.tdCenter} ${styles.srNo}`}>{item.srNo}</td>
                      <td className={`${styles.td} ${styles.tdCenter} ${styles.fpsUid}`}>{item.fpsUid}</td>
                      <td className={`${styles.td} ${styles.transactionType}`}>{item.transactionType}</td>
                      <td className={`${styles.td} ${styles.tdRight}`}>
                        <span className={styles.payableBadge}>
                          {item.payableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className={`${styles.td} ${styles.tdRight}`}>
                        <input 
                          type="text" 
                          className={styles.paidInput}
                          value={item.amountPaid}
                          onChange={(e) => handleAmountChange(idx, e.target.value)}
                        />
                      </td>
                      <td className={`${styles.td} ${styles.tdCenter}`}>
                        <input 
                          type="date" 
                          className={styles.dateInput}
                          value={item.depositDate}
                          onChange={(e) => handleDateChange(idx, e.target.value)}
                        />
                      </td>
                    </tr>
                  ))
                )}
                
                {transactions.length > 0 && (
                  <tr className={styles.totalRow}>
                    <td colSpan={3} className={styles.totalLabel}>
                      TOTAL (GRAND AMOUNT) :
                    </td>
                    <td className={styles.totalValue}>
                      {formatCurrency(totalPayable)}
                    </td>
                    <td className={styles.totalValue}>
                      {formatCurrency(totalPaid)}
                    </td>
                    <td></td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <footer className={styles.bottomActionRow}>
        <div className={styles.actionButtons}>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            <Save size={18} />
            {saving ? 'Saving...' : 'Save Data Entries'}
          </button>
          <button className={styles.printBtn} onClick={handlePrint}>
            <Printer size={18} />
            Print Transaction Report
          </button>
        </div>

        <div className={styles.statusIndicators}>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot}></span>
            <span>CLOUD SYNC: ACTIVE</span>
          </div>
          <div className={styles.statusIndicator}>
            <span className={styles.statusDot}></span>
            <span>BANK LINK: ONLINE</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
