'use client';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Lock, Search, ChevronLeft, ChevronRight, User } from 'lucide-react';
import styles from './Dealers.module.css';

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

export default function DealersPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [recordsPerPage, setRecordsPerPage] = useState('10');
    const [currentPage, setCurrentPage] = useState(1);

    const initialDealers: Dealer[] = [
        {
            no: 1,
            fpsCode: '241200100001',
            licenseNumber: 'LCS-4421/2020',
            dealerName: 'Amin Purvarginiben Dipakkumar',
            areaId: 'URB-01',
            shopAddress: 'Plot No 42, Green City, Sector 2, Gandhinagar',
            mainVillage: 'Adalaj',
            linkedShops: '02'
        },
        {
            no: 2,
            fpsCode: '241200100002',
            licenseNumber: 'LCS-9982/2018',
            dealerName: 'Ashokkumar Mangaldas Barot',
            areaId: 'RUR-14',
            shopAddress: 'Near Gram Panchayat, Main Bazar, Mansa',
            mainVillage: 'Mansa',
            linkedShops: '01'
        },
        {
            no: 3,
            fpsCode: '241200100003',
            licenseNumber: 'LCS-7712/2021',
            dealerName: 'Bhavnaben Rajeshbhai Patel',
            areaId: 'URB-05',
            shopAddress: 'Shop No 4, Shivalay Complex, Kudasan',
            mainVillage: 'Kudasan',
            linkedShops: '00'
        },
        {
            no: 4,
            fpsCode: '241200100004',
            licenseNumber: 'LCS-1123/2019',
            dealerName: 'Chetankumar Ishwarbhai Solanki',
            areaId: 'URB-02',
            shopAddress: 'B-22, Madhav Residency, Sargasan Road',
            mainVillage: 'Sargasan',
            linkedShops: '01'
        },
        {
            no: 5,
            fpsCode: '241200100005',
            licenseNumber: 'LCS-8832/2017',
            dealerName: 'Dineshchandra Mafatlal Prajapati',
            areaId: 'RUR-09',
            shopAddress: 'Vraj Bhumi Society, Near Bus Station, Kalol',
            mainVillage: 'Kalol',
            linkedShops: '03'
        },
        {
            no: 6,
            fpsCode: '241200100006',
            licenseNumber: 'LCS-3345/2022',
            dealerName: 'Hansaben Bharatbhai Vaghela',
            areaId: 'URB-11',
            shopAddress: 'Shop No 112, Trade Hub, Sector 21',
            mainVillage: 'Gandhinagar',
            linkedShops: '00'
        },
        {
            no: 7,
            fpsCode: '241200100007',
            licenseNumber: 'LCS-6671/2020',
            dealerName: 'Jayeshkumar Ramanlal Parmar',
            areaId: 'RUR-02',
            shopAddress: 'ST Stand Road, Opposite Milk Dairy, Dehgam',
            mainVillage: 'Dehgam',
            linkedShops: '01'
        },
        {
            no: 8,
            fpsCode: '241200100008',
            licenseNumber: 'LCS-2211/2016',
            dealerName: 'Kalpeshkumar Ganeshbhai Rathod',
            areaId: 'URB-08',
            shopAddress: 'GIDC Plot No 12/A, Electronic Estate',
            mainVillage: 'Sector 26',
            linkedShops: '00'
        },
        {
            no: 9,
            fpsCode: '241200100009',
            licenseNumber: 'LCS-5541/2021',
            dealerName: 'Meenaben Arvindbhai Makwana',
            areaId: 'RUR-07',
            shopAddress: 'Main Cross Road, Village Pethapur',
            mainVillage: 'Pethapur',
            linkedShops: '02'
        },
        {
            no: 10,
            fpsCode: '241200100010',
            licenseNumber: 'LCS-4412/2019',
            dealerName: 'Pareshkumar Kantilal Mevada',
            areaId: 'URB-14',
            shopAddress: 'Shop No G-10, Apple Square, Randheja',
            mainVillage: 'Randheja',
            linkedShops: '01'
        }
    ];

    // Search filtration
    const filteredDealers = useMemo(() => {
        if (!searchTerm.trim()) return initialDealers;
        const term = searchTerm.toLowerCase();
        return initialDealers.filter(d => 
            d.dealerName.toLowerCase().includes(term) ||
            d.fpsCode.includes(term) ||
            d.licenseNumber.toLowerCase().includes(term) ||
            d.mainVillage.toLowerCase().includes(term) ||
            d.areaId.toLowerCase().includes(term)
        );
    }, [searchTerm, initialDealers]);

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
                            {filteredDealers.length === 0 ? (
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
                        Showing 1 to {filteredDealers.length} of {searchTerm ? filteredDealers.length : '16,885'} total dealers
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
