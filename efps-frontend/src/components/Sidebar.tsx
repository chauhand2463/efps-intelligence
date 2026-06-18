'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
    Store, Badge, Home, User, LayoutGrid, PlusSquare, FileText, 
    CalendarDays, BarChart2, Calculator, MonitorSmartphone, Users, 
    ListTodo, RefreshCcw, Megaphone, GraduationCap, UserSquare, 
    Landmark, ClipboardCheck, Wallet, List, LogOut, Database
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import styles from './Sidebar.module.css';

const navItems = [
    { id: '01', name: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
    { id: '01b', name: 'Ledger', icon: BarChart2, href: '/ledger' },
    { id: '02', name: 'Stock Entry', icon: PlusSquare, href: '/stock-entry' },
    { id: '03', name: 'Monthly Record', icon: FileText, href: '/monthly-record' },
    { id: '04', name: 'Stock Record (Date-wise)', icon: CalendarDays, href: '/stock-record' },
    { id: '05', name: 'Item-wise Sales', icon: BarChart2, href: '/sales' },
    { id: '06', name: 'Commission Calculator', icon: Calculator, href: '/calculator' },
    { id: '07', name: 'CBDC / Manual Sale', icon: MonitorSmartphone, href: '/manual-sale' },
    { id: '08', name: 'Customer Register', icon: Users, href: '/customers' },
    { id: '09', name: 'Pending Customers List', icon: ListTodo, href: '/pending-customers' },
    { id: '10', name: 'eFPS Updates', icon: RefreshCcw, href: '/updates' },
    { id: '11', name: 'My Ads', icon: Megaphone, href: '/ads' },
    { id: '12', name: 'MDM & ICDS Record', icon: GraduationCap, href: '/mdm-record' },
    { id: '13', name: 'FPS Profile', icon: UserSquare, href: '/profile/edit' },
    { id: '14', name: 'Bank Commission', icon: Landmark, href: '/bank-commission' },
    { id: '15', name: 'Social Audit Import', icon: ClipboardCheck, href: '/social-audit' },
    { id: '16', name: 'Income & Expense', icon: Wallet, href: '/income-expense' },
    { id: '17', name: 'Gujarat FPS Dealer List', icon: List, href: '/dealers' },
    { id: '18', name: 'EFPS Sync', icon: Database, href: '/sync' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, dealer, logout } = useAuth();

    return (
        <aside className={styles.sidebarContainer}>
            {/* SECTION 1 — LOGO BLOCK */}
            <div className={styles.logoBlock}>
                <div className={styles.logoRow}>
                    <div className={styles.logoIcon}>
                        <Store color="white" size={20} />
                    </div>
                    <div className={styles.logoText}>
                        <h1>
                            <span className={styles.amberAccent}>e</span>
                            <span className={styles.whiteText}>FPS Master</span>
                        </h1>
                        <span className={styles.subtitle}>FPS Management System</span>
                    </div>
                </div>
                <div className={styles.divider}></div>
            </div>

            {/* SECTION 2 — ID & ACCOUNT BLOCK */}
            <div className={styles.accountBlock}>
                <div className={styles.idRow}>
                    <Badge color="rgba(255,255,255,0.6)" size={16} />
                    <span className={styles.idLabel}>ID</span>
                    <span className={styles.idValue}>{dealer?.fps_id ?? user?.fps_id ?? '-'}</span>
                </div>
                <div className={styles.accountRow}>
                    <Home color="#93C5FD" size={16} />
                    <span className={styles.accountLabel}>Main Account</span>
                </div>
            </div>

            {/* SECTION 3 — USER NAME LINE */}
            <div className={styles.userLine}>
                <User color="rgba(255,255,255,0.4)" size={18} />
                <span className={styles.userName}>{dealer?.full_name ?? dealer?.fps_id ?? 'User'}</span>
            </div>

            {/* SECTION 4 — NAVIGATION LIST */}
            <nav className={styles.nav}>
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (pathname === '/' && item.href === '/dashboard');
                    return (
                        <Link key={item.id} href={item.href} className={`${styles.navItem} ${isActive ? styles.navItemActive : styles.navItemInactive}`}>
                            <div className={styles.navNumber}>
                                <span>{item.id}</span>
                            </div>
                            <item.icon size={18} />
                            <span className={styles.navText}>{item.name}</span>
                        </Link>
                    )
                })}
            </nav>

            {/* SECTION 5 — LOGOUT BUTTON */}
            <div className={styles.logoutBlock}>
                <button onClick={logout} className={styles.logoutButton}>
                    <LogOut size={18} />
                    <span>LOGOUT</span>
                </button>
            </div>
        </aside>
    );
}
