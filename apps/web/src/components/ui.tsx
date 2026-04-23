import clsx from 'clsx';
import { Link } from 'react-router-dom';

export function Card(props: React.PropsWithChildren<{ className?: string }>) {
  return <section className={clsx('card', props.className)}>{props.children}</section>;
}

export function SectionTitle({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={clsx('status-badge', `status-${status.toLowerCase()}`)}>{status.replace('_', ' ')}</span>;
}

export function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {hint ? <div className="stat-hint">{hint}</div> : null}
    </Card>
  );
}

export function LoadingSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="skeleton-wrap">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="skeleton-row" />
      ))}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="empty-state">
      <h3>{title}</h3>
      <p>{body}</p>
    </Card>
  );
}

export function PillTabs({
  tabs,
  active,
  onSelect,
}: {
  tabs: string[];
  active: string;
  onSelect: (tab: string) => void;
}) {
  return (
    <div className="pill-tabs">
      {tabs.map((tab) => (
        <button key={tab} className={clsx(active === tab && 'active')} onClick={() => onSelect(tab)}>
          {tab}
        </button>
      ))}
    </div>
  );
}

export function NavCardLink({ to, title, subtitle }: { to: string; title: string; subtitle: string }) {
  return (
    <Link className="nav-card-link" to={to}>
      <strong>{title}</strong>
      <span>{subtitle}</span>
    </Link>
  );
}
