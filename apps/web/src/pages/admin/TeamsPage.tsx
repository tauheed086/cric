import { useState } from 'react';
import { apiDelete, apiPatch, apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle, TeamBadge } from '../../components/ui';
import { ImageUpload } from '../../components/ImageUpload';

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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const startEdit = (team: any) => {
    setEditingId(team.id);
    setForm({
      name: team.name || '',
      shortName: team.shortName || '',
      logoUrl: team.logoUrl || '',
      jerseyPrimary: team.jerseyPrimary || '#22c55e',
      jerseySecondary: team.jerseySecondary || '#0ea5e9',
      managerName: team.managerName || '',
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(newTeamTemplate);
  };

  const saveTeam = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiPatch(`/admin/teams/${editingId}`, form);
      } else {
        await apiPost('/admin/teams', form);
      }
      setForm(newTeamTemplate);
      setEditingId(null);
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
        <SectionTitle title={editingId ? 'Edit Team' : 'Team Management'} />
        <form className="form-grid compact" onSubmit={saveTeam}>
          <input placeholder="Team name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <input placeholder="Short name" value={form.shortName} onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} />
          <input placeholder="Manager name (optional)" value={form.managerName} onChange={(e) => setForm((f) => ({ ...f, managerName: e.target.value }))} />
          <ImageUpload
            value={form.logoUrl}
            onChange={(base64) => setForm((f) => ({ ...f, logoUrl: base64 }))}
            label="Upload Team Logo (Stored in DB)"
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="button primary" type="submit" disabled={saving || !form.name || !form.shortName}>
              {saving ? 'Saving...' : editingId ? 'Update Team' : 'Add Team'}
            </button>
            {editingId && (
              <button className="button secondary" type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </Card>

      {loading ? <LoadingSkeleton rows={6} /> : null}
      {error ? <Card>Unable to load teams.</Card> : null}
      <Card>
        <ul className="plain-list">
          {data?.map((team) => (
            <li key={team.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <TeamBadge team={team} size="md" />
                <div>
                  <strong>{team.name}</strong>
                  <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
                    {team.shortName} • {team.managerName ?? 'No manager'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="button secondary" onClick={() => startEdit(team)}>
                  Edit
                </button>
                <button className="button danger" onClick={() => removeTeam(team.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
