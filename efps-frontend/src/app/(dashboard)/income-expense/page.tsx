'use client';
import { useState, useEffect, useRef } from 'react';
import { 
    Printer, Save, Trash2, 
    TrendingUp, TrendingDown, Inbox, AlertTriangle 
} from 'lucide-react';
import styles from './IncomeExpense.module.css';
import { useFinance } from '@/lib/api-hooks';
import { monthToApi } from '@/lib/utils';
import type { IncomeEntry, ExpenseEntry } from '@/lib/types';
import toast from 'react-hot-toast';

const MONTH_MAP: Record<string, string> = {
    'January': '01', 'February': '02', 'March': '03', 'April': '04',
    'May': '05', 'June': '06', 'July': '07', 'August': '08',
    'September': '09', 'October': '10', 'November': '11', 'December': '12',
};

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
    
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState('Daily grain distribution income');
    const [amount, setAmount] = useState('');
    
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [profitLoss, setProfitLoss] = useState<{ total_income: number; total_expense: number; net_profit: number } | null>(null);

    const finance = useFinance();
    const financeRef = useRef(finance);
    useEffect(() => { financeRef.current = finance; });

    const loadData = async () => {
        setLoading(true);
        try {
            const month = monthToApi(selectedMonth, selectedYear);
            const f = financeRef.current;
            const [incomeRes, expenseRes] = await Promise.all([
                f.listIncome(1, 100, month),
                f.listExpenses(1, 100, month),
            ]);
            
            const incomeTxs: Transaction[] = (incomeRes?.data ?? []).map((inc: IncomeEntry) => ({
                id: `income-${inc.id}`,
                date: inc.entry_date,
                type: 'Income' as const,
                description: inc.source,
                amount: inc.amount,
            }));
            
            const expenseTxs: Transaction[] = (expenseRes?.data ?? []).map((exp: ExpenseEntry) => ({
                id: `expense-${exp.id}`,
                date: exp.entry_date,
                type: 'Expense' as const,
                description: exp.category,
                amount: exp.amount,
            }));
            
            const all = [...incomeTxs, ...expenseTxs].sort(
                (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            setTransactions(all);
        } catch (err) {
            if (err instanceof Error) toast.error(err.message);
            else toast.error('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    const loadProfitLoss = async () => {
        try {
            const pl = await financeRef.current.getProfitLoss(monthToApi(selectedMonth, selectedYear));
            setProfitLoss(pl);
        } catch {
            toast.error('Failed to load profit/loss summary');
        }
    };

    useEffect(() => {
        loadData();
        loadProfitLoss();
    }, [selectedMonth, selectedYear]);

    const handleSaveEntry = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || isNaN(Number(amount))) return;
        setSaving(true);
        try {
            if (transactionType === 'Income') {
                await finance.addIncome({
                    source: category,
                    amount: Number(amount),
                    entry_date: date,
                });
            } else {
                await finance.addExpense({
                    category: category,
                    amount: Number(amount),
                    entry_date: date,
                });
            }
            setAmount('');
            await Promise.all([loadData(), loadProfitLoss()]);
            toast.success(`${transactionType} entry saved`);
        } catch (err) {
            if (err instanceof Error) toast.error(err.message);
            else toast.error(`Failed to add ${transactionType.toLowerCase()}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            if (id.startsWith('income-')) {
                await finance.deleteIncome(id.replace('income-', ''));
            } else {
                await finance.deleteExpense(id.replace('expense-', ''));
            }
            await Promise.all([loadData(), loadProfitLoss()]);
            toast.success('Entry deleted');
        } catch (err) {
            if (err instanceof Error) toast.error(err.message);
            else toast.error('Failed to delete entry');
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.maintenanceBanner}>
                <AlertTriangle size={16} />
                <span>Income & Expense Register</span>
            </div>

            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <h1>Income & Expense Register (Hisab)</h1>
                </div>
                <div className={styles.headerActions}>
                    <div className={styles.adminProfile}>
                        <div className={styles.adminInfo}>
                            <span className={styles.adminName}>Finance</span>
                            <span className={styles.adminStatus}>
                                <span className={styles.statusDot}></span>
                                ONLINE
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className={styles.contentCard}>
                <div className={styles.cardHeader}>
                    <div className={styles.cardTitleSection}>
                        <h2>Income-Expense Sheet: {selectedMonth} - {selectedYear}</h2>
                        <p>Manage and track daily administrative ledger entries.</p>
                    </div>
                    <button className={styles.printBtn} onClick={() => window.print()}>
                        <Printer size={16} />
                        Print Report
                    </button>
                </div>

                <div className={styles.selectionRow}>
                    <div className={styles.fieldGroup}>
                        <label>Selected Month</label>
                        <select 
                            className={styles.selectInput} 
                            value={selectedMonth} 
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        >
                            {Object.keys(MONTH_MAP).map(m => <option key={m} value={m}>{m}</option>)}
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
                    <button className={styles.viewBtn} onClick={() => { loadData(); loadProfitLoss(); }}>View Hisab</button>
                </div>

                {profitLoss && (
                    <div className={styles.ledgerSection} style={{ marginBottom: '16px' }}>
                        <div className={styles.ledgerHeader}>
                            <h3 className={styles.ledgerTitle}>Profit / Loss Summary</h3>
                        </div>
                        <div style={{ display: 'flex', gap: '24px', padding: '12px 16px' }}>
                            <div>
                                <span style={{ color: '#16a34a', fontWeight: 600 }}>
                                    Total Income: ₹{profitLoss.total_income.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div>
                                <span style={{ color: '#dc2626', fontWeight: 600 }}>
                                    Total Expense: ₹{profitLoss.total_expense.toLocaleString('en-IN')}
                                </span>
                            </div>
                            <div>
                                <span style={{ fontWeight: 700, color: profitLoss.net_profit >= 0 ? '#16a34a' : '#dc2626' }}>
                                    Net Profit: ₹{profitLoss.net_profit.toLocaleString('en-IN')}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.transactionFormSection}>
                    <h3 className={styles.sectionHeader}>
                        <span className={styles.iconCircle}>+</span>
                        New Transaction Entry
                    </h3>

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
                                <label>Amount (₹)</label>
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
                            <button type="submit" className={styles.saveBtn} disabled={saving}>
                                <Save size={16} />
                                {saving ? 'Saving...' : 'Save Entry'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className={styles.ledgerSection}>
                    <div className={styles.ledgerHeader}>
                        <h3 className={styles.ledgerTitle}>Current Ledger Summary</h3>
                        <span className={styles.badge}>{transactions.length} entries recorded</span>
                    </div>

                    <div className={styles.tableContainer}>
                        {loading ? (
                            <div className={styles.emptyState}>
                                <p className={styles.emptyText}>Loading transactions...</p>
                            </div>
                        ) : transactions.length === 0 ? (
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
