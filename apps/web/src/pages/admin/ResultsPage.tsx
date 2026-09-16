import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

export function AdminResultsPage() {
  const fixtures = useApi<any[]>('/admin/fixtures');
  const players = useApi<any[]>('/admin/players');
  const [momByMatch, setMomByMatch] = useState<Record<string, string>>({});
  const [savingMatchId, setSavingMatchId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ matchId: string; text: string; isError?: boolean } | null>(null);

  const playerNameMap = useMemo(() => {
    return new Map<string, string>((players.data ?? []).map((p) => [p.id, p.displayName]));
  }, [players.data]);

  const saveMom = async (matchId: string, currentMomId?: string | null) => {
    const playerId = momByMatch[matchId] ?? currentMomId;
    if (!playerId) {
      setMessage({ matchId, text: 'Please select a player for Man of the Match.', isError: true });
      return;
    }
    setSavingMatchId(matchId);
    setMessage(null);
    try {
      await apiPost(`/admin/matches/${matchId}/man-of-match`, { playerId });
      await fixtures.refetch();
      setMessage({ matchId, text: 'Man of the Match updated successfully!' });
    } catch (err: any) {
      setMessage({ matchId, text: err?.message || 'Failed to update Man of the Match', isError: true });
    } finally {
      setSavingMatchId(null);
    }
  };

  if (fixtures.loading || players.loading) {
    return <LoadingSkeleton rows={8} />;
  }

  const getFixturePlayers = (fixture: any) => {
    const all = players.data ?? [];
    const squadRows = fixture.match?.squadSelections ?? [];
    const teamASquadIds = new Set<string>(squadRows.filter((r: any) => r.teamId === fixture.teamAId).map((r: any) => r.playerId));
    const teamBSquadIds = new Set<string>(squadRows.filter((r: any) => r.teamId === fixture.teamBId).map((r: any) => r.playerId));

    let aPlayers: Array<{ id: string; displayName: string }> = [];
    let bPlayers: Array<{ id: string; displayName: string }> = [];

    if (teamASquadIds.size > 0) {
      aPlayers = all.filter((p) => teamASquadIds.has(p.id));
    } else if (fixture.teamA?.teamPlayers) {
      aPlayers = fixture.teamA.teamPlayers.map((tp: any) => tp.player).filter(Boolean);
    }

    if (teamBSquadIds.size > 0) {
      bPlayers = all.filter((p) => teamBSquadIds.has(p.id));
    } else if (fixture.teamB?.teamPlayers) {
      bPlayers = fixture.teamB.teamPlayers.map((tp: any) => tp.player).filter(Boolean);
    }

    aPlayers.sort((x, y) => x.displayName.localeCompare(y.displayName));
    bPlayers.sort((x, y) => x.displayName.localeCompare(y.displayName));

    return { teamAPlayers: aPlayers, teamBPlayers: bPlayers };
  };

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Result Publishing + MOM" />
        <p>Finalize winner text in scoring panel and assign or update Man of the Match here.</p>
      </Card>
      <Card>
        <ul className="plain-list">
          {fixtures.data?.map((fixture) => {
            const matchId = fixture.match?.id;
            const currentMomId = fixture.match?.momPlayerId;
            const selectedMomId = (matchId && momByMatch[matchId]) ?? currentMomId ?? '';
            const currentMomName = currentMomId ? playerNameMap.get(currentMomId) : null;
            const isSaving = savingMatchId === matchId;
            const { teamAPlayers, teamBPlayers } = getFixturePlayers(fixture);

            return (
              <li key={fixture.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem 0', borderBottom: '1px solid var(--color-border, #333)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{fixture.matchNumber}</strong>
                    <span style={{ marginLeft: '0.5rem', color: 'var(--color-text-muted)' }}>
                      {fixture.teamA.name} vs {fixture.teamB.name} • <span style={{ fontWeight: 600 }}>{fixture.match?.status || fixture.status}</span>
                    </span>
                  </div>
                  {currentMomName && (
                    <span style={{ fontSize: '0.85rem', background: 'rgba(234, 179, 8, 0.15)', color: '#eab308', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      MOM: <strong>{currentMomName}</strong>
                    </span>
                  )}
                </div>

                {message && message.matchId === matchId ? (
                  <div style={{ fontSize: '0.85rem', color: message.isError ? '#ef4444' : '#22c55e', fontWeight: 500 }}>
                    {message.text}
                  </div>
                ) : null}

                <div className="inline-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <select
                    value={selectedMomId}
                    disabled={isSaving || !matchId || fixture.match?.status === 'ABANDONED'}
                    onChange={(e) => {
                      if (matchId) {
                        setMomByMatch((prev) => ({
                          ...prev,
                          [matchId]: e.target.value,
                        }));
                      }
                    }}
                    style={{ minWidth: '180px' }}
                  >
                    <option value="">Select MOM</option>
                    {teamAPlayers.length > 0 && (
                      <optgroup label={fixture.teamA.name}>
                        {teamAPlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.displayName}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    {teamBPlayers.length > 0 && (
                      <optgroup label={fixture.teamB.name}>
                        {teamBPlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.displayName}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    className="button secondary"
                    disabled={isSaving || !matchId || !selectedMomId}
                    onClick={() => saveMom(matchId, currentMomId)}
                  >
                    {isSaving ? 'Saving...' : 'Save MOM'}
                  </button>
                  {matchId && (
                    <Link className="button primary" to={`/admin/scoring/${matchId}`}>
                      Open Match
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
