import type { ReactNode } from 'react';

interface CardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
}

export function Card({ title, subtitle, children, action }: CardProps) {
  return (
    <section className="card">
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          {subtitle ? <div className="card-subtitle">{subtitle}</div> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
    </section>
  );
}
