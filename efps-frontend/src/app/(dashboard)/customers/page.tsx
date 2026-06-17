'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Users, Download, Search, Trash2, Save, RefreshCw, X, UserMinus } from 'lucide-react';
import styles from './Customers.module.css';
import { useBeneficiaries } from '@/lib/api-hooks';
import type { Beneficiary, CreateBeneficiaryInput } from '@/lib/types';

export default function CustomerRegisterPage() {
  const beneficiaries = useBeneficiaries();
  const { data: listData, loading: listLoading, reload } = beneficiaries.list;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchedData, setSearchedData] = useState<Beneficiary[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);

  const [filterCategory, setFilterCategory] = useState('All Categories');
  const [filterStatus, setFilterStatus] = useState('All Records');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerCard, setNewCustomerCard] = useState('');
  const [newCustomerCategory, setNewCustomerCategory] = useState('BPL');
  const [newCustomerMembers, setNewCustomerMembers] = useState(4);
  const [newCustomerMobile, setNewCustomerMobile] = useState('');
  const [saving, setSaving] = useState(false);

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
      toast.error('Please fill in Name and Ration Card Number.');
      return;
    }
    setSaving(true);
    try {
      await beneficiaries.create({
        head_of_family: newCustomerName,
        ration_card_no: newCustomerCard,
        category: newCustomerCategory as CreateBeneficiaryInput['category'],
        member_count: newCustomerMembers,
        mobile: newCustomerMobile || null,
      });
      await reload();
      setIsModalOpen(false);
      setNewCustomerName('');
      setNewCustomerCard('');
      setNewCustomerCategory('BPL');
      setNewCustomerMembers(4);
      setNewCustomerMobile('');
      toast.success('Beneficiary created successfully');
    } catch {
      toast.error('Failed to create beneficiary');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) {
      toast.error('No customers selected.');
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
    const missingMobile = filteredCustomers.filter(c => !c.mobile);
    if (missingMobile.length === 0) {
      toast.success('All customers have mobile numbers');
      return;
    }
    const csv = [
      'SrNo,Card Holder Name,Ration Card No,Category',
      ...missingMobile.map((c, i) => `${i + 1},${c.head_of_family},${c.ration_card_no},${c.category ?? ''}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing-mobiles-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${missingMobile.length} customers missing mobile numbers`);
  };

  const handleExportExcel = () => {
    if (filteredCustomers.length === 0) {
      toast.error('No data to export');
      return;
    }
    const csv = [
      'SrNo,Card Holder Name,Ration Card No,Category,Members,Mobile',
      ...filteredCustomers.map((c, i) => `${i + 1},${c.head_of_family},${c.ration_card_no},${c.category ?? ''},${c.member_count},${c.mobile ?? ''}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
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
    const matchesCategory = filterCategory === 'All Categories' || c.category === filterCategory;
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
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <Users size={24} />
        </div>
        <h1 className={styles.title}>Customer Register</h1>
      </div>

      <section className={styles.searchSection}>
        <div className={styles.searchHeader}>
          <div className={styles.searchControls}>
            <h3 className={styles.searchTitle}>
              <Search size={18} />
              <span>Search Parameters</span>
            </h3>
            <button className={styles.exportBtn} onClick={handleExportExcel}>
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
                <option value="BPL">BPL</option>
                <option value="APL">APL</option>
                <option value="AAY">AAY</option>
                <option value="PHH">PHH</option>
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

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <h3 className={styles.tableTitle}>CUSTOMER REGISTRY DATABASE</h3>
          <div className={styles.tableSyncInfo}>
            <span className={styles.syncLabel}>Synced with server</span>
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
                <th className={`${styles.th} ${styles.thRight}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td className={styles.emptyTd} colSpan={8}>
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
      </section>

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
                  <option value="BPL">BPL</option>
                  <option value="APL">APL</option>
                  <option value="AAY">AAY</option>
                  <option value="PHH">PHH</option>
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
