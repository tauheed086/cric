import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

export function AdminResultsPage() {
  const fixtures = useApi<any[]>('/admin/fixtures');
  const players = useApi<any[]>('/admin/players');
  const [momByMatch, setMomByMatch] = useState<Record<string, string>>({});

  const saveMom = async (matchId: string) => {
    const playerId = momByMatch[matchId];
    if (!playerId) {
      return;
    }
    await apiPost(`/admin/matches/${matchId}/man-of-match`, { playerId });
    await fixtures.refetch();
  };

  if (fixtures.loading || players.loading) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Result Publishing + MOM" />
        <p>Finalize winner text in scoring panel and assign Man of the Match here.</p>
      </Card>
      <Card>
        <ul className="plain-list">
          {fixtures.data?.map((fixture) => (
            <li key={fixture.id}>
              <div>
                <strong>{fixture.matchNumber}</strong>
                <span>
                  {fixture.teamA.name} vs {fixture.teamB.name} • {fixture.match?.status}
                </span>
              </div>
              <div className="inline-actions">
                <select
                  value={momByMatch[fixture.match?.id] ?? ''}
                  onChange={(e) =>
                    setMomByMatch((prev) => ({
                      ...prev,
                      [fixture.match?.id]: e.target.value,
                    }))
                  }
                >
                  <option value="">MOM</option>
                  {players.data?.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.displayName}
                    </option>
                  ))}
                </select>
                <button className="button secondary" onClick={() => saveMom(fixture.match?.id)}>
                  Save MOM
                </button>
                <Link className="button primary" to={`/admin/scoring/${fixture.match?.id}`}>
                  Open Match
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
