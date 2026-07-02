import { Card } from '../components/Card';
import { Header } from '../components/Header';
import { ArchitectureDiagram } from '../components/ArchitectureDiagram';

interface ArchitectureProps {
  onRefresh: () => void;
  refreshing: boolean;
  userName: string;
}

export function Architecture({ onRefresh, refreshing, userName }: ArchitectureProps) {
  return (
    <div className="page-stack">
      <Header title="Architecture" subtitle="Live system topology and execution flow" userName={userName} status="Healthy" onRefresh={onRefresh} isRefreshing={refreshing} />
      <div className="page-hero">
        <div>
          <div className="hero-eyebrow">System topology</div>
          <h2 className="hero-title">The scheduler backbone, mapped in motion</h2>
          <p className="hero-copy">Follow the request path across gateway, auth, scheduler, queue, workers, database, and monitoring services.</p>
        </div>
        <div className="hero-badges">
          <span className="hero-chip">Heartbeat flow</span>
          <span className="hero-chip">Retry flow</span>
          <span className="hero-chip">Monitoring flow</span>
        </div>
      </div>
      <Card title="Execution topology" subtitle="Connected services, workers, and monitoring paths">
        <ArchitectureDiagram />
      </Card>
    </div>
  );
}
