import { Download, Filter } from 'lucide-react';
import styles from './Report.module.css';

export default function MonthlySalesReportPage() {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h2 className={styles.title}>Monthly Sales Report</h2>
          <p className="text-muted">Detailed breakdown of commodity distributions for the current month.</p>
        </div>
        <button className="btn" style={{ backgroundColor: 'var(--primary-navy)', color: 'white' }}>
          <Download size={16} style={{ marginRight: '8px' }} />
          Download CSV
        </button>
      </header>

      <div className={styles.controls}>
        <select className={styles.select}>
          <option>October 2024</option>
          <option>September 2024</option>
          <option>August 2024</option>
        </select>
        
        <select className={styles.select}>
          <option>All Commodities</option>
          <option>Wheat</option>
          <option>Rice</option>
          <option>Sugar</option>
        </select>
        
        <button className="btn" style={{ backgroundColor: 'white', border: '1px solid var(--border-light)', color: 'var(--text-dark)', padding: '10px 16px', height: 'auto' }}>
          <Filter size={16} style={{ marginRight: '8px' }} />
          More Filters
        </button>
      </div>

      <div className="card">
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Commodity</th>
                <th className={styles.th}>Opening Balance</th>
                <th className={styles.th}>Received</th>
                <th className={styles.th}>Distributed</th>
                <th className={styles.th}>Closing Balance</th>
                <th className={styles.th}>Variance</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.commodity}>Wheat (AAY)</div>
                  <span className={styles.badge}>Grain</span>
                </td>
                <td className={styles.td}>1,200 kg</td>
                <td className={styles.td}>3,500 kg</td>
                <td className={styles.td}>4,280 kg</td>
                <td className={styles.td}>420 kg</td>
                <td className={styles.td} style={{ color: 'var(--online-green)', fontWeight: 500 }}>0 kg</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.commodity}>Rice (PHH)</div>
                  <span className={styles.badge}>Grain</span>
                </td>
                <td className={styles.td}>800 kg</td>
                <td className={styles.td}>2,000 kg</td>
                <td className={styles.td}>1,850 kg</td>
                <td className={styles.td}>950 kg</td>
                <td className={styles.td} style={{ color: 'var(--online-green)', fontWeight: 500 }}>0 kg</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.commodity}>Sugar</div>
                  <span className={styles.badge}>Misc</span>
                </td>
                <td className={styles.td}>100 kg</td>
                <td className={styles.td}>500 kg</td>
                <td className={styles.td}>420 kg</td>
                <td className={styles.td}>180 kg</td>
                <td className={styles.td} style={{ color: 'var(--offline-red)', fontWeight: 500 }}>-2 kg</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.commodity}>Edible Oil</div>
                  <span className={styles.badge}>Misc</span>
                </td>
                <td className={styles.td}>50 L</td>
                <td className={styles.td}>200 L</td>
                <td className={styles.td}>180 L</td>
                <td className={styles.td}>70 L</td>
                <td className={styles.td} style={{ color: 'var(--online-green)', fontWeight: 500 }}>0 L</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
