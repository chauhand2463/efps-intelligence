'use client';

import { useState, useEffect } from 'react';
import { Calculator, Printer, AlertTriangle, Save, Info, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { CommissionRate, Commission } from '@/lib/types';
import styles from './Calculator.module.css';
import toast from 'react-hot-toast';

interface ItemCommission {
  id: string;
  name: string;
  sales: number;
}

const displayNameMap: Record<string, string> = {
  wheat: 'Wheat (AAY)',
  rice: 'Rice (PHH)',
  sugar: 'Sugar (BPL)',
  salt: 'Salt (Iodized)',
};

const apiNameMap: Record<string, string> = {
  wheat: 'Wheat',
  rice: 'Rice',
  sugar: 'Sugar',
  salt: 'Salt',
};

export default function CommissionCalculatorPage() {
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [activeMonth, setActiveMonth] = useState('June');
  const [activeYear, setActiveYear] = useState('2026');

  const [rates, setRates] = useState<Record<string, number>>({});
  const [items, setItems] = useState<ItemCommission[]>([]);
  const [selectedSettingItem, setSelectedSettingItem] = useState('wheat');
  const [rateInputValue, setRateInputValue] = useState('');

  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [isLoadingCalc, setIsLoadingCalc] = useState(false);
  const [calcError, setCalcError] = useState('');

  useEffect(() => {
    const fetchRates = async () => {
      setIsLoadingRates(true);
      try {
        const data = await api.get<CommissionRate[]>('/commission/rates');
        const ratesMap: Record<string, number> = {};
        for (const rate of data) {
          ratesMap[rate.commodity.toLowerCase()] = rate.rate_per_kg;
        }
        setRates(ratesMap);
      } catch {
        toast.error('Failed to load commission rates.');
      } finally {
        setIsLoadingRates(false);
      }
    };
    fetchRates();
  }, []);

  const handleViewCalculation = async () => {
    setActiveMonth(selectedMonth);
    setActiveYear(selectedYear);
    setIsLoadingCalc(true);
    setCalcError('');
    try {
      const data = await api.get<Commission[]>(`/commission/calculate?month=${encodeURIComponent(selectedMonth)}`);
      const itemList: ItemCommission[] = data.map((c) => ({
        id: c.commodity.toLowerCase(),
        name: displayNameMap[c.commodity.toLowerCase()] || c.commodity,
        sales: c.quantity_sold_kg,
      }));
      setItems(itemList);
    } catch {
      setCalcError('Failed to load commission data.');
    } finally {
      setIsLoadingCalc(false);
    }
  };

  const handleSaveRate = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(rateInputValue);
    if (isNaN(value) || value < 0) {
      toast.error('Please enter a valid non-negative rate.');
      return;
    }
    try {
      const apiName = apiNameMap[selectedSettingItem] || selectedSettingItem;
      await api.post('/commission/rates', {
        commodity: apiName,
        rate_per_kg: value,
      });
      setRates((prev) => ({
        ...prev,
        [selectedSettingItem]: value,
      }));
      setRateInputValue('');
      toast.success(`Rate for ${selectedSettingItem.toUpperCase()} successfully updated to ₹ ${value.toFixed(2)} per kg.`);
    } catch {
      toast.error('Failed to save rate. Please try again.');
    }
  };

  const calculatedRows = items.map((item, idx) => {
    const rate = rates[item.id] ?? 0;
    const totalAmount = item.sales * rate;
    const tds = totalAmount * 0.02;
    const receivable = totalAmount - tds;
    return {
      sr: String(idx + 1).padStart(2, '0'),
      name: item.name,
      sales: item.sales,
      rate,
      totalAmount,
      tds,
      receivable,
    };
  });

  const grandSales = calculatedRows.reduce((sum, r) => sum + r.sales, 0);
  const grandTotalAmount = calculatedRows.reduce((sum, r) => sum + r.totalAmount, 0);
  const grandTds = calculatedRows.reduce((sum, r) => sum + r.tds, 0);
  const grandReceivable = calculatedRows.reduce((sum, r) => sum + r.receivable, 0);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <Calculator size={24} />
        </div>
        <h1 className={styles.title}>Commission Calculator</h1>
      </div>

      <section className={styles.filterCard}>
        <div className={styles.filterControls}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>SELECT MONTH</label>
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
            <label className={styles.filterLabel}>SELECT YEAR</label>
            <select 
              className={styles.filterSelect}
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
            >
              <option value="2026">2026</option>
              <option value="2025">2025</option>
            </select>
          </div>
          <button className={styles.viewBtn} onClick={handleViewCalculation} disabled={isLoadingCalc}>
            {isLoadingCalc ? (
              <><Loader2 size={18} className="animate-spin" /><span>Loading...</span></>
            ) : (
              <><Calculator size={18} /><span>View Calculation</span></>
            )}
          </button>
        </div>
        <div className={styles.lastUpdated}>
          <Info size={16} />
          <span>{isLoadingRates ? 'Loading rates...' : items.length > 0 ? `Showing commission for ${activeMonth} ${activeYear}` : 'Select a month and click View Calculation'}</span>
        </div>
      </section>

      <section className={styles.reportCard}>
        <div className={styles.reportHeader}>
          <div className={styles.reportHeaderLeft}>
            <h2 className={styles.reportTitle}>Monthly Commission Calculator ({activeMonth} {activeYear})</h2>
          </div>
          <button className={styles.printBtn} onClick={() => window.print()}>
            <Printer size={18} />
            <span>Print Report</span>
          </button>
        </div>

        {isLoadingCalc ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 16px' }} />
            <p>Loading commission data...</p>
          </div>
        ) : calcError ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--offline-red)' }}>
            <p>{calcError}</p>
          </div>
        ) : calculatedRows.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Click &ldquo;View Calculation&rdquo; to see commission data.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Sr. No.</th>
                  <th className={styles.th}>Item Name</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Sales (kg)</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Rate (₹)</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Total Amount (₹)</th>
                  <th className={`${styles.th} ${styles.thRight}`}>2% TDS Deduction (₹)</th>
                  <th className={`${styles.th} ${styles.thRight}`}>Receivable Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {calculatedRows.map((row) => (
                  <tr key={row.sr} className={styles.tr}>
                    <td className={styles.td}>{row.sr}</td>
                    <td className={`${styles.td} ${styles.tdBold}`}>{row.name}</td>
                    <td className={`${styles.td} ${styles.tdRight}`}>{row.sales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className={`${styles.td} ${styles.tdRight}`}>{row.rate.toFixed(2)}</td>
                    <td className={`${styles.td} ${styles.tdRight} ${styles.tdBold}`}>{row.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`${styles.td} ${styles.tdRight} ${styles.tdTds}`}>{row.tds.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`${styles.td} ${styles.tdRight} ${styles.tdReceivable}`}>{row.receivable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className={styles.tfoot}>
                <tr>
                  <td className={`${styles.tfootTd} ${styles.tfootTdLabel}`} colSpan={2}>Total Monthly Commission</td>
                  <td className={`${styles.tfootTd} ${styles.tfootTdRight}`}>{grandSales.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                  <td className={`${styles.tfootTd} ${styles.tfootTdRight}`}>-</td>
                  <td className={`${styles.tfootTd} ${styles.tfootTdRight} ${styles.tfootAmount}`}>₹ {grandTotalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`${styles.tfootTd} ${styles.tfootTdRight} ${styles.tfootTds}`}>₹ {grandTds.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={`${styles.tfootTd} ${styles.tfootTdRight} ${styles.tfootReceivable}`}>₹ {grandReceivable.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className={styles.settingsCard}>
        <div className={styles.settingsHeader}>
          <Save className="text-amber-500" size={20} />
          <h3 className={styles.settingsTitle}>Commission Rate Settings (Add or Change Rate)</h3>
        </div>

        <div className={styles.warningBanner}>
          <AlertTriangle className={styles.warningIcon} size={20} />
          <p>MDM and ICDS commission rates can only be changed from the MDM & ICDS Record page. General ration items are manageable here.</p>
        </div>

        {isLoadingRates ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 12px' }} />
            <p>Loading current rates...</p>
          </div>
        ) : (
          <form className={styles.settingsForm} onSubmit={handleSaveRate}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>SELECT ITEM</label>
              <select 
                className={styles.formSelect}
                value={selectedSettingItem}
                onChange={(e) => setSelectedSettingItem(e.target.value)}
              >
                <option value="wheat">Wheat (AAY)</option>
                <option value="rice">Rice (PHH)</option>
                <option value="sugar">Sugar (BPL)</option>
                <option value="salt">Salt (Iodized)</option>
              </select>
            </div>

            <div className={styles.formGroup} style={{ flex: '0 0 auto' }}>
              <label className={styles.formLabel}>RATE (₹ per kg)</label>
              <input 
                className={styles.formInput}
                type="number"
                step="0.01"
                min="0"
                placeholder={rates[selectedSettingItem]?.toFixed(2) ?? '0.00'}
                value={rateInputValue}
                onChange={(e) => setRateInputValue(e.target.value)}
                required
              />
            </div>

            <button className={styles.saveBtn} type="submit">
              <Save size={18} />
              <span>Save Rate</span>
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
