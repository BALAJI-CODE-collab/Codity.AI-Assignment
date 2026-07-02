import { useEffect, useRef, useState } from 'react';

interface MetricCardProps {
  label: string;
  value: string | number;
  detail?: string;
  loading?: boolean;
}

function useAnimatedNumber(value: number) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;

    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) {
      previousValue.current = value;
      setDisplayValue(value);
      return;
    }

    const from = previousValue.current;
    const difference = value - from;
    const duration = 420;
    const startedAt = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(from + difference * eased));

      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        previousValue.current = value;
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value]);

  return displayValue;
}

export function MetricCard({ label, value, detail, loading }: MetricCardProps) {
  const animatedValue = useAnimatedNumber(typeof value === 'number' ? value : 0);

  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      {loading ? (
        <div className="skeleton skeleton-value" aria-label={`${label} loading`} />
      ) : (
        <div className="metric-value">{typeof value === 'number' ? animatedValue : value}</div>
      )}
      {detail ? <div className="metric-detail">{detail}</div> : null}
    </div>
  );
}
