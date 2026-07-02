import { useEffect, useMemo, useState } from 'react';
import type { MetricsSummary } from '../../types';

interface PipelineFlowProps {
  metrics: MetricsSummary | null;
}

interface StageNode {
  key: 'queued' | 'claimed' | 'running' | 'completed' | 'failed' | 'dead_letter';
  label: string;
  count: number;
  accent: string;
  x: number;
  y: number;
}

interface EdgeLine {
  id: string;
  from: StageNode;
  to: StageNode;
  color: string;
  isPrimary: boolean;
  intensity: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalize(value: number, maximum: number) {
  return maximum > 0 ? clamp(value / maximum, 0, 1) : 0;
}

export function PipelineFlow({ metrics }: PipelineFlowProps) {
  const [time, setTime] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleMotionPreference = () => setReduceMotion(media.matches);

    handleMotionPreference();
    media.addEventListener('change', handleMotionPreference);

    return () => media.removeEventListener('change', handleMotionPreference);
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      setIsVisible(document.visibilityState === 'visible');
    };

    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    if (!isVisible || reduceMotion) return;

    let frame = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = (now - last) / 1000;
      last = now;
      setTime((prev) => prev + delta);
      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [isVisible, reduceMotion]);

  const safeMetrics = metrics ?? {
    total_jobs: 0,
    queued_jobs: 0,
    claimed_jobs: 0,
    running_jobs: 0,
    completed_jobs: 0,
    failed_jobs: 0,
    dead_letter_jobs: 0,
    scheduled_jobs: 0,
    active_workers: 0,
    dead_workers: 0,
    organizations: 0,
    projects: 0,
    queues: 0,
  } as MetricsSummary;

  const nodes = useMemo<StageNode[]>(() => [
    { key: 'queued', label: 'Queued', count: safeMetrics.queued_jobs, accent: '#4ae6ff', x: 40, y: 98 },
    { key: 'claimed', label: 'Claimed', count: safeMetrics.claimed_jobs, accent: '#3b82f6', x: 235, y: 98 },
    { key: 'running', label: 'Running', count: safeMetrics.running_jobs, accent: '#22c55e', x: 430, y: 98 },
    { key: 'completed', label: 'Completed', count: safeMetrics.completed_jobs, accent: '#10b981', x: 625, y: 98 },
    { key: 'failed', label: 'Failed', count: safeMetrics.failed_jobs, accent: '#ef4444', x: 360, y: 240 },
    { key: 'dead_letter', label: 'Dead Letter', count: safeMetrics.dead_letter_jobs, accent: '#a855f7', x: 585, y: 240 },
  ], [safeMetrics.claimed_jobs, safeMetrics.completed_jobs, safeMetrics.dead_letter_jobs, safeMetrics.failed_jobs, safeMetrics.queued_jobs, safeMetrics.running_jobs]);

  const globalMaxStageCount = Math.max(
    nodes[0].count,
    nodes[1].count,
    nodes[2].count,
    nodes[3].count,
    nodes[4].count,
    nodes[5].count,
    1,
  );

  const edges = useMemo<EdgeLine[]>(() => {
    const createEdge = (id: string, from: StageNode, to: StageNode, color: string, isPrimary: boolean) => ({
      id,
      from,
      to,
      color,
      isPrimary,
      intensity: 0.2 + normalize(from.count, globalMaxStageCount) * 0.85,
    });

    return [
      createEdge('queued-claimed', nodes[0], nodes[1], '#4ae6ff', true),
      createEdge('claimed-running', nodes[1], nodes[2], '#3b82f6', true),
      createEdge('running-completed', nodes[2], nodes[3], '#10b981', true),
      createEdge('running-failed', nodes[2], nodes[4], '#ef4444', false),
      createEdge('failed-dead', nodes[4], nodes[5], '#a855f7', false),
    ];
  }, [nodes, globalMaxStageCount]);

  const stageWidth = 160;
  const stageHeight = 92;

  return (
    <div className="pipeline-shell">
      <div className="pipeline-head">
        <div>
          <div className="pipeline-title">Live pipeline</div>
          <div className="pipeline-subtitle">Counts and flow intensity are derived from the current metrics response. Updates follow the app's existing polling cadence.</div>
        </div>
        <div className="pipeline-badge">Realtime</div>
      </div>

      <svg viewBox="0 0 780 360" className="pipeline-svg" role="img" aria-label="Pipeline flow diagram">
        <defs>
          <marker id="pipelineArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#a5b4fc" />
          </marker>
          <linearGradient id="pipelineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ae6ff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.65" />
          </linearGradient>
        </defs>

        {edges.map((edge) => {
          const startX = edge.from.x + stageWidth;
          const startY = edge.from.y + stageHeight / 2;
          const endX = edge.to.x;
          const endY = edge.to.y + stageHeight / 2;
          const midOffset = edge.isPrimary ? 60 : 90;
          const path = `M ${startX} ${startY} C ${startX + midOffset} ${startY} ${endX - midOffset} ${endY} ${endX} ${endY}`;
          const pulseSpeed = 0.5 + edge.intensity * 1.5;
          const progress = ((time * pulseSpeed) % 1 + 1) % 1;
          const pulseX = startX + (endX - startX) * progress;
          const pulseY = startY + (endY - startY) * progress;
          const pulseSize = 4 + edge.intensity * 4;
          const glowSize = 8 + edge.intensity * 6;

          return (
            <g key={edge.id}>
              <path d={path} className={`pipeline-edge ${edge.isPrimary ? '' : 'pipeline-edge-failure'}`} markerEnd="url(#pipelineArrow)" />
              {edge.from.count > 0 && !reduceMotion ? (
                <g>
                  <circle cx={pulseX} cy={pulseY} r={pulseSize} fill={edge.color} opacity={0.95} />
                  <circle cx={pulseX} cy={pulseY} r={glowSize} fill={edge.color} opacity={0.16} />
                </g>
              ) : null}
            </g>
          );
        })}

        {nodes.map((node) => {
          const fill = node.key === 'failed' ? '#111827' : node.key === 'dead_letter' ? '#090b10' : 'rgba(15, 23, 42, 0.92)';
          return (
            <g key={node.key}>
              <rect x={node.x} y={node.y} width={stageWidth} height={stageHeight} rx={18} fill={fill} stroke={node.accent} strokeWidth="1.6" className="pipeline-node" />
              <circle cx={node.x + 26} cy={node.y + 30} r="8" fill={node.accent} opacity="0.96" />
              <text x={node.x + 46} y={node.y + 34} className="pipeline-node-label">{node.label}</text>
              <text x={node.x + 26} y={node.y + 66} className="pipeline-node-count">{node.count}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
