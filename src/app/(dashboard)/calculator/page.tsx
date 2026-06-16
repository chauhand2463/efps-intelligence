'use client';

import { useState } from 'react';
import { Calculator, Printer, AlertTriangle, Save, Info } from 'lucide-react';
import styles from './Calculator.module.css';

interface ItemCommission {
  id: string;
  name: string;
  sales: number;
}

export default function CommissionCalculatorPage() {
  const [selectedMonth, setSelectedMonth] = useState('June');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [activeMonth, setActiveMonth] = useState('June');
  const [activeYear, setActiveYear] = useState('2026');

  // Rates in state to support real-time adjustments!
  const [rates, setRates] = useState<Record<string, number>>({
    wheat: 0.85,
    rice: 1.25,
    sugar: 2.50,
    salt: 0.50,
  });

  const [selectedSettingItem, setSelectedSettingItem] = useState('wheat');
  const [rateInputValue, setRateInputValue] = useState('');

  // Fixed sales values matching the design specs
  const items: ItemCommission[] = [
    { id: 'wheat', name: 'Wheat (AAY)', sales: 12450.00 },
    { id: 'rice', name: 'Rice (PHH)', sales: 8920.00 },
    { id: 'sugar', name: 'Sugar (BPL)', sales: 450.00 },
    { id: 'salt', name: 'Salt (Iodized)', sales: 280.00 },
  ];

  const handleViewCalculation = () => {
    setActiveMonth(selectedMonth);
    setActiveYear(selectedYear);
  };

  const handleSaveRate = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(rateInputValue);
    if (isNaN(value) || value < 0) {
      alert('Please enter a valid non-negative rate.');
      return;
    }
    setRates((prev) => ({
      ...prev,
      [selectedSettingItem]: value,
    }));
    setRateInputValue('');
    alert(`Rate for ${selectedSettingItem.toUpperCase()} successfully updated to ₹ ${value.toFixed(2)} per kg.`);
  };

  // Calculations
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
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <Calculator size={24} />
        </div>
        <h1 className={styles.title}>Commission Calculator</h1>
      </div>

      {/* ZONE 1: FILTER BAR */}
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
          <button className={styles.viewBtn} onClick={handleViewCalculation}>
            <Calculator size={18} />
            <span>View Calculation</span>
          </button>
        </div>
        <div className={styles.lastUpdated}>
          <Info size={16} />
          <span>Last updated: 14 June 2026 10:45 AM</span>
        </div>
      </section>

      {/* ZONE 2: COMMISSION REPORT CARD */}
      <section className={styles.reportCard}>
        {/* Header */}
        <div className={styles.reportHeader}>
          <div className={styles.reportHeaderLeft}>
            <h2 className={styles.reportTitle}>Monthly Commission Calculator ({activeMonth} {activeYear})</h2>
            <span className={styles.distributionBadge}>Your Distribution: 0%</span>
          </div>
          <button className={styles.printBtn} onClick={() => window.print()}>
            <Printer size={18} />
            <span>Print Report</span>
          </button>
        </div>

        {/* Meta Info Grid */}
        <div className={styles.metaGrid}>
          <div className={styles.metaCol}>
            <span className={styles.metaLabel}>Shop Owner</span>
            <span className={styles.metaValue}>M.D. Chauhan</span>
          </div>
          <div className={styles.metaCol}>
            <span className={styles.metaLabel}>Shop Number</span>
            <span className={styles.metaValue}>3617</span>
          </div>
          <div className={styles.metaCol}>
            <span className={styles.metaLabel}>Area ID</span>
            <span className={styles.metaValue}>AMD-ZONE-4</span>
          </div>
          <div className={styles.metaCol}>
            <span className={styles.metaLabel}>Full Address</span>
            <span className={styles.metaValue}>Navrangpura, Ahmedabad, 380009</span>
          </div>
        </div>

        {/* COMMISSION TABLE */}
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
      </section>

      {/* ZONE 3: COMMISSION RATE SETTINGS */}
      <section className={styles.settingsCard}>
        <div className={styles.settingsHeader}>
          <Save className="text-amber-500" size={20} />
          <h3 className={styles.settingsTitle}>Commission Rate Settings (Add or Change Rate)</h3>
        </div>

        <div className={styles.warningBanner}>
          <AlertTriangle className={styles.warningIcon} size={20} />
          <p>MDM and ICDS commission rates can only be changed from the MDM & ICDS Record page. General ration items are manageable here.</p>
        </div>

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
              placeholder="0.00"
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
      </section>
    </div>
  );
}
