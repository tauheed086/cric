import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle, StatCard } from '../../components/ui';

export function AdminDashboardPage() {
  const { data, loading, error } = useApi<any>('/admin/dashboard');

  if (loading) {
    return <LoadingSkeleton rows={8} />;
  }
  if (error || !data) {
    return <Card>Unable to load admin dashboard.</Card>;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Tournament Operations Dashboard" />
        <p>
          {data.tournament.name} • Season {data.tournament.season}
        </p>
      </Card>

      <section className="stat-grid">
        <StatCard label="Matches Today" value={data.cards.matchesToday} />
        <StatCard label="Pending Updates" value={data.cards.pendingScoreUpdates} />
        <StatCard label="In Progress" value={data.cards.inProgressMatches} />
        <StatCard label="Completed" value={data.cards.completedMatches} />
      </section>

      <Card>
        <SectionTitle title="Alerts" />
        <ul className="plain-list">
          {data.alerts.map((alert: any) => (
            <li key={alert.id}>
              <strong>{alert.matchNumber}</strong>
              <span>{alert.status}</span>
              <Link to={`/admin/scoring/${alert.id}`}>Open</Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
