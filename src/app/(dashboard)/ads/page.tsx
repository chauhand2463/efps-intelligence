'use client';

import { Megaphone, Rocket, Play, Zap, MonitorPlay, ShieldCheck, UserCheck, NewReleases } from 'lucide-react';
import styles from './Ads.module.css';

const VIDEOS = [
  { id: 1, label: 'Video 1' },
  { id: 2, label: 'Video 2' },
  { id: 3, label: 'Video 3' },
  { id: 4, label: 'Video 4' },
  { id: 5, label: 'Video 5' },
  { id: 6, label: 'Video 6' },
  { id: 7, label: 'Video 7' },
  { id: 8, label: 'Video 8' },
];

const BENTO_CARDS = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 8-8 8"/><path d="m8 8 8 8"/></svg>,
    title: 'Version 4.2.0 Released',
    body: 'Added automated stock reconciliation and high-speed receipt printing modules.',
  },
  {
    icon: <ShieldCheck size={22} />,
    title: 'Security Patch 08/23',
    body: 'Enhanced encryption for Beneficiary Data and DBT transaction logs.',
  },
  {
    icon: <UserCheck size={22} />,
    title: 'Technical Support',
    body: 'A.D. Chauhan, your dedicated technical officer is available from 10AM to 6PM.',
  },
];

export default function AdsPage() {
  return (
    <div className={styles.container}>
      {/* Page Header */}
      <div className={styles.header}>
        <Megaphone size={22} className={styles.headerIcon} />
        <h1 className={styles.title}>eFPS Master: New Updates &amp; Announcements</h1>
      </div>

      {/* Dark Video Showcase Card */}
      <div className={styles.showcaseCard}>
        {/* Pink Ribbon */}
        <div className={styles.ribbon}>
          <span className={styles.ribbonText}>NEW</span>
          <span className={styles.ribbonText}>UPDATE</span>
        </div>

        {/* Showcase Header */}
        <div className={styles.showcaseHeader}>
          <div className={styles.showcaseTitleRow}>
            <Rocket size={28} className={styles.showcaseTitleIcon} />
            <h2 className={styles.showcaseTitle}>eFPS Master — Software Training &amp; Updates</h2>
          </div>
          <p className={styles.showcaseSubtitle}>
            Stay ahead with our latest feature releases and technical training. Watch the tutorial videos below to master the new eFPS Master dashboard and administrative tools.
          </p>
        </div>

        {/* Video Grid */}
        <div className={styles.videoGrid}>
          {VIDEOS.map((video) => (
            <div
              key={video.id}
              className={styles.videoTile}
              onClick={() => alert(`Opening ${video.label}...`)}
            >
              {/* Tile Header */}
              <div className={styles.videoTileHeader}>
                <MonitorPlay size={16} className={styles.videoTileHeaderIcon} />
                <span className={styles.videoTileLabel}>{video.label}</span>
              </div>

              {/* Thumbnail */}
              <div className={styles.videoThumbnail}>
                {/* Overlay Text */}
                <div className={styles.thumbnailOverlay}>
                  <div className={styles.thumbnailBrand}>eFPS Master</div>
                  <div className={styles.thumbnailSub}>eFPS Master Dashboard</div>
                  <div className={styles.thumbnailBottom}>
                    <span className={styles.channelBadge}>Technical Masterji</span>
                    <span className={styles.videoNumberBadge}>Video No - {video.id}</span>
                  </div>
                </div>

                {/* Play Button */}
                <div className={styles.playBtn}>
                  <Play size={24} fill="white" className={styles.playIcon} />
                </div>

                {/* Green Bottom Strip */}
                <div className={styles.videoBottomStrip}>
                  <Zap size={10} className={styles.stripIcon} />
                  <span className={styles.stripText}>5G Speed Auto-light</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className={styles.ctaRow}>
          <button
            className={styles.subscribeBtn}
            onClick={() => alert('Redirecting to YouTube channel...')}
          >
            <MonitorPlay size={22} />
            Subscribe to Channel
          </button>
          <button
            className={styles.helplineBtn}
            onClick={() => alert('Helpline: 9638104447')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.72 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.63 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            Helpline: 9638104447
          </button>
        </div>

        {/* Credit */}
        <p className={styles.showcaseCredit}>
          Powered by Technical Masterji | eFPS All in One
        </p>
      </div>

      {/* Bento Info Cards */}
      <div className={styles.bentoGrid}>
        {BENTO_CARDS.map((card, idx) => (
          <div key={idx} className={styles.bentoCard}>
            <div className={styles.bentoCardIconBox}>
              {card.icon}
            </div>
            <h3 className={styles.bentoCardTitle}>{card.title}</h3>
            <p className={styles.bentoCardBody}>{card.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
