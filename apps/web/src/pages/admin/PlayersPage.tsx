import { useMemo, useState } from 'react';
import { apiDelete, apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

export function AdminPlayersPage() {
  const teams = useApi<any[]>('/admin/teams');
  const players = useApi<any[]>('/admin/players');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const defaultTeam = useMemo(() => teams.data?.[0]?.id ?? '', [teams.data]);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    displayName: '',
    role: 'Batter',
    battingHand: 'Right',
    bowlingType: 'Right-arm medium',
    jerseyNumber: '',
    photoUrl: '',
    teamId: '',
  });

  const [customDisplayName, setCustomDisplayName] = useState(false);

  const handleFirstNameChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      firstName: val,
      displayName: !customDisplayName ? [val, prev.lastName].filter(Boolean).join(' ') : prev.displayName,
    }));
  };

  const handleLastNameChange = (val: string) => {
    setForm((prev) => ({
      ...prev,
      lastName: val,
      displayName: !customDisplayName ? [prev.firstName, val].filter(Boolean).join(' ') : prev.displayName,
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setActionError(null);
    try {
      const computedDisplayName = form.displayName.trim() || [form.firstName, form.lastName].filter(Boolean).join(' ').trim() || 'Player';
      await apiPost('/admin/players', { ...form, displayName: computedDisplayName, teamId: form.teamId || defaultTeam });
      setForm((prev) => ({ ...prev, firstName: '', lastName: '', displayName: '', jerseyNumber: '' }));
      setCustomDisplayName(false);
      await players.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to create player');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setActionError(null);
    try {
      await apiDelete(`/admin/players/${id}`);
      await players.refetch();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to delete player');
    }
  };

  if (teams.loading || players.loading) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Player Management" />
        {actionError ? <p style={{ color: 'var(--danger)', marginBottom: 12 }}>{actionError}</p> : null}
        <form className="form-grid compact" onSubmit={submit}>
          <input placeholder="First name" value={form.firstName} onChange={(e) => handleFirstNameChange(e.target.value)} />
          <input placeholder="Last name" value={form.lastName} onChange={(e) => handleLastNameChange(e.target.value)} />
          <input
            placeholder="Display name"
            value={form.displayName}
            onChange={(e) => {
              setCustomDisplayName(true);
              setForm((prev) => ({ ...prev, displayName: e.target.value }));
            }}
          />
          <select value={form.teamId || defaultTeam} onChange={(e) => setForm((prev) => ({ ...prev, teamId: e.target.value }))}>
            {teams.data?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
            <option>Batter</option>
            <option>Bowler</option>
            <option>All-Rounder</option>
            <option>Wicketkeeper</option>
          </select>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? 'Adding...' : 'Add Player'}
          </button>
        </form>
      </Card>
      <Card>
        <ul className="plain-list">
          {players.data?.map((player) => {
            const displayName = player.displayName || [player.firstName, player.lastName].filter(Boolean).join(' ').trim() || 'Player';
            return (
              <li key={player.id}>
                <div>
                  <strong style={{ fontSize: '15px', color: 'var(--text)' }}>{displayName}</strong>
                  <span style={{ fontSize: '12px', color: 'var(--text-soft)' }}>{player.role}</span>
                </div>
                <button className="button danger" onClick={() => remove(player.id)}>
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
