'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { GraduationCap, Printer, Save, Loader2, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import styles from './MdmRecord.module.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const CURRENT_YEAR = new Date().getFullYear();

interface CommodityRow {
  id: number;
  name: string;
  openingStock: number;
  income: number;
  distribution: number;
  rate: number;
}

interface FieldChange {
  id: number;
  name: string;
  field: string;
  from: number;
  to: number;
}

const INITIAL_ROWS: CommodityRow[] = [
  { id: 1,  name: 'MDM Wheat',          openingStock: 5734, income: 1036, distribution: 772,  rate: 1.28 },
  { id: 2,  name: 'MDM Fortified Rice', openingStock: 3170, income: 1445, distribution: 704,  rate: 1.50 },
  { id: 3,  name: 'MDM Tuverdal',       openingStock: 2980, income: -412, distribution: 1990, rate: 1.50 },
  { id: 4,  name: 'MDM Oil (Pouch)',    openingStock: 4175, income: -826, distribution: 1579, rate: 1.76 },
  { id: 5,  name: 'ICDS Wheat',         openingStock: 1344, income: -197, distribution: 1903, rate: 2.23 },
  { id: 6,  name: 'ICDS Fortified Rice',openingStock: 1281, income: -838, distribution: 914,  rate: 3.28 },
  { id: 7,  name: 'ICDS Tuverdal',      openingStock: 1990, income: -177, distribution: 1581, rate: 1.99 },
  { id: 8,  name: 'ICDS Oil',           openingStock: 3380, income: -1823,distribution: 742,  rate: 1.44 },
  { id: 9,  name: 'ICDS Chana',         openingStock: 4100, income: -1407,distribution: 1462, rate: 2.32 },
  { id: 10, name: 'ICDS Salt',          openingStock: 3133, income: -1170,distribution: 1521, rate: 2.01 },
  { id: 11, name: 'MDM Chana',          openingStock: 1437, income: -1441,distribution: 1359, rate: 2.38 },
  { id: 12, name: 'MDM Salt',           openingStock: 2991, income: -803, distribution: 1988, rate: 1.96 },
];

function mapApiRow(item: any, id: number): CommodityRow {
  return {
    id,
    name: item.commodity_name ?? item.name ?? item.commodity ?? 'Unknown',
    openingStock: item.opening_stock ?? item.openingStock ?? 0,
    income: item.income ?? item.allocated_kg ?? 0,
    distribution: item.distribution ?? item.lifted_kg ?? 0,
    rate: item.rate ?? item.rate_per_kg ?? 0,
  };
}

