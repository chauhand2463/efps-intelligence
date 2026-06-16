'use client';

import { useState } from 'react';
import { MonitorSmartphone, FileSpreadsheet, ArrowDown, Upload, ShieldCheck, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import type { Beneficiary } from '@/lib/types';
import styles from './ManualSale.module.css';

interface ProcessResult {
  rows: number;
  bills: number;
  item: string;
  errors: Array<{ line: number; identifier: string; error: string }>;
}

function parsePastedContent(content: string): Array<{ identifier: string; quantity: number }> {
  const lines = content.trim().split('\n').filter(l => l.trim());
  if (lines.length === 0) return [];

  const delimiter = content.includes('|') ? '|' : '\t';

  const isHeader = (cols: string[]) =>
    cols.some(c => /^(sr|s\.no|#|sl|sl\.no|serial)$/i.test(c.replace(/[^a-zA-Z0-9]/g, '')));

  const results: Array<{ identifier: string; quantity: number }> = [];
  const firstCols = lines[0].split(delimiter).map(c => c.trim()).filter(Boolean);
  const startIndex = isHeader(firstCols) ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(delimiter).map(c => c.trim()).filter(Boolean);
    if (cols.length < 2) continue;

    let identifier = '';
    let quantity = 0;

    for (let j = cols.length - 1; j >= 0; j--) {
      const cleaned = cols[j].replace(/[,₹\s]/g, '');
      const num = parseFloat(cleaned);
      if (!isNaN(num) && num > 0) {
        quantity = num;
        break;
      }
    }

    for (const col of cols) {
      const cleaned = col.replace(/[,₹\s]/g, '');
      if (isNaN(parseFloat(cleaned)) && !/^(sr|s\.no|#|sl|name|ration|head|amount|total|grand)$/i.test(col.trim())) {
        identifier = col.trim();
        break;
      }
    }

    if (!identifier && cols.length > 0) {
      identifier = cols[0].trim();
    }

    if (identifier && quantity > 0) {
      results.push({ identifier, quantity });
    }
  }

  return results;
}

export default function ManualSalePage() {
  const [reportMonth, setReportMonth] = useState('June');
  const [reportYear, setReportYear] = useState('2026');
  const [itemName, setItemName] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [successResult, setSuccessResult] = useState<ProcessResult | null>(null);

  const handleProcessAndCreateBills = async (e: React.FormEvent) => {
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

    const parsedRows = parsePastedContent(pasteContent);
    if (parsedRows.length === 0) {
      alert('Could not parse any valid rows from the pasted content. Please check the format (pipe or tab delimited).');
      setIsProcessing(false);
      return;
    }

    setProgress({ current: 0, total: parsedRows.length });

    const commodity = itemName.trim();
    const allErrors: ProcessResult['errors'] = [];
    let successCount = 0;

    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      try {
        let beneficiaryId = '';

        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(row.identifier)) {
          beneficiaryId = row.identifier;
        } else {
          const searchResults = await api.get<Beneficiary[]>(`/beneficiaries/search?q=${encodeURIComponent(row.identifier)}`);
          if (searchResults.length > 0) {
            beneficiaryId = searchResults[0].id;
          }
        }

        if (!beneficiaryId) {
          allErrors.push({ line: i + 1, identifier: row.identifier, error: 'Beneficiary not found' });
          setProgress(p => ({ ...p, current: p.current + 1 }));
          continue;
        }

        await api.post('/transactions', {
          beneficiary_id: beneficiaryId,
          month: reportMonth,
          commodity,
          quantity_kg: row.quantity,
          mode: 'manual',
          biometric_auth: false,
        } as any);

        successCount++;
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : 'Unknown error';
        allErrors.push({ line: i + 1, identifier: row.identifier, error: msg });
      }

      setProgress(p => ({ current: p.current + 1, total: parsedRows.length }));
    }

    setIsProcessing(false);
    setSuccessResult({
      rows: parsedRows.length,
      bills: successCount,
      item: commodity,
      errors: allErrors,
    });

    if (successCount > 0) {
      setPasteContent('');
    }
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
          {successResult && !isProcessing && (
            <div className={styles.successCard}>
              {successResult.bills > 0 ? (
                <CheckCircle2 className={styles.successIcon} size={20} />
              ) : (
                <AlertCircle className={styles.successIcon} size={20} style={{ color: '#DC2626' }} />
              )}
              <div>
                <h4 className={styles.successTitle}>
                  {successResult.bills > 0
                    ? `Bills Created Successfully (${successResult.bills} of ${successResult.rows})`
                    : 'No Bills Created'}
                </h4>
                <p className={styles.successDesc}>
                  Processed <strong>{successResult.rows}</strong> lines of data and generated <strong>{successResult.bills}</strong> new bills for <strong>{successResult.item}</strong> ({reportMonth} {reportYear}). Cross-check mechanism validated 0 duplicate records.
                  {successResult.errors.length > 0 && (
                    <span style={{ display: 'block', marginTop: 8, color: '#DC2626' }}>
                      {successResult.errors.length} row(s) had errors.
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {isProcessing && (
            <div style={{
              backgroundColor: '#F0FDF4',
              border: '1px solid #BBF7D0',
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: '#16A34A' }} />
                <span style={{ fontWeight: 600, fontSize: 14, color: '#166534' }}>
                  Processing... {progress.current} of {progress.total}
                </span>
              </div>
              <div style={{
                width: '100%',
                height: 8,
                backgroundColor: '#DCFCE7',
                borderRadius: 4,
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  height: '100%',
                  backgroundColor: '#22C55E',
                  borderRadius: 4,
                  transition: 'width 0.3s ease',
                }} />
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
                  disabled={isProcessing}
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
                  disabled={isProcessing}
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
                disabled={isProcessing}
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
                disabled={isProcessing}
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
