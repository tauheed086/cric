import type { PointsTableRow } from '@cric/types';
import { useApi } from '../../hooks/useApi';
import { useTournament } from '../../context/TournamentContext';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';
import { PointsTableView } from '../../components/PointsTableView';

export function PublicPointsPage() {
  const { selectedTournamentId } = useTournament();
  const path = selectedTournamentId ? `/public/points-table?tournamentId=${encodeURIComponent(selectedTournamentId)}` : '/public/points-table';
  const { data, loading, error } = useApi<PointsTableRow[]>(path);

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Points Table" />
        <p>Auto-calculated standings with NRR and qualification markers.</p>
      </Card>
      {loading ? <LoadingSkeleton rows={7} /> : null}
      {error ? <Card>Unable to load points table.</Card> : null}
      {data ? <PointsTableView rows={data} /> : null}
    </div>
  );
}
