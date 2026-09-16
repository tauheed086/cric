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

  if (!data.hasTournament || !data.tournament) {
    return (
      <div className="page-grid">
        <Card>
          <SectionTitle
            title="Welcome to TurfHero"
            subtitle="You have not configured your tournament yet. Create your tournament to start managing teams, schedules, and live scoring."
          />
          <div style={{ marginTop: '1.5rem' }}>
            <Link to="/admin/tournament" className="button primary" style={{ display: 'inline-block' }}>
              + Create Tournament Now
            </Link>
          </div>
        </Card>
      </div>
    );
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
