'use client';

import { useState, useEffect } from 'react';
import { Megaphone, Rocket, Play, Zap, MonitorPlay, ShieldCheck, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import styles from './Ads.module.css';
import { api, ApiRequestError } from '@/lib/api';
import type { Ad } from '@/lib/types';

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

const ICON_MAP: Record<string, React.ReactNode> = {
  announcement: <Megaphone size={22} />,
  notice: <ShieldCheck size={22} />,
  offer: <Rocket size={22} />,
  promotion: <UserCheck size={22} />,
};

export default function AdsPage() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.get<Ad[]>('/ads');
        setAds(data ?? []);
      } catch (err) {
        if (err instanceof ApiRequestError) toast.error(err.message);
        else toast.error('Failed to load announcements');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        {loading ? (
          <div className={styles.bentoCard} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px' }}>
            Loading announcements...
          </div>
        ) : ads.length === 0 ? (
          <div className={styles.bentoCard} style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px' }}>
            No announcements available.
          </div>
        ) : (
          ads.map((ad) => (
            <div key={ad.id} className={styles.bentoCard}>
              <div className={styles.bentoCardIconBox}>
                {ICON_MAP[ad.type] ?? <Megaphone size={22} />}
              </div>
              <h3 className={styles.bentoCardTitle}>{ad.title}</h3>
              <p className={styles.bentoCardBody}>{ad.body}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
