'use client';
import { useState } from 'react';
import { 
    Bell, Settings, AlertTriangle, FileText, Printer, Image 
} from 'lucide-react';
import styles from './MonthlyRecord.module.css';

export default function MonthlyRecordPage() {
    const [month, setMonth] = useState('June');
    const [year, setYear] = useState('2026');

    return (
        <div className={styles.container}>
            {/* System Alert Banner */}
            <div className={styles.systemAlert}>
                <AlertTriangle size={16} />
                <span>System Alert: Stock Reconciliation for June Cycle is now live. Please review allocations.</span>
            </div>

            {/* Header Section */}
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
                            <span className={styles.adminName}>A.D. Chauhan</span>
                            <span className={styles.adminDetails}>Morbi-4 - Permanent (ID: 3617)</span>
                        </div>
                        <div className={styles.avatar}>AD</div>
                    </div>
                </div>
            </header>

            {/* Document Control Card */}
            <div className={styles.contentCard}>
                
                {/* Selector Controls Row */}
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

                        <button className={styles.viewBtn}>
                            <span className={styles.greenDot}></span>
                            View Record
                        </button>
                    </div>

                    <button className={styles.printBtn}>
                        <Printer size={16} />
                        Print
                    </button>
                </div>

                {/* Printable Document Sheet */}
                <div className={styles.documentContainer}>
                    <h2 className={styles.docHeading}>FAIR PRICE SHOP MONTHLY RECORD (GOVERNMENT REGULATED PRICES)</h2>
                    <p className={styles.docSubheading}>Month: {month} - {year}</p>

                    {/* Dealer / Shop Info Grid */}
                    <div className={styles.docInfoGrid}>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Dealer's Name:</span>
                            <span className={styles.infoValue}>Amit D. Chauhan</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Shop Address:</span>
                            <span className={styles.infoValue}>Near Bus Stand, Morbi-4</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Shop Number:</span>
                            <span className={styles.infoValue}>FPS-3617-MOR-4</span>
                        </div>
                        <div className={styles.infoRow}>
                            <span className={styles.infoLabel}>Area ID:</span>
                            <span className={styles.infoValue}>MORBI-ZONE-004</span>
                        </div>
                    </div>

                    {/* Table */}
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
                            <tr>
                                <td colSpan={8}>
                                    <div className={styles.emptyState}>
                                        <Image className={styles.emptyIcon} size={48} />
                                        <p className={styles.emptyText}>No data available for this month.</p>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    {/* Document Footer */}
                    <div className={styles.docFooter}>
                        <div className={styles.generationInfo}>
                            <div className={styles.dateField}>Date: ____________________</div>
                            <div>Generated on: 24 Oct 2023, 14:22</div>
                        </div>

                        <div className={styles.signatureArea}>
                            <div className={styles.signatureLine}></div>
                            <div className={styles.signatureLabel}>DEALER'S SIGNATURE</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
