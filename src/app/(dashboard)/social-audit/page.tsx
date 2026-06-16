'use client';
import { useState } from 'react';
import { 
    Bell, HelpCircle, AlertTriangle, Info, RefreshCw, 
    CheckCircle, ExternalLink 
} from 'lucide-react';
import styles from './SocialAudit.module.css';

export default function SocialAuditPage() {
    const [month, setMonth] = useState('June');
    const [year, setYear] = useState('2026');
    const [buffer, setBuffer] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const handleSync = (e: React.FormEvent) => {
        e.preventDefault();
        if (!buffer.trim()) return;

        setSyncing(true);
        setSuccessMessage('');

        setTimeout(() => {
            setSyncing(false);
            setSuccessMessage(`Successfully synchronized data for ${month} ${year} from pasted audit records.`);
            setBuffer('');
        }, 1500);
    };

    const handleClear = () => {
        setBuffer('');
        setSuccessMessage('');
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
                    <h1>Import Entire Month's Sales At Once</h1>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.iconButton}>
                        <Bell size={20} />
                    </button>
                    <button className={styles.iconButton}>
                        <HelpCircle size={20} />
                    </button>
                    <div className={styles.adminProfile}>
                        <div className={styles.adminInfo}>
                            <span className={styles.adminName}>A.D. Chauhan</span>
                            <span className={styles.adminId}>ID: 3617</span>
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
                        <span style={{ color: '#cbd5e1' }}>|</span>
                        <button type="button" className={styles.textLink}>
                            Validation Rules
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
