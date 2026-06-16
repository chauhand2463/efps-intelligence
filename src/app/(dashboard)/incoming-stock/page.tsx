import { Package, Zap, ChevronRight, ClipboardList, Trash2, Inbox, Verified } from 'lucide-react';
import styles from './IncomingStock.module.css';

export default function IncomingStockPage() {
  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <Package size={24} />
        </div>
        <h1 className={styles.title}>Incoming Stock & New Income Entry</h1>
      </div>

      {/* Section 1: Bulk Entry Banner */}
      <section className={styles.banner}>
        <div className={styles.bannerLeft}>
          <div className={styles.bannerIconBox}>
            <Zap size={32} />
          </div>
          <div>
            <h2 className={styles.bannerTitle}>Bulk Stock Entry</h2>
            <p className={styles.bannerText}>
              Quickly upload multiple stock items from your digital manifest at once.
            </p>
          </div>
        </div>
        <button className={styles.bannerBtn}>
          Click here to add bulk stock
          <ChevronRight size={20} />
        </button>
      </section>

      {/* Section 2: View & Edit Stock Entries Card */}
      <section className="card">
        <div className={styles.cardContent}>
          {/* Header */}
          <div className={styles.cardHeader}>
            <ClipboardList className="text-primary" size={24} />
            <h3 className={styles.cardTitle}>View & Edit Stock Information</h3>
          </div>

          {/* Filter Row */}
          <div className={styles.filterRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Select Month</label>
              <select className={styles.filterSelect}>
                <option>June</option>
                <option>May</option>
                <option>April</option>
              </select>
            </div>
            
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Select Year</label>
              <select className={styles.filterSelect}>
                <option>2026</option>
                <option>2025</option>
                <option>2024</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Stock Type</label>
              <select className={styles.filterSelect}>
                <option>All Types</option>
                <option>Grains</option>
                <option>Oil</option>
                <option>Sugar</option>
              </select>
            </div>

            <button className={styles.viewBtn}>
              <span className={styles.pulseDot}></span>
              View Report
            </button>
          </div>

          {/* Action Row */}
          <div className={styles.deleteBtnRow}>
            <button className={styles.deleteBtn}>
              <Trash2 size={16} />
              DELETE SELECTED
            </button>
          </div>

          {/* Table Container */}
          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th} style={{ width: '48px' }}>
                    <input type="checkbox" className={styles.checkbox} />
                  </th>
                  <th className={styles.th}>Date</th>
                  <th className={styles.th}>Item Name</th>
                  <th className={styles.th}>Type</th>
                  <th className={styles.th}>Qty</th>
                  <th className={`${styles.th} ${styles.thCenter}`}>Action</th>
                </tr>
              </thead>
              <tbody>
                {/* Empty State */}
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIconBox}>
                        <Inbox size={40} />
                      </div>
                      <div>
                        <p className={styles.emptyTitle}>No entries found for the selected month.</p>
                        <p className={styles.emptyDesc}>Try adjusting your filters or add new stock above.</p>
                      </div>
                      <button className={styles.addLink}>Add New Entry Now</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Decorative Illustration Block */}
      <div className={styles.decoGrid}>
        <div className={styles.decoCardLeft}>
          <img 
            src="https://images.unsplash.com/photo-1586528116311-ad8ed7c80a30?q=80&w=2070&auto=format&fit=crop" 
            alt="Logistics Background" 
            className={styles.decoImg} 
          />
          <div className={styles.decoGradient}></div>
          <div className={styles.decoContent}>
            <h4 className={styles.decoTitle}>Inventory Integrity</h4>
            <p className={styles.decoDesc}>
              Maintain absolute accuracy in grain distribution and stock levels with our real-time audit tools.
            </p>
          </div>
        </div>

        <div className={styles.decoCardRight}>
          <div className={styles.decoRightTop}>
            <div className={styles.decoRightIconBox}>
              <Verified size={28} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className={styles.auditLabel}>Last Audit</div>
              <div className={styles.auditDate}>24 June, 2026</div>
            </div>
          </div>
          
          <div>
            <h4 className={styles.decoRightTitle}>Compliance Ready</h4>
            <p className={styles.decoRightDesc}>
              Your stock entries are automatically formatted for state-level Gujarat FPS reporting requirements, ensuring hassle-free monthly submissions.
            </p>
          </div>

          <div className={styles.progressRow}>
            <div className={styles.progressBar}>
              <div className={styles.progressFill}></div>
            </div>
            <span className={styles.progressText}>75% Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}
