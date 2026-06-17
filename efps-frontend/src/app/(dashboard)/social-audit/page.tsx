'use client';
import { useState } from 'react';
import {
    AlertTriangle, Info, RefreshCw,
    CheckCircle, ExternalLink, Loader2
} from 'lucide-react';
import { api, ApiRequestError } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { monthToApi } from '@/lib/utils';
import type { Beneficiary } from '@/lib/types';
import styles from './SocialAudit.module.css';

const COMMODITY_KEYWORDS = ['wheat', 'rice', 'sugar', 'kerosene', 'oil', 'pulses', 'chana', 'tuverdal', 'salt'];

interface SyncResult {
    total: number;
    success: number;
    errors: Array<{ line: number; identifier: string; commodity: string; error: string }>;
}

function parseAuditBuffer(content: string): Array<{ identifier: string; commodity: string; quantity: number }> {
    const lines = content.trim().split('\n').filter(l => l.trim());
    if (!lines.length) return [];

    const delimiter = content.includes('|') ? '|' : '\t';

    const isHeader = (cols: string[]) =>
        cols.some(c => /^(sr|s\.no|#|sl|sl\.no|serial|bill|date|scheme|product|qty|quantity|name|ration)$/i.test(c.replace(/[^a-zA-Z0-9]/g, '')));

    const results: Array<{ identifier: string; commodity: string; quantity: number }> = [];
    const firstCols = lines[0].split(delimiter).map(c => c.trim()).filter(Boolean);
    const startIndex = isHeader(firstCols) ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.trim()).filter(Boolean);
        if (cols.length < 2) continue;

        let quantity = 0;
        for (let j = cols.length - 1; j >= 0; j--) {
            const cleaned = cols[j].replace(/[,₹\s]/g, '');
            const num = parseFloat(cleaned);
            if (!isNaN(num) && num > 0) { quantity = num; break; }
        }

        let commodity = '';
        for (const col of cols) {
            const lower = col.toLowerCase();
            for (const kw of COMMODITY_KEYWORDS) {
                if (lower.includes(kw)) {
                    commodity = kw.charAt(0).toUpperCase() + kw.slice(1);
                    break;
                }
            }
            if (commodity) break;
        }

        let identifier = '';
        for (const col of cols) {
            const cleaned = col.replace(/[,₹\s]/g, '');
            if (isNaN(parseFloat(cleaned)) && !/^(sr|s\.no|#|sl|name|ration|head|amount|total|grand|bill|date|scheme|product|qty)$/i.test(col.trim())) {
                const lower = col.toLowerCase();
                if (!COMMODITY_KEYWORDS.some(kw => lower.includes(kw))) {
                    identifier = col.trim();
                    break;
                }
            }
        }

        if (!identifier && cols.length > 0) {
            identifier = cols[0].trim();
        }

        if (identifier && quantity > 0) {
            results.push({ identifier, commodity: commodity || 'Unknown', quantity });
        }
    }

    return results;
}

export default function SocialAuditPage() {
    const { dealer } = useAuth();
    const [month, setMonth] = useState('June');
    const [year, setYear] = useState('2026');
    const [buffer, setBuffer] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    const handleSync = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buffer.trim()) return;

        setSyncing(true);
        setSuccessMessage('');
        setSyncResult(null);

        const parsed = parseAuditBuffer(buffer);
        if (!parsed.length) {
            setSyncing(false);
            setSuccessMessage('Could not parse any valid rows. Please check the format (pipe or tab-delimited).');
            return;
        }

        setProgress({ current: 0, total: parsed.length });

        const errors: SyncResult['errors'] = [];
        let successCount = 0;

        for (let i = 0; i < parsed.length; i++) {
            const row = parsed[i];
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
                    errors.push({ line: i + 1, identifier: row.identifier, commodity: row.commodity, error: 'Beneficiary not found' });
                    setProgress(p => ({ ...p, current: p.current + 1 }));
                    continue;
                }

                await api.post('/transactions', {
                    beneficiary_id: beneficiaryId,
                    month: monthToApi(month, year),
                    commodity: row.commodity,
                    quantity_kg: row.quantity,
                    mode: 'pos',
                });

                successCount++;
            } catch (err) {
                const msg = err instanceof ApiRequestError ? err.message : 'Unknown error';
                errors.push({ line: i + 1, identifier: row.identifier, commodity: row.commodity, error: msg });
            }

            setProgress(p => ({ current: p.current + 1, total: parsed.length }));
        }

        setSyncing(false);
        setSyncResult({ total: parsed.length, success: successCount, errors });

        if (successCount > 0) {
            const msg = `Successfully synchronized ${successCount} of ${parsed.length} records for ${month} ${year}.`;
            setSuccessMessage(errors.length > 0 ? `${msg} ${errors.length} row(s) had errors.` : msg);
            setBuffer('');
        } else {
            setSuccessMessage(`Synchronization completed. 0 of ${parsed.length} records could be imported. ${errors.length} error(s) encountered.`);
        }
    };

    const handleClear = () => {
        setBuffer('');
        setSuccessMessage('');
        setSyncResult(null);
    };

    return (
        <div className={styles.container}>
            {/* Maintenance Warning Banner */}
            <div className={styles.maintenanceBanner}>
                <AlertTriangle size={16} />
                <span>System Maintenance scheduled for June 15, 2026. Please finalize all imports before 22:00 IST.</span>
            </div>

            {/* Header Area */}
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Import Entire Month&apos;s Sales At Once</h1>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.adminProfile}>
                        <div className={styles.adminInfo}>
                            <span className={styles.adminName}>{dealer?.full_name ?? 'Dealer'}</span>
                            <span className={styles.adminId}>ID: {dealer?.fps_id ?? '—'}</span>
                        </div>
                        <div className={styles.avatarImg} style={{ backgroundColor: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>AC</div>
                    </div>
                </div>
            </header>

            {/* Region Label Badge */}
            <div className={styles.regionSelector}>
                Region: Gujarat (West)
            </div>

            {/* Content Card */}
            <div className={styles.contentCard}>
                
                {/* Success Alert */}
                {successMessage && (
                    <div className={styles.successAlert}>
                        <CheckCircle size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                        {successMessage}
                    </div>
                )}

                {/* Error Details */}
                {syncResult && syncResult.errors.length > 0 && !syncing && (
                    <div style={{
                        backgroundColor: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: 4,
                        padding: '12px 16px',
                        marginBottom: 16,
                        fontSize: 13,
                        color: '#991B1B',
                    }}>
                        <strong style={{ display: 'block', marginBottom: 8 }}>
                            {syncResult.errors.length} row(s) failed:
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: 16, maxHeight: 120, overflowY: 'auto' }}>
                            {syncResult.errors.slice(0, 10).map((err, idx) => (
                                <li key={idx} style={{ marginBottom: 4 }}>
                                    Line {err.line}: <strong>{err.identifier}</strong> ({err.commodity}) — {err.error}
                                </li>
                            ))}
                            {syncResult.errors.length > 10 && (
                                <li style={{ color: '#6B7280' }}>
                                    ...and {syncResult.errors.length - 10} more
                                </li>
                            )}
                        </ul>
                    </div>
                )}

                {/* Instructions Panel */}
                <div className={styles.instructionsBox}>
                    <h3 className={styles.instructionsTitle}>
                        <Info size={18} />
                        Import Instructions
                    </h3>
                    <ul className={styles.instructionsList}>
                        <li>
                            <span className={styles.stepNumber}>1</span>
                            <span>
                                Log in to the official Gujarat PDS Social Audit portal via this link:{' '}
                                <a 
                                    href="https://ipds.gujarat.gov.in/PDS/SocialAudit/Landing.aspx" 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={styles.linkPill}
                                >
                                    ipds.gujarat.gov.in/PDS/SocialAudit/Landing.aspx <ExternalLink size={10} style={{ display: 'inline' }} />
                                </a>
                            </span>
                        </li>
                        <li>
                            <span className={styles.stepNumber}>2</span>
                            <span>Navigate to the monthly sales report section and filter by your FPS code.</span>
                        </li>
                        <li>
                            <span className={styles.stepNumber}>3</span>
                            <span>Highlight and copy the entire data table (Ctrl + C) including the headers if possible.</span>
                        </li>
                    </ul>
                    
                    <div className={styles.tipBox}>
                        <span>💡</span>
                        <span>
                            <strong>(You can also copy the table directly from the website and paste it — the system will detect it automatically!)</strong>
                        </span>
                    </div>
                </div>

                <form onSubmit={handleSync}>
                    {/* Target Selectors */}
                    <div className={styles.selectorsRow}>
                        <div className={styles.fieldGroup}>
                            <label>Target Month</label>
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
                            <label>Target Year</label>
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
                    </div>

                    {/* Data Input Buffer */}
                    <div className={styles.inputBufferSection}>
                        <label>Data Input Buffer</label>
                        <textarea
                            className={styles.textarea}
                            placeholder={`Paste data from Excel or Site here...

Columns order doesn't matter, we will watch:
[Bill No, Date, Scheme, Product, Quantity]`}
                            value={buffer}
                            onChange={(e) => setBuffer(e.target.value)}
                        />
                    </div>

                    {/* Progress Bar */}
                    {syncing && (
                        <div style={{
                            backgroundColor: '#F0FDF4',
                            border: '1px solid #BBF7D0',
                            borderRadius: 8,
                            padding: 12,
                            marginBottom: 16,
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                <Loader2 size={18} className="animate-spin" style={{ color: '#16A34A' }} />
                                <span style={{ fontWeight: 600, fontSize: 13, color: '#166534' }}>
                                    Processing... {progress.current} of {progress.total}
                                </span>
                            </div>
                            <div style={{
                                width: '100%', height: 6,
                                backgroundColor: '#DCFCE7', borderRadius: 4,
                                overflow: 'hidden',
                            }}>
                                <div style={{
                                    width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                                    height: '100%',
                                    backgroundColor: '#22C55E',
                                    borderRadius: 4,
                                    transition: 'width 0.3s ease',
                                }} />
                            </div>
                        </div>
                    )}

                    {/* Sync Button */}
                    <button 
                        type="submit" 
                        className={styles.syncBtn}
                        disabled={syncing || !buffer.trim()}
                        style={{ opacity: buffer.trim() ? 1 : 0.6 }}
                    >
                        <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                        {syncing ? 'Syncing Records...' : 'Sync All Items With Correct Names'}
                    </button>
                </form>

                {/* Footer Controls */}
                <div className={styles.footerRow}>
                    <div className={styles.connectionStatus}>
                        <span className={styles.statusIndicator}></span>
                        Direct API Connection Verified
                    </div>
                    
                    <div className={styles.footerActions}>
                        <button type="button" className={styles.textLink} onClick={handleClear}>
                            Clear Buffer
                        </button>
                        
                    </div>
                </div>

            </div>
        </div>
    );
}
