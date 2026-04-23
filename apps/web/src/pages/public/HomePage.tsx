import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { DashboardPayload } from '@cric/types';
import { useApi } from '../../hooks/useApi';
import { useSse } from '../../hooks/useSse';
import { Card, LoadingSkeleton, NavCardLink, SectionTitle, StatCard } from '../../components/ui';
import { FixtureCard } from '../../components/FixtureCard';
import { PointsTableView } from '../../components/PointsTableView';
import { LeaderboardBlock } from '../../components/LeaderboardBlock';

export function PublicHomePage() {
  const { data, loading, error, refetch } = useApi<DashboardPayload>('/public/home');
  const refreshDashboard = useCallback(() => {
    void refetch();
  }, [refetch]);

  useSse<{ data: unknown }>('/events/tournament', refreshDashboard);

  if (loading) {
    return <LoadingSkeleton rows={8} />;
  }
  if (error || !data) {
    return <Card>Unable to load tournament dashboard.</Card>;
  }

  return (
    <div className="page-grid">
      <Card className="hero-card">
        <div>
          <span className="hero-kicker">Season {data.season}</span>
          <h1>{data.tournamentName}</h1>
          <p>Admin-controlled scoring with instant public match updates.</p>
        </div>
        <div className="hero-actions">
          <Link to="/public/fixtures" className="button primary">
            View Fixtures
          </Link>
          <Link to="/public/search" className="button secondary">
            Search Players
          </Link>
        </div>
      </Card>

      <section>
        <SectionTitle title="Quick Links" />
        <div className="quick-link-grid">
          <NavCardLink to="/public/fixtures" title="Fixtures" subtitle="Upcoming and live matches" />
          <NavCardLink to="/public/results" title="Results" subtitle="Completed match outcomes" />
          <NavCardLink to="/public/points" title="Points Table" subtitle="Live standings + NRR" />
          <NavCardLink to="/public/stats" title="Stats Center" subtitle="Top performers and records" />
          <NavCardLink to="/public/awards" title="Awards" subtitle="MOM and tournament awards" />
          <NavCardLink to="/public/announcements" title="Announcements" subtitle="Official notices" />
        </div>
      </section>

      <section>
        <SectionTitle title="Ongoing Matches" />
        <div className="card-grid">
          {data.ongoingMatches.map((match) => (
            <FixtureCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Upcoming Fixtures" />
        <div className="card-grid">
          {data.upcomingFixtures.map((match) => (
            <FixtureCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      <section>
        <SectionTitle title="Recent Results" />
        <div className="card-grid">
          {data.recentResults.map((match) => (
            <FixtureCard key={match.id} match={match} />
          ))}
        </div>
      </section>

      <section className="stat-grid">
        <StatCard label="Live Matches" value={data.ongoingMatches.length} />
        <StatCard label="Upcoming" value={data.upcomingFixtures.length} />
        <StatCard label="Recent Results" value={data.recentResults.length} />
        <StatCard label="Announcement" value={data.announcement ? 'Published' : 'None'} />
      </section>

      <section>
        <SectionTitle title="Points Preview" />
        <PointsTableView rows={data.pointsPreview} />
      </section>

      <section className="split-grid">
        <LeaderboardBlock title="Top Batters" rows={data.topBatters} />
        <LeaderboardBlock title="Top Bowlers" rows={data.topBowlers} />
      </section>

      {data.announcement ? (
        <Card>
          <SectionTitle title="Latest Announcement" />
          <h3>{data.announcement.title}</h3>
          <p>{data.announcement.body}</p>
        </Card>
      ) : null}
    </div>
  );
}
