'use client';
import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { Lock, Search, ChevronLeft, ChevronRight, User } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Dealers.module.css';
import { api, ApiRequestError } from '@/lib/api';
import type { DealerDto } from '@/lib/types';

interface Dealer {
    no: number;
    fpsCode: string;
    licenseNumber: string;
    dealerName: string;
    areaId: string;
    shopAddress: string;
    mainVillage: string;
    linkedShops: string;
}

function toDealer(d: DealerDto, idx: number): Dealer {
    return {
        no: idx + 1,
        fpsCode: d.fps_id,
        licenseNumber: '',
        dealerName: d.full_name,
        areaId: d.area_id ?? '',
        shopAddress: d.address ?? [d.district, d.taluka, d.village].filter(Boolean).join(', '),
        mainVillage: d.village ?? '',
        linkedShops: '00',
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

    // Search filtration
    const filteredDealers = useMemo(() => {
        if (loading) return allDealers;
        if (!searchTerm.trim()) return allDealers;
        const term = searchTerm.toLowerCase();
        return allDealers.filter(d => 
            d.dealerName.toLowerCase().includes(term) ||
            d.fpsCode.includes(term) ||
            d.licenseNumber.toLowerCase().includes(term) ||
            d.mainVillage.toLowerCase().includes(term) ||
            d.areaId.toLowerCase().includes(term)
        );
    }, [searchTerm, allDealers, loading]);

    return (
        <div className={styles.container}>
            {/* Portal Banner Header */}
            <header className={styles.portalHeader}>
                <div className={styles.portalBrand}>
                    <h1>eFPS Master</h1>
                    <span className={styles.portalSubtitle}>Gujarat FPS Portal</span>
                </div>
                <div className={styles.portalNav}>
                    <span className={styles.portalNavLink}>Directives</span>
                    <span className={styles.portalNavLink}>Notifications</span>
                    <span className={styles.portalNavLink}>System Status</span>
                    <div className={styles.avatar}>
                        <User size={14} />
                    </div>
                    <button className={styles.quickActionsBtn}>Quick Actions</button>
                </div>
            </header>

            {/* Inner Dashboard Header */}
            <div className={styles.pageHeaderRow}>
                <div className={styles.pageTitleSection}>
                    <h2>All Gujarat FPS Dealers List</h2>
                    <span className={styles.dealerPill}>
                        Dealer: A.D. Chauhan (Morbi-4 — Permanent)
                    </span>
                </div>
                <Link href="/dashboard">
                    <button className={styles.backBtn}>Back to Dashboard</button>
                </Link>
            </div>

            {/* Privacy Alert */}
            <div className={styles.privacyNotice}>
                <Lock size={16} />
                <span>Privacy Notice: Dealers' personal information (mobile number, payment details, and other particulars) has been hidden for security reasons.</span>
            </div>

            {/* Content Table Card */}
            <div className={styles.contentCard}>
                
                {/* Search & Records per page row */}
                <div className={styles.controlsRow}>
                    <div className={styles.recordsCountSelector}>
                        Show 
                        <select 
                            className={styles.selectCompact}
                            value={recordsPerPage}
                            onChange={(e) => setRecordsPerPage(e.target.value)}
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

                {/* Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.dealersTable}>
                        <thead>
                            <tr>
                                <th>No.</th>
                                <th>FPS Code</th>
                                <th>License Number</th>
                                <th>Dealer Name</th>
                                <th>Area ID</th>
                                <th>Shop Address</th>
                                <th>Main Village</th>
                                <th>Linked Shops</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                                        Loading dealers...
                                    </td>
                                </tr>
                            ) : filteredDealers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                                        No matching dealers found.
                                    </td>
                                </tr>
                            ) : (
                                filteredDealers.map((d) => (
                                    <tr key={d.no}>
                                        <td>{d.no}</td>
                                        <td style={{ fontWeight: 600 }}>{d.fpsCode}</td>
                                        <td>{d.licenseNumber}</td>
                                        <td>{d.dealerName}</td>
                                        <td>{d.areaId}</td>
                                        <td>{d.shopAddress}</td>
                                        <td>{d.mainVillage}</td>
                                        <td style={{ textAlign: 'center' }}>{d.linkedShops}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Footer / Pagination */}
                <div className={styles.tableFooterRow}>
                    <div>
                        Showing 1 to {filteredDealers.length} of {searchTerm ? filteredDealers.length : allDealers.length.toLocaleString()} total dealers
                    </div>

                    <div className={styles.pagination}>
                        <button className={styles.pageBtn} disabled>
                            <ChevronLeft size={14} style={{ marginRight: '4px' }} /> Previous
                        </button>
                        <button className={`${styles.pageBtn} ${styles.pageBtnActive}`}>1</button>
                        <button className={styles.pageBtn}>2</button>
                        <button className={styles.pageBtn}>3</button>
                        <button className={styles.pageBtn}>4</button>
                        <button className={styles.pageBtn}>5</button>
                        <span className={styles.ellipsis}>...</span>
                        <button className={styles.pageBtn}>34</button>
                        <button className={styles.pageBtn}>
                            Next <ChevronRight size={14} style={{ marginLeft: '4px' }} />
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
