import { useState } from 'react';
import { apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

const awardTypes = [
  'MAN_OF_THE_MATCH',
  'PLAYER_OF_THE_SERIES',
  'BEST_BATTER',
  'BEST_BOWLER',
  'EMERGING_PLAYER',
  'BEST_FIELDER',
] as const;

export function AdminAwardsPage() {
  const awards = useApi<any[]>('/admin/awards');
  const players = useApi<any[]>('/admin/players');
  const fixtures = useApi<any[]>('/admin/fixtures');
  const [form, setForm] = useState({
    type: 'PLAYER_OF_THE_SERIES',
    playerId: '',
    matchId: '',
    reason: '',
    locked: false,
  });

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiPost('/admin/awards', {
      ...form,
      matchId: form.matchId || undefined,
    });
    await awards.refetch();
  };

  if (awards.loading || players.loading || fixtures.loading) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Award Management" />
        <form className="form-grid compact" onSubmit={save}>
          <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}>
            {awardTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
          <select value={form.playerId} onChange={(e) => setForm((prev) => ({ ...prev, playerId: e.target.value }))}>
            <option value="">Player</option>
            {players.data?.map((player) => (
              <option key={player.id} value={player.id}>
                {player.displayName}
              </option>
            ))}
          </select>
          <select value={form.matchId} onChange={(e) => setForm((prev) => ({ ...prev, matchId: e.target.value }))}>
            <option value="">Match (for MOM)</option>
            {fixtures.data?.map((fixture) => (
              <option key={fixture.match?.id} value={fixture.match?.id}>
                {fixture.matchNumber}
              </option>
            ))}
          </select>
          <input value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} placeholder="Reason (optional)" />
          <label className="checkbox-row">
            <input type="checkbox" checked={form.locked} onChange={(e) => setForm((prev) => ({ ...prev, locked: e.target.checked }))} />
            Lock award
          </label>
          <button className="button primary" type="submit" disabled={!form.playerId}>
            Save Award
          </button>
        </form>
      </Card>

      <Card>
        <ul className="plain-list">
          {awards.data?.map((award) => (
            <li key={award.id}>
              <div>
                <strong>{award.type.replaceAll('_', ' ')}</strong>
                <span>
                  {award.player.displayName} • {award.reason ?? 'Manual'}
                </span>
              </div>
              <b>{award.locked ? 'Locked' : 'Open'}</b>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
