'use client';

import { RefreshCcw, Download, ExternalLink, HelpCircle, HeadphonesIcon, Info, ChevronRight, Puzzle, Terminal } from 'lucide-react';
import styles from './Updates.module.css';

interface DownloadItem {
  id: number;
  name: string;
  date: string;
  type: 'link' | 'download';
  icon: 'extension' | 'driver' | 'terminal';
}

const DOWNLOAD_ITEMS: DownloadItem[] = [
  {
    id: 1,
    name: 'Google Chrome Extension — Direct Add Link',
    date: '19-04-2026 03:43 PM',
    type: 'link',
    icon: 'extension',
  },
  {
    id: 2,
    name: 'Mozilla Firefox Extension — Direct Add Link',
    date: '19-04-2026 03:42 PM',
    type: 'link',
    icon: 'extension',
  },
  {
    id: 3,
    name: 'Mantra Driver 2.1.0.0',
    date: '24-02-2026 06:22 PM',
    type: 'download',
    icon: 'driver',
  },
  {
    id: 4,
    name: 'Mantra RD Service 1.4.1',
    date: '24-02-2026 06:22 PM',
    type: 'download',
    icon: 'terminal',
  },
];

function FileIcon({ type }: { type: 'extension' | 'driver' | 'terminal' }) {
  if (type === 'extension') return <Puzzle size={20} className={styles.fileIcon} />;
  if (type === 'terminal') return <Terminal size={20} className={styles.fileIcon} />;
  return <Download size={20} className={styles.fileIcon} />;
}

export default function UpdatesPage() {
  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <div className={styles.headerIconBox}>
          <RefreshCcw size={22} />
        </div>
        <h1 className={styles.title}>eFPS Updates &amp; Download Center</h1>
      </div>

      {/* System Alert Banner */}
      <div className={styles.systemAlert}>
        <Info size={20} className={styles.alertIcon} />
        <div className={styles.alertTextBlock}>
          <p className={styles.alertTitle}>Latest System Update Available</p>
          <p className={styles.alertSub}>
            Version 2.4.1 deployment completed. Please clear browser cache if encountering display issues.
          </p>
        </div>
      </div>

      {/* Download Center Card */}
      <section className={styles.downloadCard}>
        <header className={styles.downloadCardHeader}>
          <Download size={20} className={styles.downloadCardHeaderIcon} />
          <h2 className={styles.downloadCardTitle}>Download Center</h2>
        </header>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead className={styles.thead}>
              <tr>
                <th className={styles.th}>File Name / Update Name</th>
                <th className={styles.th}>Date</th>
                <th className={`${styles.th} ${styles.thCenter}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {DOWNLOAD_ITEMS.map((item, idx) => (
                <tr
                  key={item.id}
                  className={`${styles.tr} ${idx % 2 === 0 ? styles.trOdd : styles.trEven}`}
                >
                  <td className={styles.td}>
                    <div className={styles.fileNameRow}>
                      <FileIcon type={item.icon} />
                      <span className={styles.fileName}>{item.name}</span>
                    </div>
                  </td>
                  <td className={styles.td}>
                    <span className={styles.tdDateText}>{item.date}</span>
                  </td>
                  <td className={`${styles.td} ${styles.tdCenter}`}>
                    {item.type === 'link' ? (
                      <button
                        className={styles.openLinkBtn}
                        onClick={() => alert(`Opening: ${item.name}`)}
                      >
                        <ExternalLink size={14} />
                        Open Link
                      </button>
                    ) : (
                      <button
                        className={styles.downloadBtn}
                        onClick={() => alert(`Downloading: ${item.name}`)}
                      >
                        <Download size={14} />
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Info Cards Row */}
      <div className={styles.infoCardsRow}>
        {/* Installation Guide */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardTop}>
            <div className={`${styles.infoCardIconBox} ${styles.infoCardIconBoxBlue}`}>
              <HelpCircle size={20} className={styles.infoCardIconBoxIcon} />
            </div>
            <div>
              <h3 className={styles.infoCardTitle}>Installation Guide</h3>
              <p className={styles.infoCardSubLabel}>Step-by-step PDF manual</p>
            </div>
          </div>
          <p className={styles.infoCardBody}>
            Ensure you have administrative privileges on your terminal before installing Mantra RD services or driver updates.
          </p>
          <button
            className={styles.infoCardLink}
            onClick={() => alert('Opening installation guide...')}
          >
            Read Guide <ChevronRight size={14} />
          </button>
        </div>

        {/* Technical Support */}
        <div className={styles.infoCard}>
          <div className={styles.infoCardTop}>
            <div className={`${styles.infoCardIconBox} ${styles.infoCardIconBoxAmber}`}>
              <HeadphonesIcon size={20} className={styles.infoCardIconBoxIcon} />
            </div>
            <div>
              <h3 className={styles.infoCardTitle}>Technical Support</h3>
              <p className={styles.infoCardSubLabel}>Direct line for eFPS Admin</p>
            </div>
          </div>
          <p className={styles.infoCardBody}>
            Having trouble with a link or driver? Contact our 24/7 technical desk for remote assistance.
          </p>
          <button
            className={`${styles.infoCardLink} ${styles.infoCardLinkAmber}`}
            onClick={() => alert('Connecting to support...')}
          >
            Contact Support <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
