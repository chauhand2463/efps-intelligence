'use client';

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerText?: string;
  centerSubtext?: string;
}

export function DonutChart({ segments, size = 140, strokeWidth = 20, centerText, centerSubtext }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  const arcs = segments.reduce<Array<DonutSegment & { dashArray: string; dashOffset: number; fraction: number }>>((acc, seg) => {
    const fraction = seg.value / total;
    const length = fraction * circumference;
    const currentOffset = acc.reduce((sum, a) => sum + (a.fraction * circumference), 0);
    return [...acc, {
      ...seg,
      dashArray: `${length} ${circumference - length}`,
      dashOffset: -currentOffset,
      fraction,
    }];
  }, []);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--surface-gray-dark)" strokeWidth={strokeWidth} />
      {arcs.map((arc, i) => (
        <circle
          key={i}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={arc.color}
          strokeWidth={strokeWidth}
          strokeDasharray={arc.dashArray}
          strokeDashoffset={arc.dashOffset}
          transform={`rotate(-90 ${center} ${center})`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 0.6s ease, stroke-dashoffset 0.6s ease' }}
        />
      ))}
      {centerText && (
        <text x={center} y={center - (centerSubtext ? 6 : 0)} textAnchor="middle" dominantBaseline="central"
          fill="var(--text-dark)" fontSize="22" fontWeight="700" fontFamily="var(--font-sans, Inter, sans-serif)">
          {centerText}
        </text>
      )}
      {centerSubtext && (
        <text x={center} y={center + 14} textAnchor="middle" dominantBaseline="central"
          fill="var(--text-muted)" fontSize="11" fontWeight="500" fontFamily="var(--font-sans, Inter, sans-serif)">
          {centerSubtext}
        </text>
      )}
    </svg>
  );
}
