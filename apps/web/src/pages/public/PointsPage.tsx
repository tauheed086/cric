import type { PointsTableRow } from '@cric/types';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';
import { PointsTableView } from '../../components/PointsTableView';

export function PublicPointsPage() {
  const { data, loading, error } = useApi<PointsTableRow[]>('/public/points-table');

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