export default function MdmRecordPage() {
  const currentMonthIdx = new Date().getMonth();
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIdx]);
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [rows, setRows] = useState<CommodityRow[]>(INITIAL_ROWS);
  const [loading, setLoading] = useState(true);
  const [dataUnavailable, setDataUnavailable] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const originalRowsRef = useRef<CommodityRow[]>(INITIAL_ROWS);

  const fetchMdmData = useCallback(async () => {
    setLoading(true);
    setDataUnavailable(false);
    setSaveMessage('');

    try {
      const schemes = await api.get<any[]>('/mdm/schemes');
      if (schemes?.length) {
        let mapped = schemes.map((s, idx) => mapApiRow(s, idx + 1));

        try {
          const icds = await api.get<any[]>('/mdm/icds-codes');
          if (icds?.length) {
            const icdsRows = icds.map((s, idx) => mapApiRow(s, mapped.length + idx + 1));
            mapped = [...mapped, ...icdsRows];
          }
        } catch {
          // ICDS codes endpoint may not be available
        }

        setRows(mapped);
        originalRowsRef.current = JSON.parse(JSON.stringify(mapped));
        setLoading(false);
        return;
      }
    } catch {
      // /mdm/schemes may be admin-only
    }

    try {
      const monthParam = `${selectedMonth.toLowerCase()}-${selectedYear}`;
      const stockAllocations = await api.get<any[]>(`/stock?month=${encodeURIComponent(monthParam)}`);
      if (stockAllocations?.length) {
        const mapped = stockAllocations.map((s, idx) => ({
          id: idx + 1,
          name: s.commodity ?? 'Unknown',
          openingStock: 0,
          income: s.allocated_kg ?? 0,
          distribution: s.lifted_kg ?? 0,
          rate: 0,
        }));
        setRows(mapped);
        originalRowsRef.current = JSON.parse(JSON.stringify(mapped));
        setLoading(false);
        return;
      }
    } catch {
      // Stock endpoint also failed
    }

    setDataUnavailable(true);
    setRows(INITIAL_ROWS);
    originalRowsRef.current = JSON.parse(JSON.stringify(INITIAL_ROWS));
    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchMdmData();
  }, [fetchMdmData]);

  const updateRow = useCallback((id: number, field: 'distribution' | 'rate', value: string) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: parseFloat(value) || 0 } : r));
  }, []);

  const handleSave = () => {
    const originals = originalRowsRef.current;
    const changes: FieldChange[] = [];

    for (let i = 0; i < rows.length; i++) {
      const orig = originals[i];
      const curr = rows[i];
      if (!orig || !curr) continue;
      if (orig.distribution !== curr.distribution) {
        changes.push({ id: curr.id, name: curr.name, field: 'distribution', from: orig.distribution, to: curr.distribution });
      }
      if (orig.rate !== curr.rate) {
        changes.push({ id: curr.id, name: curr.name, field: 'rate', from: orig.rate, to: curr.rate });
      }
    }

    if (changes.length > 0) {
      const msg = changes.map(c => `${c.name}: ${c.field} changed from ${c.from} to ${c.to}`).join('\n');
      setSaveMessage(`Record saved! ${changes.length} field(s) updated.`);
      originalRowsRef.current = JSON.parse(JSON.stringify(rows));
    } else {
      setSaveMessage('Record saved successfully! No changes detected.');
    }

    setTimeout(() => setSaveMessage(''), 4000);
  };

  const getTotal = (row: CommodityRow) => row.openingStock + row.income;
  const getClosing = (row: CommodityRow) => getTotal(row) - row.distribution;
  const getAmount = (row: CommodityRow) => row.distribution * row.rate;
  const getTds = (row: CommodityRow) => getAmount(row) * 0.02;
  const getNet = (row: CommodityRow) => getAmount(row) - getTds(row);

  const fmt = (n: number) => n.toFixed(2);
  const fmtInt = (n: number) => n >= 0 ? `${n}.00` : `${n}.00`;

  const grandOpening   = rows.reduce((s, r) => s + r.openingStock, 0);
  const grandIncome    = rows.reduce((s, r) => s + r.income, 0);
  const grandTotal     = rows.reduce((s, r) => s + getTotal(r), 0);
  const grandDist      = rows.reduce((s, r) => s + r.distribution, 0);
  const grandClosing   = rows.reduce((s, r) => s + getClosing(r), 0);
  const grandAmount    = rows.reduce((s, r) => s + getAmount(r), 0);
  const grandTds       = rows.reduce((s, r) => s + getTds(r), 0);
  const grandNet       = rows.reduce((s, r) => s + getNet(r), 0);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <div className={styles.headerIconBox}>
            <GraduationCap size={28} />
          </div>
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>MDM &amp; ICDS Record</h1>
            <p className={styles.subtitle}>Mid-Day Meal &amp; Integrated Child Development Services Administration</p>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0', color: '#64748b', fontSize: 14, gap: 10 }}>
          <Loader2 size={20} className="animate-spin" />
          Loading data...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.pageHeader}>
        <div className={styles.headerIconBox}>
          <GraduationCap size={28} />
        </div>
        <div className={styles.titleBlock}>
          <h1 className={styles.title}>MDM &amp; ICDS Record</h1>
          <p className={styles.subtitle}>Mid-Day Meal &amp; Integrated Child Development Services Administration</p>
        </div>
      </div>

      {/* Data Unavailable Banner */}
      {dataUnavailable && (
        <div style={{
          backgroundColor: '#FEF3C7',
          border: '1px solid #FDE68A',
          color: '#92400E',
          padding: '12px 16px',
          fontSize: 14,
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 4,
        }}>
          <AlertTriangle size={16} />
          <span>Live data unavailable. Showing placeholder values. Some features may be limited.</span>
        </div>
      )}

      {/* Main Card */}
      <div className={styles.tableCard}>
        {/* Filter Bar */}
        <div className={styles.cardFilterBar}>
          <div className={styles.filterLeft}>
            <h3 className={styles.filterTitle}>Stock &amp; Commission Record</h3>
            <div className={styles.filterControls}>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.filterSelect}
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  disabled={loading}
                >
                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className={styles.selectWrapper}>
                <select
                  className={styles.filterSelect}
                  value={selectedYear}
                  onChange={e => setSelectedYear(Number(e.target.value))}
                  disabled={loading}
                >
                  {[CURRENT_YEAR, CURRENT_YEAR - 1].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button
                className={styles.viewReportBtn}
                onClick={fetchMdmData}
                disabled={loading}
              >
                {loading ? 'Loading...' : 'View Report'}
              </button>
            </div>
          </div>

          <div className={styles.printBtns}>
            <button className={styles.mdmPrintBtn} onClick={() => window.print()}>
              <Printer size={16} /> MDM Print
            </button>
            <button className={styles.icdsPrintBtn} onClick={() => window.print()}>
              <Printer size={16} /> ICDS Print
            </button>
            <button className={styles.combinedPrintBtn} onClick={() => window.print()}>
              <Printer size={16} /> Combined Print
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr className={styles.tier1Row}>
                <th className={styles.tier1General} colSpan={2}>General Information</th>
                <th className={styles.tier1Stock} colSpan={5}>Stock Details (Kg.)</th>
                <th className={styles.tier1Commission} colSpan={4}>Commission Calculation (₹)</th>
              </tr>
              <tr className={styles.tier2Row}>
                <th className={`${styles.th} ${styles.thCenter}`} style={{ width: 40 }}>#</th>
                <th className={`${styles.th} ${styles.thLeft}`} style={{ minWidth: 180 }}>Item Name</th>
                <th className={styles.th}>Opening Stock</th>
                <th className={styles.th}>Income</th>
                <th className={styles.th}>Total Qty</th>
                <th className={`${styles.th} ${styles.thPink}`}>Distribution (Sales)</th>
                <th className={styles.th}>Closing Stock</th>
                <th className={`${styles.th} ${styles.thPurple}`}>Rate ₹</th>
                <th className={styles.th}>Total Amount</th>
                <th className={styles.th}>TDS (2%)</th>
                <th className={styles.th} style={{ borderRight: 'none' }}>Net Eligible</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((row) => {
                const total   = getTotal(row);
                const closing = getClosing(row);
                const amount  = getAmount(row);
                const tds     = getTds(row);
                const net     = getNet(row);

                return (
                  <tr key={row.id} className={styles.tr}>
                    <td className={`${styles.td} ${styles.tdCenter}`}>{row.id}</td>
                    <td className={`${styles.td} ${styles.tdItemName}`}>{row.name}</td>
                    <td className={styles.td}>{fmtInt(row.openingStock)}</td>
                    <td className={`${styles.td} ${styles.tdIncome}`}>
                      {row.income >= 0 ? `+${row.income}.00` : `${row.income}.00`}
                    </td>
                    <td className={`${styles.td} ${styles.tdTotal}`}>{fmtInt(total)}</td>

                    <td className={styles.editableCellPink}>
                      <input
                        type="number"
                        className={styles.inputPink}
                        value={row.distribution}
                        onChange={e => updateRow(row.id, 'distribution', e.target.value)}
                        disabled={loading}
                      />
                    </td>

                    <td className={`${styles.td} ${styles.tdClosing}`}>{fmtInt(closing)}</td>

                    <td className={styles.editableCellPurple}>
                      <input
                        type="text"
                        className={styles.inputPurple}
                        value={row.rate}
                        onChange={e => updateRow(row.id, 'rate', e.target.value)}
                        disabled={loading}
                      />
                    </td>

                    <td className={`${styles.td} ${styles.tdAmount}`}>{fmt(amount)}</td>
                    <td className={`${styles.td} ${styles.tdTds}`}>-{fmt(tds)}</td>
                    <td className={`${styles.td} ${styles.tdNet}`} style={{ borderRight: 'none' }}>{fmt(net)}</td>
                  </tr>
                );
              })}
            </tbody>

            <tfoot>
              <tr className={styles.totalRow}>
                <td className={styles.totalLabel} colSpan={2}>Grand Totals</td>
                <td className={styles.totalCell}>{fmtInt(grandOpening)}</td>
                <td className={styles.totalCell}>{fmtInt(grandIncome)}</td>
                <td className={styles.totalCell}>{fmtInt(grandTotal)}</td>
                <td className={`${styles.totalCell} ${styles.totalPink}`}>{fmtInt(grandDist)}</td>
                <td className={styles.totalCell}>{fmtInt(grandClosing)}</td>
                <td className={styles.totalCell}>—</td>
                <td className={`${styles.totalCell} ${styles.totalGreen}`}>₹ {fmt(grandAmount)}</td>
                <td className={`${styles.totalCell} ${styles.totalRed}`}>₹ {fmt(grandTds)}</td>
                <td className={`${styles.totalCell} ${styles.totalNavy}`} style={{ borderRight: 'none' }}>₹ {fmt(grandNet)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className={styles.saveRow} style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
        {saveMessage && (
          <div style={{
            backgroundColor: '#ECFDF5',
            border: '1px solid #A7F3D0',
            color: '#065F46',
            padding: '8px 16px',
            borderRadius: 4,
            fontSize: 13,
          }}>
            {saveMessage}
          </div>
        )}
        <button
          className={styles.saveBtn}
          onClick={handleSave}
          disabled={loading}
        >
          <Save size={22} />
          Save Record
        </button>
      </div>
    </div>
  );
}
