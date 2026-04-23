import { useCallback, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import type { MatchCard } from '@cric/types';
import { useApi } from '../../hooks/useApi';
import { useSse } from '../../hooks/useSse';
import { Card, EmptyState, LoadingSkeleton, PillTabs, SectionTitle, StatusBadge } from '../../components/ui';

type CommentaryItem = {
  id: string;
  sequence: number;
  commentary?: string | null;
  runsOffBat: number;
  extrasRuns: number;
  wicket: boolean;
  striker: { displayName: string };
  bowler: { displayName: string };
};

const tabs = ['Overview', 'Scorecard', 'Commentary', 'Squads', 'Stats'];

export function PublicMatchCenterPage() {
  const { matchId } = useParams();
  const [activeTab, setActiveTab] = useState('Overview');

  const overview = useApi<MatchCard>(`/public/matches/${matchId}/overview`);
  const scorecard = useApi<any>(`/public/matches/${matchId}/scorecard`);
  const commentary = useApi<CommentaryItem[]>(`/public/matches/${matchId}/commentary`);
  const squads = useApi<any[]>(`/public/matches/${matchId}/squads`);
  const stats = useApi<any>(`/public/matches/${matchId}/stats`);

  const refetchAll = useCallback(() => {
    void Promise.all([overview.refetch(), scorecard.refetch(), commentary.refetch(), squads.refetch(), stats.refetch()]);
  }, [commentary, overview, scorecard, squads, stats]);

  useSse<{ data: unknown }>(matchId ? `/events/matches/${matchId}` : null, () => {
    refetchAll();
  });

  const loading = overview.loading || scorecard.loading || commentary.loading || squads.loading || stats.loading;

  const content = useMemo(() => {
    if (!overview.data) {
      return <EmptyState title="Match unavailable" body="The selected match could not be loaded." />;
    }

    if (activeTab === 'Overview') {
      return (
        <div className="split-grid">
          <Card>
            <h3>Live Summary</h3>
            <p>
              {overview.data.score
                ? `${overview.data.score.runs}/${overview.data.score.wickets} (${overview.data.score.overs})`
                : 'Score not started'}
            </p>
            <p>{overview.data.statusText}</p>
            <small>Last updated: {overview.data.lastUpdatedAt ? new Date(overview.data.lastUpdatedAt).toLocaleString() : '-'}</small>
          </Card>
          <Card>
            <h3>Match Details</h3>
            <p>
              {overview.data.teamA.name} vs {overview.data.teamB.name}
            </p>
            <p>{overview.data.venue}</p>
            <p>{overview.data.tossText}</p>
          </Card>
        </div>
      );
    }
    if (activeTab === 'Scorecard') {
      return <Card><pre>{JSON.stringify(scorecard.data, null, 2)}</pre></Card>;
    }
    if (activeTab === 'Commentary') {
      return (
        <Card>
          <div className="commentary-list">
            {commentary.data?.map((item) => (
              <article key={item.id}>
                <strong>
                  {item.striker.displayName} vs {item.bowler.displayName}
                </strong>
                <p>
                  {item.runsOffBat + item.extrasRuns} run(s)
                  {item.wicket ? ' + wicket' : ''}
                </p>
                <small>{item.commentary ?? 'No scorer note'}</small>
              </article>
            ))}
          </div>
        </Card>
      );
    }
    if (activeTab === 'Squads') {
      return (
        <Card>
          <ul className="plain-list">
            {squads.data?.map((row) => (
              <li key={row.id}>
                <strong>{row.player.displayName}</strong> <span>{row.player.role}</span>
              </li>
            ))}
          </ul>
        </Card>
      );
    }
    return <Card><pre>{JSON.stringify(stats.data, null, 2)}</pre></Card>;
  }, [activeTab, commentary.data, overview.data, scorecard.data, squads.data, stats.data]);

  return (
    <div className="page-grid">
      {loading ? <LoadingSkeleton rows={6} /> : null}
      {overview.data ? (
        <Card>
          <SectionTitle title={`${overview.data.teamA.shortName} vs ${overview.data.teamB.shortName}`} action={<StatusBadge status={overview.data.status} />} />
          <p>
            {overview.data.matchNumber} • {overview.data.stage} • {overview.data.venue}
          </p>
          <PillTabs tabs={tabs} active={activeTab} onSelect={setActiveTab} />
        </Card>
      ) : null}
      {content}
    </div>
  );
}
