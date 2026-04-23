import type { MatchCard } from '@cric/types';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';
import { FixtureCard } from '../../components/FixtureCard';

export function PublicResultsPage() {
  const { data, loading, error } = useApi<MatchCard[]>('/public/results');

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Results" />
        <p>Completed and abandoned matches with final summaries.</p>
      </Card>
      {loading ? <LoadingSkeleton rows={8} /> : null}
      {error ? <Card>Unable to load results.</Card> : null}
      <div className="card-grid">
        {data?.map((match) => (
          <FixtureCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
