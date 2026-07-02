import type { ReactNode } from 'react';

export type ViewKey = 'dashboard' | 'queues' | 'jobs' | 'workers' | 'metrics' | 'architecture';

interface SidebarProps {
  activeView: ViewKey;
  onNavigate: (view: ViewKey) => void;
  onLogout: () => void;
  userName: string;
}

interface NavItem {
  key: ViewKey;
  label: string;
  icon: ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '◉' },
  { key: 'queues', label: 'Queues', icon: '▣' },
  { key: 'jobs', label: 'Jobs', icon: '⧉' },
  { key: 'workers', label: 'Workers', icon: '◌' },
  { key: 'metrics', label: 'Metrics', icon: '◍' },
  { key: 'architecture', label: 'Architecture', icon: '⬢' },
];

export function Sidebar({ activeView, onNavigate, onLogout, userName }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">S</div>
        <div>
          <div className="sidebar-title">Scheduler</div>
          <div className="sidebar-subtitle">Operations Console</div>
        </div>
      </div>

      <nav className="nav-list" aria-label="Primary navigation">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav-item ${activeView === item.key ? 'active' : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user-card">
          <div className="user-avatar small">{userName.charAt(0).toUpperCase()}</div>
          <div>
            <div className="sidebar-title small">{userName}</div>
            <div className="sidebar-subtitle">Signed in</div>
          </div>
        </div>
        <button type="button" className="button button-ghost button-full" onClick={onLogout}>
          Logout
        </button>
      </div>
    </aside>
  );
}
