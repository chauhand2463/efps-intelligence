'use client';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 'var(--radius-xs)', style }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--surface-gray) 25%, var(--surface-gray-dark) 50%, var(--surface-gray) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', padding: 'var(--space-6)', backgroundColor: 'var(--background)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)' }}>
      <Skeleton width="40%" height={12} />
      <Skeleton width="60%" height={24} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <div style={{ display: 'flex', gap: 'var(--space-4)', padding: 'var(--space-3) 0' }}>
        <Skeleton width="25%" height={14} />
        <Skeleton width="25%" height={14} />
        <Skeleton width="25%" height={14} />
        <Skeleton width="25%" height={14} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 'var(--space-4)' }}>
          <Skeleton width="25%" height={12} />
          <Skeleton width="25%" height={12} />
          <Skeleton width="25%" height={12} />
          <Skeleton width="25%" height={12} />
        </div>
      ))}
    </div>
  );
}
