import { useParams } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle, StatCard } from '../../components/ui';

export function PublicPlayerPage() {
  const { playerId } = useParams();
  const { data, loading, error } = useApi<any>(`/public/players/${playerId}`);

  if (loading) {
    return <LoadingSkeleton rows={7} />;
  }
  if (error || !data) {
    return <Card>Unable to load player profile.</Card>;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title={data.player.displayName} />
        <p>
          {data.player.role} • {data.player.battingHand ?? '-'} • {data.player.bowlingType ?? '-'}
        </p>
      </Card>
      <section className="stat-grid">
        <StatCard label="Runs" value={data.stats.runs} />
        <StatCard label="Wickets" value={data.stats.wickets} />
        <StatCard label="Strike Rate" value={data.stats.strikeRate} />
        <StatCard label="Economy" value={data.stats.economy} />
      </section>
      <Card>
        <SectionTitle title="Awards" />
        <ul className="plain-list">
          {data.awards.map((award: any) => (
            <li key={award.id}>
              <strong>{award.type.replaceAll('_', ' ')}</strong>
              <span>{award.reason ?? 'Manual selection'}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
