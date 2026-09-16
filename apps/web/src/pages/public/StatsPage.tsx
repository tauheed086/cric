import { useApi } from '../../hooks/useApi';
import { useTournament } from '../../context/TournamentContext';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';
import { LeaderboardBlock } from '../../components/LeaderboardBlock';

export function PublicStatsPage() {
  const { selectedTournamentId } = useTournament();
  const path = selectedTournamentId ? `/public/leaderboards?tournamentId=${encodeURIComponent(selectedTournamentId)}` : '/public/leaderboards';
  const { data, loading, error } = useApi<any>(path);

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Stats Leaderboards" />
        <p>Tournament-wide automated rankings for batting, bowling, and impact metrics.</p>
      </Card>
      {loading ? <LoadingSkeleton rows={8} /> : null}
      {error ? <Card>Unable to load leaderboards.</Card> : null}
      {data ? (
        <div className="split-grid">
          <LeaderboardBlock title="Most Runs" rows={data.mostRuns} />
          <LeaderboardBlock title="Most Wickets" rows={data.mostWickets} />
          <LeaderboardBlock title="Best Strike Rate" rows={data.bestStrikeRate} />
          <LeaderboardBlock title="Best Economy" rows={data.bestEconomy} />
          <LeaderboardBlock title="Most Sixes" rows={data.mostSixes} />
          <LeaderboardBlock title="Most Fours" rows={data.mostFours} />
          <LeaderboardBlock title="MVP" rows={data.mvp} />
        </div>
      ) : null}
    </div>
  );
}
