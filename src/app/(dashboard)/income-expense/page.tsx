'use client';
import { useState } from 'react';
import { 
    Printer, Save, Eye, Trash2, Bell, HelpCircle, 
    Wallet, TrendingUp, TrendingDown, Inbox, AlertTriangle 
} from 'lucide-react';
import styles from './IncomeExpense.module.css';

interface Transaction {
    id: string;
    date: string;
    type: 'Income' | 'Expense';
    description: string;
    amount: number;
}

export default function IncomeExpensePage() {
    const [selectedMonth, setSelectedMonth] = useState('June');
    const [selectedYear, setSelectedYear] = useState('2026');
    const [transactionType, setTransactionType] = useState<'Income' | 'Expense'>('Income');
    
    // Form States
    const [date, setDate] = useState('2026-06-16');
    const [category, setCategory] = useState('Daily grain distribution income');
    const [amount, setAmount] = useState('');
    
    // Transactions Ledger List State
    const [transactions, setTransactions] = useState<Transaction[]>([
        {
            id: '1',
            date: '2026-06-15',
            type: 'Income',
            description: 'Daily grain distribution income',
            amount: 14500
        },
        {
            id: '2',
            date: '2026-06-15',
            type: 'Expense',
            description: 'Electricity bill payment',
            amount: 2100
        }
    ]);

    const handleSaveEntry = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount))) return;

        const newTx: Transaction = {
            id: Date.now().toString(),
            date: date,
            type: transactionType,
            description: category,
            amount: Number(amount)
        };

        setTransactions([newTx, ...transactions]);
        setAmount('');
    };

    const handleDelete = (id: string) => {
        setTransactions(transactions.filter(t => t.id !== id));
    };

    return (
        <div className={styles.container}>
            {/* Maintenance Warning Banner */}
            <div className={styles.maintenanceBanner}>
                <AlertTriangle size={16} />
                <span>System Maintenance scheduled for June 25th at 02:00 AM UTC.</span>
            </div>

            {/* Header Area */}
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Income & Expense Register (Hisab)</h1>
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
                            <span className={styles.adminName}>Administrator</span>
                            <span className={styles.adminStatus}>
                                <span className={styles.statusDot}></span>
                                ONLINE
                            </span>
                        </div>
                        <div className={styles.avatar}>A</div>
                    </div>
                </div>
            </header>

            {/* Content Card */}
            <div className={styles.contentCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardTitleSection}>
                        <h2>Income-Expense Sheet: June - 2026</h2>
                        <p>Manage and track daily administrative ledger entries.</p>
                    </div>
                    <button className={styles.printBtn}>
                        <Printer size={16} />
                        Print Report
                    </button>
                </div>

                {/* Selected Month / Year selectors */}
                <div className={styles.selectionRow}>
                    <div className={styles.fieldGroup}>
                        <label>Selected Month</label>
                        <select 
                            className={styles.selectInput} 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
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
                        <label>Selected Year</label>
                        <select 
                            className={styles.selectInput} 
                            value={selectedYear} 
                            onChange={(e) => setSelectedYear(e.target.value)}
                        >
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                            <option value="2027">2027</option>
                        </select>
                    </div>
                    <button className={styles.viewBtn}>View Hisab</button>
                </div>

                {/* Form to Create New Entry */}
                <div className={styles.transactionFormSection}>
                    <h3 className={styles.sectionHeader}>
                        <span className={styles.iconCircle}>+</span>
                        New Transaction Entry
                    </h3>

                    {/* Toggle Buttons */}
                    <div className={styles.typeToggleGroup}>
                        <button 
                            type="button"
                            className={`${styles.toggleBtn} ${transactionType === 'Income' ? styles.toggleBtnActiveIncome : ''}`}
                            onClick={() => {
                                setTransactionType('Income');
                                setCategory('Daily grain distribution income');
                            }}
                        >
                            <TrendingUp size={16} />
                            Income
                        </button>
                        <button 
                            type="button"
                            className={`${styles.toggleBtn} ${transactionType === 'Expense' ? styles.toggleBtnActiveExpense : ''}`}
                            onClick={() => {
                                setTransactionType('Expense');
                                setCategory('Rent / Shop maintenance');
                            }}
                        >
                            <TrendingDown size={16} />
                            Expense
                        </button>
                    </div>

                    <form onSubmit={handleSaveEntry}>
                        <div className={styles.formGrid}>
                            <div className={styles.fieldGroup}>
                                <label>Transaction Date</label>
                                <input 
                                    type="date" 
                                    className={styles.dateInput} 
                                    value={date} 
                                    onChange={(e) => setDate(e.target.value)}
                                />
                            </div>

                            <div className={styles.fieldGroup} style={{ flex: 2 }}>
                                <label>Primary Category</label>
                                {transactionType === 'Income' ? (
                                    <select 
                                        className={styles.selectInput} 
                                        value={category} 
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="Daily grain distribution income">Daily grain distribution income</option>
                                        <option value="Kerosene sales commission">Kerosene sales commission</option>
                                        <option value="Sugar and salt distribution subsidy">Sugar and salt distribution subsidy</option>
                                        <option value="Other administrative margin">Other administrative margin</option>
                                    </select>
                                ) : (
                                    <select 
                                        className={styles.selectInput} 
                                        value={category} 
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option value="Rent / Shop maintenance">Rent / Shop maintenance</option>
                                        <option value="Electricity bill payment">Electricity bill payment</option>
                                        <option value="Laborer / Loader payments">Laborer / Loader payments</option>
                                        <option value="Stationery and printed slips">Stationery and printed slips</option>
                                        <option value="System maintenance charges">System maintenance charges</option>
                                    </select>
                                )}
                            </div>

                            <div className={styles.fieldGroup}>
                                <label>Amount (Currency: eFPS Units)</label>
                                <input 
                                    type="text" 
                                    placeholder="e.g. 1500" 
                                    className={styles.textInput} 
                                    value={amount} 
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.formActions}>
                            <button type="submit" className={styles.saveBtn}>
                                <Save size={16} />
                                Save Entry
                            </button>
                            <button type="button" className={styles.showHisabBtn}>
                                <Eye size={16} />
                                Show This Month's Hisab
                            </button>
                        </div>
                    </form>
                </div>

                {/* Current Ledger Summary */}
                <div className={styles.ledgerSection}>
                    <div className={styles.ledgerHeader}>
                        <h3 className={styles.ledgerTitle}>Current Ledger Summary</h3>
                        <span className={styles.badge}>{transactions.length} entries recorded</span>
                    </div>

                    <div className={styles.tableContainer}>
                        {transactions.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Inbox className={styles.emptyIcon} size={48} />
                                <p className={styles.emptyText}>No entries recorded for this selection yet.</p>
                            </div>
                        ) : (
                            <table className={styles.ledgerTable}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t) => (
                                        <tr key={t.id}>
                                            <td>{t.date}</td>
                                            <td>
                                                <span className={t.type === 'Income' ? styles.incomeText : styles.expenseText}>
                                                    {t.type}
                                                </span>
                                            </td>
                                            <td>{t.description}</td>
                                            <td>₹{t.amount.toLocaleString('en-IN')}</td>
                                            <td>
                                                <button 
                                                    className={styles.deleteBtn}
                                                    onClick={() => handleDelete(t.id)}
                                                    title="Delete Entry"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
