import { useState } from 'react';
import { apiDelete, apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

const newTeamTemplate = {
  name: '',
  shortName: '',
  logoUrl: '',
  jerseyPrimary: '#22c55e',
  jerseySecondary: '#0ea5e9',
  managerName: '',
};

export function AdminTeamsPage() {
  const { data, loading, error, refetch } = useApi<any[]>('/admin/teams');
  const [form, setForm] = useState(newTeamTemplate);
  const [saving, setSaving] = useState(false);

  const addTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiPost('/admin/teams', form);
      setForm(newTeamTemplate);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const removeTeam = async (teamId: string) => {
    await apiDelete(`/admin/teams/${teamId}`);
    await refetch();
  };

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Team Management" />
        <form className="form-grid compact" onSubmit={addTeam}>
          <input placeholder="Team name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input placeholder="Short name" value={form.shortName} onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} />
          <input placeholder="Manager" value={form.managerName} onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))} />
          <button className="button primary" type="submit" disabled={saving || !form.name || !form.shortName}>
            {saving ? 'Adding...' : 'Add Team'}
          </button>
        </form>
      </Card>

      {loading ? <LoadingSkeleton rows={6} /> : null}
      {error ? <Card>Unable to load teams.</Card> : null}
      <Card>
        <ul className="plain-list">
          {data?.map((team) => (
            <li key={team.id}>
              <div>
                <strong>{team.name}</strong>
                <span>
                  {team.shortName} • {team.managerName ?? 'No manager'}
                </span>
              </div>
              <button className="button danger" onClick={() => removeTeam(team.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
