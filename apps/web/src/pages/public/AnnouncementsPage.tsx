import { useApi } from '../../hooks/useApi';
import { useTournament } from '../../context/TournamentContext';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

export function PublicAnnouncementsPage() {
  const { selectedTournamentId } = useTournament();
  const path = selectedTournamentId ? `/public/announcements?tournamentId=${encodeURIComponent(selectedTournamentId)}` : '/public/announcements';
  const { data, loading, error } = useApi<any[]>(path);

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Announcements" />
        <p>Official updates for scheduling changes, delays, and tournament notices.</p>
      </Card>
      {loading ? <LoadingSkeleton rows={6} /> : null}
      {error ? <Card>Unable to load announcements.</Card> : null}
      <div className="stack">
        {data?.map((item) => (
          <Card key={item.id}>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
            <small>{new Date(item.publishedAt ?? item.createdAt).toLocaleString()}</small>
          </Card>
        ))}
      </div>
    </div>
  );
}
