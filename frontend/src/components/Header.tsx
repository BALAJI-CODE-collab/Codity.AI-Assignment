interface HeaderProps {
  title: string;
  subtitle: string;
  userName: string;
  status: string;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function Header({ title, subtitle, userName, status, onRefresh, isRefreshing }: HeaderProps) {
  return (
    <header className="header">
      <div>
        <h1 className="page-heading">{title}</h1>
        <p className="page-subtitle">{subtitle}</p>
      </div>

      <div className="header-actions">
        <div className="header-status">{status}</div>
        <div className="header-user">
          <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
          <div>
            <div className="header-user-name">{userName}</div>
            <div className="header-user-role">Operator</div>
          </div>
        </div>
        <button type="button" className="button button-secondary" onClick={onRefresh}>
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
    </header>
  );
}
