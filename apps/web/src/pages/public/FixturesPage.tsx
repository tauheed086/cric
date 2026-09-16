import { useCallback, useMemo, useState } from 'react';
import type { MatchCard } from '@cric/types';
import { useApi } from '../../hooks/useApi';
import { useSse } from '../../hooks/useSse';
import { useTournament } from '../../context/TournamentContext';
import { Card, EmptyState, LoadingSkeleton, PillTabs, SectionTitle } from '../../components/ui';
import { FixtureCard } from '../../components/FixtureCard';

const filters = ['ALL', 'UPCOMING', 'IN_PROGRESS', 'COMPLETED', 'ABANDONED', 'DELAYED'];

export function PublicFixturesPage() {
  const { selectedTournamentId } = useTournament();
  const [status, setStatus] = useState('ALL');
  const [date, setDate] = useState('');
  const path = useMemo(() => {
    const query = new URLSearchParams();
    if (selectedTournamentId) {
      query.set('tournamentId', selectedTournamentId);
    }
    if (status !== 'ALL') {
      query.set('status', status);
    }
    if (date) {
      query.set('date', date);
    }
    return `/public/fixtures${query.toString() ? `?${query.toString()}` : ''}`;
  }, [selectedTournamentId, status, date]);

  const { data, loading, error, refetch } = useApi<MatchCard[]>(path);
  const refreshFixtures = useCallback(() => {
    void refetch();
  }, [refetch]);

  useSse<{ data: unknown }>('/events/tournament', refreshFixtures);

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Fixtures" />
        <div className="filter-row">
          <PillTabs tabs={filters} active={status} onSelect={setStatus} />
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </div>
      </Card>
      {loading ? <LoadingSkeleton rows={8} /> : null}
      {error ? <Card>Failed to load fixtures.</Card> : null}
      {!loading && !error && !data?.length ? <EmptyState title="No matches found" body="Change filters or date." /> : null}
      <div className="card-grid fixtures-card-list">
        {data?.map((match) => (
          <FixtureCard key={match.id} match={match} />
        ))}
      </div>
    </div>
  );
}
