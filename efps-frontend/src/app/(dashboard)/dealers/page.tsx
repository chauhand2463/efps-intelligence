'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Lock, ChevronLeft, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Dealers.module.css';
import { api, ApiRequestError } from '@/lib/api';
import type { DealerDto } from '@/lib/types';

interface Dealer {
    no: number;
    fpsCode: string;
    dealerName: string;
    areaId: string;
    shopAddress: string;
    mainVillage: string;
}

function toDealer(d: DealerDto, idx: number): Dealer {
    return {
        no: idx + 1,
        fpsCode: d.fps_id,
        dealerName: d.full_name,
        areaId: d.area_id ?? '',
        shopAddress: d.address ?? [d.district, d.taluka, d.village].filter(Boolean).join(', '),
        mainVillage: d.village ?? '',
    };
}

export default function DealersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);
    const [allDealers, setAllDealers] = useState<Dealer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await api.get<DealerDto[]>('/admin/dealers');
                setAllDealers(data.map(toDealer));
            } catch (err) {
                if (err instanceof ApiRequestError && err.statusCode === 403) {
                    try {
                        const fallback = await api.get<DealerDto[]>('/directory');
                        setAllDealers(fallback.map(toDealer));
                    } catch {
                        setAllDealers([]);
                    }
                } else {
                    if (err instanceof ApiRequestError) toast.error(err.message);
                    setAllDealers([]);
                }
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const filteredDealers = useMemo(() => {
        if (loading) return allDealers;
        if (!searchTerm.trim()) return allDealers;
        const term = searchTerm.toLowerCase();
        return allDealers.filter(d => 
            d.dealerName.toLowerCase().includes(term) ||
            d.fpsCode.includes(term) ||
            d.mainVillage.toLowerCase().includes(term) ||
            d.areaId.toLowerCase().includes(term)
        );
    }, [searchTerm, allDealers, loading]);

    const pageSize = parseInt(recordsPerPage, 10);
    const totalPages = Math.max(1, Math.ceil(filteredDealers.length / pageSize));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const startIndex = (safeCurrentPage - 1) * pageSize;
    const pageDealers = filteredDealers.slice(startIndex, startIndex + pageSize);

    const getPageNumbers = () => {
        const pages: (number | '...')[] = [];
        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            if (safeCurrentPage > 3) pages.push('...');
            const start = Math.max(2, safeCurrentPage - 1);
            const end = Math.min(totalPages - 1, safeCurrentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (safeCurrentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    return (
        <div className={styles.container}>
            <header className={styles.portalHeader}>
                <div className={styles.portalBrand}>
                    <h1>eFPS Master</h1>
                    <span className={styles.portalSubtitle}>Gujarat FPS Portal</span>
                </div>
                <div className={styles.portalNav}>
                    <Link href="/notifications" className={styles.portalNavLink}>Notifications</Link>
                    <Link href="/updates" className={styles.portalNavLink}>System Status</Link>
                    <div className={styles.avatar}>
                        <User size={14} />
                    </div>
                </div>
            </header>

            <div className={styles.pageHeaderRow}>
                <div className={styles.pageTitleSection}>
                    <h2>All Gujarat FPS Dealers List</h2>
                    <span className={styles.dealerPill}>
                        Total: {allDealers.length} dealers
                    </span>
                </div>
                <Link href="/dashboard">
                    <button className={styles.backBtn}>Back to Dashboard</button>
                </Link>
            </div>

            <div className={styles.privacyNotice}>
                <Lock size={16} />
                <span>Privacy Notice: Dealers&apos; personal information (mobile number, payment details, and other particulars) has been hidden for security reasons.</span>
            </div>

            <div className={styles.contentCard}>
                <div className={styles.controlsRow}>
                    <div className={styles.recordsCountSelector}>
                        Show 
                        <select 
                            className={styles.selectCompact}
                            value={recordsPerPage}
                            onChange={(e) => { setRecordsPerPage(e.target.value); setCurrentPage(1); }}
                        >
                            <option value="10">10</option>
                            <option value="25">25</option>
                            <option value="50">50</option>
                        </select> 
                        records per page
                    </div>

                    <div className={styles.searchWrapper}>
                        <span>Search:</span>
                        <input 
                            type="text" 
                            className={styles.searchInput}
                            placeholder="Search dealers..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.dealersTable}>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>FPS Code</th>
                                <th>Dealer Name</th>
                                <th>Area ID</th>
                                <th>Shop Address</th>
                                <th>Main Village</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                                        Loading dealers...
                                    </td>
                                </tr>
                            ) : filteredDealers.length === 0 ? (
                                <tr>
                                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                                        No matching dealers found.
                                    </td>
                                </tr>
                            ) : (
                                pageDealers.map((d) => (
                                    <tr key={d.no}>
                                        <td>{d.no}</td>
                                        <td style={{ fontWeight: 600 }}>{d.fpsCode}</td>
                                        <td>{d.dealerName}</td>
                                        <td>{d.areaId}</td>
                                        <td>{d.shopAddress}</td>
                                        <td>{d.mainVillage}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className={styles.tableFooterRow}>
                    <div>
                        Showing {startIndex + 1} to {Math.min(startIndex + pageSize, filteredDealers.length)} of {filteredDealers.length} dealers
                    </div>

                    <div className={styles.pagination}>
                        <button className={styles.pageBtn} disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage(safeCurrentPage - 1)}>
                            <ChevronLeft size={14} style={{ marginRight: '4px' }} /> Previous
                        </button>
                        {getPageNumbers().map((p, i) =>
                            p === '...' ? (
                                <span key={`ellipsis-${i}`} className={styles.ellipsis}>...</span>
                            ) : (
                                <button
                                    key={p}
                                    className={`${styles.pageBtn} ${p === safeCurrentPage ? styles.pageBtnActive : ''}`}
                                    onClick={() => setCurrentPage(p as number)}
                                >
                                    {p}
                                </button>
                            )
                        )}
                        <button className={styles.pageBtn} disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage(safeCurrentPage + 1)}>
                            Next <ChevronRight size={14} style={{ marginLeft: '4px' }} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
