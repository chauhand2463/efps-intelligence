'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Info, ShieldCheck, Download, Search, Trash2, Save, RefreshCw, X, UserMinus } from 'lucide-react';
import styles from './Customers.module.css';
import { useBeneficiaries } from '@/lib/api-hooks';
import type { Beneficiary, CreateBeneficiaryInput } from '@/lib/types';

export default function CustomerRegisterPage() {
  const beneficiaries = useBeneficiaries();
  const { data: listData, loading: listLoading, reload } = beneficiaries.list;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedData, setSearchedData] = useState<Beneficiary[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  // Smart filters
  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterZone, setFilterZone] = useState('All Zones');
  const [filterStatus, setFilterStatus] = useState('All Records');

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerCard, setNewCustomerCard] = useState('');
  const [newCustomerCategory, setNewCustomerCategory] = useState('BPL (Below Poverty Line)');
  const [newCustomerMembers, setNewCustomerMembers] = useState(4);
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchedData(null);
      return;
    }
    setSearchLoading(true);
    try {
      const result = await beneficiaries.search(searchQuery);
      setSearchedData(result.data);
    } catch {
      toast.error('Search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName || !newCustomerCard) {
      alert('Please fill in Name and Ration Card Number.');
      return;
    }

    setSaving(true);
    try {
      const catKey = newCustomerCategory.split(' ')[0] as CreateBeneficiaryInput['category'];
      await beneficiaries.create({
        head_of_family: newCustomerName,
        ration_card_no: newCustomerCard,
        category: catKey,
        member_count: newCustomerMembers,
        mobile: newCustomerMobile || null,
      });
      await reload();
      setIsModalOpen(false);
      setNewCustomerName('');
      setNewCustomerCard('');
      setNewCustomerCategory('BPL (Below Poverty Line)');
      setNewCustomerMembers(4);
      setNewCustomerMobile('');
      setNewCustomerAddress('');
    } catch {
      toast.error('Failed to create beneficiary');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      alert('No customers selected.');
      return;
    }
    if (confirm(`Are you sure you want to delete ${selectedIds.length} customer(s)?`)) {
      for (const id of selectedIds) {
        try {
          await beneficiaries.remove(id);
        } catch {
          toast.error(`Failed to deactivate beneficiary ${id}`);
        }
      }
      setSelectedIds([]);
      await reload();
    }
  };

  const handleDeleteOne = async (id: string, name: string) => {
    if (confirm(`Delete ${name}?`)) {
      try {
        await beneficiaries.remove(id);
        await reload();
      } catch {
        toast.error('Failed to deactivate beneficiary');
      }
    }
  };

  const handleSaveAllMobiles = () => {
    alert('All localized customer mobile numbers synced to Government Main Registry successfully.');
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCustomers.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map(c => c.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const activeData = searchedData ?? listData;
  const isLoading = listLoading || searchLoading;

  const filteredCustomers = activeData.filter(c => {
    const matchesCategory = filterCategory === 'All Categories' || c.category === filterCategory.split(' ')[0];
    let matchesStatus = true;
    if (filterStatus === 'Verified Only') {
      matchesStatus = c.mobile !== null && c.mobile !== '';
    } else if (filterStatus === 'Pending Mobile Link') {
      matchesStatus = c.mobile === null || c.mobile === '';
    }
    return matchesCategory && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerIconBox}>
            <Users size={24} />
          </div>
          <h1 className={styles.title}>Customer Register</h1>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '64px 0', color: 'var(--text-muted)' }}>
          Loading customers...
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <Users size={24} />
        </div>
        <h1 className={styles.title}>Customer Register</h1>
      </div>

      {/* ZONE 1: Collapsible Info Banners */}
      <section className={styles.banners}>
        <div className={styles.bannerCard} style={{ borderLeft: '4px solid var(--accent-amber)' }}>
          <div className={styles.bannerContent}>
            <Info className="text-amber-500" size={20} />
            <div className={styles.bannerInfo}>
              <p className={styles.bannerTitle}>Annual Record Renewal Pending</p>
              <p className={styles.bannerSub}>Update all customer mobile numbers by end of the current quarter.</p>
            </div>
          </div>
          <button
            className={styles.bannerBtn}
            style={{ backgroundColor: 'var(--accent-amber)' }}
            onClick={() => alert('Renewal form loaded')}
          >
            Click here
          </button>
        </div>

        <div className={styles.bannerCard} style={{ borderLeft: '4px solid var(--accent-purple)' }}>
          <div className={styles.bannerContent}>
            <ShieldCheck className="text-purple-500" size={20} />
            <div className={styles.bannerInfo}>
              <p className={styles.bannerTitle}>New KYC Guidelines Issued</p>
              <p className={styles.bannerSub}>Review the latest directive for Ration Card category verification.</p>
            </div>
          </div>
          <button
            className={styles.bannerBtn}
            style={{ backgroundColor: 'var(--accent-purple)' }}
            onClick={() => alert('KYC directive loaded')}
          >
            Click here
          </button>
        </div>

        <div className={styles.bannerCard} style={{ borderLeft: '4px solid var(--accent-blue)' }}>
          <div className={styles.bannerContent}>
            <Download className="text-blue-500" size={20} />
            <div className={styles.bannerInfo}>
              <p className={styles.bannerTitle}>System Database Backup Ready</p>
              <p className={styles.bannerSub}>Manual sync required for localized customer records from Warehouse Log 4.</p>
            </div>
          </div>
          <button
            className={styles.bannerBtn}
            style={{ backgroundColor: 'var(--accent-blue)' }}
            onClick={() => alert('Backup download triggered')}
          >
            Click here
          </button>
        </div>
      </section>

      {/* ZONE 2: Customer List Controls */}
      <section className={styles.searchSection}>
        <div className={styles.searchHeader}>
          <div className={styles.searchControls}>
            <h3 className={styles.searchTitle}>
              <Search size={18} />
              <span>Search Parameters</span>
            </h3>
            <button className={styles.exportBtn} onClick={() => alert('Excel Exported')}>
              <Download size={14} />
              <span>EXPORT EXCEL</span>
            </button>
          </div>

          <div className={styles.searchBar}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search Ration Card / Name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            />
            <button className={styles.searchBtn} type="button" onClick={handleSearch}>
              <Search size={16} />
            </button>
          </div>
        </div>

        {/* Smart Filters Sub-card */}
        <div className={styles.smartFiltersWrapper}>
          <p className={styles.smartFiltersTitle}>Smart Filters</p>
          <div className={styles.filtersGrid}>
            <div className={styles.filterCol}>
              <label className={styles.filterLabel}>RATION CATEGORY</label>
              <select
                className={styles.filterSelect}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="All Categories">All Categories</option>
                <option value="BPL (Below Poverty Line)">BPL (Below Poverty Line)</option>
                <option value="APL (Above Poverty Line)">APL (Above Poverty Line)</option>
                <option value="AAY (Antyodaya Anna Yojana)">AAY (Antyodaya Anna Yojana)</option>
              </select>
            </div>

            <div className={styles.filterCol}>
              <label className={styles.filterLabel}>WARD/ZONE</label>
              <select
                className={styles.filterSelect}
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
              >
                <option value="All Zones">All Zones</option>
                <option value="North Sector A">North Sector A</option>
                <option value="South Sector B">South Sector B</option>
              </select>
            </div>

            <div className={styles.filterCol}>
              <label className={styles.filterLabel}>VERIFICATION STATUS</label>
              <select
                className={styles.filterSelect}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="All Records">All Records</option>
                <option value="Verified Only">Verified Only</option>
                <option value="Pending Mobile Link">Pending Mobile Link</option>
              </select>
            </div>

            <div className={styles.filterCol} style={{ justifyContent: 'flex-end' }}>
              <button
                className={styles.clearFiltersBtn}
                onClick={() => {
                  setFilterCategory('All Categories');
                  setFilterZone('All Zones');
                  setFilterStatus('All Records');
                  setSearchQuery('');
                  setSearchedData(null);
                }}
              >
                CLEAR FILTERS
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ZONE 3: Action Row */}
      <section className={styles.actionsRow}>
        <div className={styles.actionBtnGroup}>
          <button className={styles.deleteBtn} onClick={handleDeleteSelected}>
            <Trash2 size={14} />
            <span>DELETE SELECTED</span>
          </button>
          <button className={styles.saveAllBtn} onClick={handleSaveAllMobiles}>
            <Save size={14} />
            <span>SAVE ALL MOBILE NUMBERS</span>
          </button>
        </div>
        <div className={styles.resultsCount}>
          Showing <span className={styles.resultsCountNumber}>{filteredCustomers.length}</span> entries
        </div>
      </section>

      {/* ZONE 4: Customer Table Card */}
      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>CUSTOMER REGISTRY DATABASE</h3>
          <div className={styles.tableSyncInfo}>
            <span className={styles.syncLabel}>Last Sync: Today 10:45 AM</span>
            <span className={styles.syncIconBtn} onClick={() => reload()} title="Sync Now">
              <RefreshCw size={14} />
            </span>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    className={styles.checkboxInput}
                    checked={filteredCustomers.length > 0 && selectedIds.length === filteredCustomers.length}
                    onChange={toggleSelectAll}
                    disabled={filteredCustomers.length === 0}
                  />
                </th>
                <th className={styles.th}>SrNo</th>
                <th className={styles.th}>Card Holder Name</th>
                <th className={styles.th}>Ration Card No</th>
                <th className={styles.th}>Category</th>
                <th className={styles.th}>Member</th>
                <th className={styles.th}>Mobile</th>
                <th className={styles.th}>Address</th>
                <th className={`${styles.th} ${styles.thRight}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td className={styles.emptyTd} colSpan={9}>
                    <div className={styles.emptyStateWrapper}>
                      <div className={styles.emptyIconBox}>
                        <UserMinus size={36} />
                      </div>
                      <div>
                        <p className={styles.emptyTitle}>No data found</p>
                        <p className={styles.emptyDesc}>Adjust your filters or try a different search query.</p>
                      </div>
                      <button className={styles.addNewBtn} onClick={() => setIsModalOpen(true)}>
                        ADD NEW CUSTOMER
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust, idx) => (
                  <tr key={cust.id} className={styles.tr}>
                    <td className={styles.td}>
                      <input
                        type="checkbox"
                        className={styles.checkboxInput}
                        checked={selectedIds.includes(cust.id)}
                        onChange={() => toggleSelectOne(cust.id)}
                      />
                    </td>
                    <td className={styles.td}>{idx + 1}</td>
                    <td className={styles.td} style={{ fontWeight: 600 }}>{cust.head_of_family}</td>
                    <td className={styles.td}>{cust.ration_card_no}</td>
                    <td className={styles.td}>{cust.category ?? '—'}</td>
                    <td className={styles.td}>{cust.member_count}</td>
                    <td className={styles.td}>{cust.mobile ?? '—'}</td>
                    <td className={styles.td}>—</td>
                    <td className={`${styles.td} ${styles.tdRight}`}>
                      <button
                        style={{ background: 'none', border: 'none', color: 'var(--offline-red)', cursor: 'pointer', padding: 0, fontWeight: 600 }}
                        onClick={() => handleDeleteOne(cust.id, cust.head_of_family)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination */}
        <div className={styles.paginationRow}>
          <div className={styles.paginationLabel}>
            PAGE {filteredCustomers.length > 0 ? 1 : 0} OF {filteredCustomers.length > 0 ? 1 : 0}
          </div>
          <div className={styles.paginationBtns}>
            <button className={`${styles.pagerBtn} ${styles.pagerBtnDisabled}`} disabled><span className="material-symbols-outlined text-sm">first_page</span></button>
            <button className={`${styles.pagerBtn} ${styles.pagerBtnDisabled}`} disabled><span className="material-symbols-outlined text-sm">chevron_left</span></button>
            <button className={`${styles.pagerBtn} ${styles.pagerBtnDisabled}`} disabled><span className="material-symbols-outlined text-sm">chevron_right</span></button>
            <button className={`${styles.pagerBtn} ${styles.pagerBtnDisabled}`} disabled><span className="material-symbols-outlined text-sm">last_page</span></button>
          </div>
        </div>
      </section>

      {/* ADD CUSTOMER MODAL */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className={styles.modalTitle} style={{ margin: 0 }}>Add New Customer</h3>
              <span style={{ cursor: 'pointer' }} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </span>
            </div>

            <form className={styles.modalForm} onSubmit={handleAddCustomer}>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Card Holder Name</label>
                <input
                  className={styles.textInputModal}
                  type="text"
                  placeholder="Enter full name"
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Ration Card Number</label>
                <input
                  className={styles.textInputModal}
                  type="text"
                  placeholder="Enter 12-digit Ration Card Number"
                  value={newCustomerCard}
                  onChange={(e) => setNewCustomerCard(e.target.value)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Ration Category</label>
                <select
                  className={styles.textInputModal}
                  value={newCustomerCategory}
                  onChange={(e) => setNewCustomerCategory(e.target.value)}
                >
                  <option value="BPL (Below Poverty Line)">BPL (Below Poverty Line)</option>
                  <option value="APL (Above Poverty Line)">APL (Above Poverty Line)</option>
                  <option value="AAY (Antyodaya Anna Yojana)">AAY (Antyodaya Anna Yojana)</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Family Member Count</label>
                <input
                  className={styles.textInputModal}
                  type="number"
                  min="1"
                  max="15"
                  value={newCustomerMembers}
                  onChange={(e) => setNewCustomerMembers(parseInt(e.target.value) || 1)}
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Mobile Number</label>
                <input
                  className={styles.textInputModal}
                  type="text"
                  placeholder="10-digit mobile number (optional)"
                  value={newCustomerMobile}
                  onChange={(e) => setNewCustomerMobile(e.target.value)}
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Address</label>
                <input
                  className={styles.textInputModal}
                  type="text"
                  placeholder="Ward/Sector address details"
                  value={newCustomerAddress}
                  onChange={(e) => setNewCustomerAddress(e.target.value)}
                />
              </div>

              <div className={styles.modalBtnGroup}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsModalOpen(false)} disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className={styles.confirmBtn} disabled={saving}>
                  {saving ? 'Saving...' : 'Add Beneficiary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
