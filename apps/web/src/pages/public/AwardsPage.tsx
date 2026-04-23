import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

export function PublicAwardsPage() {
  const { data, loading, error } = useApi<any[]>('/public/awards');

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Awards" />
        <p>Manual admin-selected awards with final locked state support.</p>
      </Card>
      {loading ? <LoadingSkeleton rows={6} /> : null}
      {error ? <Card>Unable to load awards.</Card> : null}
      <div className="card-grid">
        {data?.map((award) => (
          <Card key={award.id}>
            <h3>{award.type.replaceAll('_', ' ')}</h3>
            <p>{award.player.displayName}</p>
            <small>{award.locked ? 'Locked' : 'Editable'} • {award.reason ?? 'Manual selection'}</small>
          </Card>
        ))}
      </div>
    </div>
  );
}
