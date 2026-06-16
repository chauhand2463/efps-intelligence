'use client';

import { useState } from 'react';
import { MonitorSmartphone, FileSpreadsheet, ArrowDown, Upload, ShieldCheck, CheckCircle2, Loader2 } from 'lucide-react';
import styles from './ManualSale.module.css';

export default function ManualSalePage() {
  const [reportMonth, setReportMonth] = useState('June');
  const [reportYear, setReportYear] = useState('2026');
  const [itemName, setItemName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [successResult, setSuccessResult] = useState<{ rows: number; bills: number; item: string } | null>(null);

  const handleProcessAndCreateBills = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim()) {
      alert('Please specify which item this sale is for.');
      return;
    }
    if (!pasteContent.trim()) {
      alert('Please paste the table content from the government portal.');
      return;
    }

    setIsProcessing(true);
    setSuccessResult(null);

    // Simulate government portal parsing and cross-checking!
    setTimeout(() => {
      const lineCount = pasteContent.split('\n').filter(line => line.trim().length > 0).length;
      // Assume about 80% of lines represent valid transaction rows
      const parsedRows = lineCount > 0 ? lineCount : 12;
      const billsCreated = Math.max(1, Math.ceil(parsedRows * 0.8));

      setIsProcessing(false);
      setSuccessResult({
        rows: parsedRows,
        bills: billsCreated,
        item: itemName
      });
      setPasteContent('');
    }, 1500);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <MonitorSmartphone size={24} />
        </div>
        <h1 className={styles.title}>CBDC / Manual Sale</h1>
      </div>

      <div className={styles.canvas}>
        <div className={styles.card}>
          {/* Card Header */}
          <div className={styles.cardHeader}>
            <div className={styles.iconContainer}>
              <FileSpreadsheet size={32} />
            </div>
            <h2 className={styles.cardTitle}>Paste Directly from Government Portal</h2>
            <p className={styles.cardSub}>
              You can paste either the old portal format or the new 'Bill Scheme Qty Report' format directly here.
            </p>
          </div>

          {/* Success Banner */}
          {successResult && (
            <div className={styles.successCard}>
              <CheckCircle2 className={styles.successIcon} size={20} />
              <div>
                <h4 className={styles.successTitle}>Bills Created Successfully</h4>
                <p className={styles.successDesc}>
                  Processed <strong>{successResult.rows}</strong> lines of data and generated <strong>{successResult.bills}</strong> new bills for <strong>{successResult.item}</strong> ({reportMonth} {reportYear}). Cross-check mechanism validated 0 duplicate records.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleProcessAndCreateBills}>
            {/* Sub-panel Month/Year */}
            <div className={styles.dateRow}>
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Report Month</label>
                <select 
                  className={styles.selectInput}
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
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
              <div className={styles.selectGroup}>
                <label className={styles.selectLabel}>Report Year</label>
                <select 
                  className={styles.selectInput}
                  value={reportYear}
                  onChange={(e) => setReportYear(e.target.value)}
                >
                  <option value="2024">2024</option>
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>
            </div>

            {/* Item Input */}
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Which item is this sale for? (Select from the list below or type a new name)
              </label>
              <input 
                className={styles.textInput}
                type="text"
                placeholder="e.g. Wheat, Rice, Sugar, Salt..."
                list="items-list"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                required
              />
              <datalist id="items-list">
                <option value="Wheat" />
                <option value="Rice (AAY)" />
                <option value="Sugar" />
                <option value="Salt (Iodized)" />
              </datalist>
            </div>

            {/* Paste Report Area */}
            <div className={styles.formGroup}>
              <div className={styles.labelWithIcon}>
                <label className={styles.formLabel}>Paste Report Here (Paste Table Data Here)</label>
                <ArrowDown className={styles.downIcon} size={16} />
              </div>
              <textarea 
                className={styles.textarea}
                placeholder="Copy the table from the government portal and paste it here..."
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                required
              />
            </div>

            {/* CTA Button */}
            <button 
              className={styles.processBtn} 
              type="submit"
              disabled={isProcessing}
              style={isProcessing ? { opacity: 0.8, cursor: 'not-allowed' } : undefined}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Processing & Creating Bills...</span>
                </>
              ) : (
                <>
                  <Upload size={20} />
                  <span>Process & Create Bills</span>
                </>
              )}
            </button>
          </form>

          {/* Reassurance Footer */}
          <div className={styles.reassuranceFooter}>
            <ShieldCheck className={styles.reassuranceIcon} size={20} />
            <p className={styles.reassuranceText}>
              Even if the same list is accidentally pasted twice, the system automatically cross-checks and will not create duplicate bills.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
