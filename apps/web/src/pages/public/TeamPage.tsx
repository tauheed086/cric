import { Link, useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle, StatCard } from '../../components/ui';

export function PublicTeamPage() {
  const { teamId } = useParams();
  const { data, loading, error } = useApi<any>(`/public/teams/${teamId}`);

  if (loading) {
    return <LoadingSkeleton rows={6} />;
  }
  if (error || !data) {
    return <Card>Unable to load team profile.</Card>;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title={data.team.name} />
        <p>Captain and squad profile with upcoming fixtures and form indicators.</p>
      </Card>
      <section className="stat-grid">
        <StatCard label="Played" value={data.summary?.played ?? 0} />
        <StatCard label="Won" value={data.summary?.won ?? 0} />
        <StatCard label="Lost" value={data.summary?.lost ?? 0} />
        <StatCard label="Points" value={data.summary?.points ?? 0} />
      </section>
      <Card>
        <SectionTitle title="Squad" />
        <ul className="plain-list">
          {data.squad.map((player: any) => (
            <li key={player.id}>
              <Link to={`/public/players/${player.id}`}>{player.displayName}</Link>
              <span>{player.role}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
