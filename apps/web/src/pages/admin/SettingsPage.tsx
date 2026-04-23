import { useEffect, useState } from 'react';
import { apiPatch, apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

export function AdminSettingsPage() {
  const { data, loading, error, refetch } = useApi<any>('/admin/settings');
  const [form, setForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await apiPatch('/admin/settings', form);
      await refetch();
    } finally {
      setSaving(false);
    }
  };

  const recompute = async () => {
    await apiPost('/admin/recompute', {});
  };

  if (loading) {
    return <LoadingSkeleton rows={8} />;
  }
  if (error || !form) {
    return <Card>Unable to load settings.</Card>;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Rule Engine Settings" />
        <form className="form-grid compact" onSubmit={save}>
          <label>
            Format
            <input value={form.format} onChange={(e) => setForm((prev: any) => ({ ...prev, format: e.target.value }))} />
          </label>
          <label>
            Overs Per Innings
            <input
              type="number"
              value={form.oversPerInnings}
              onChange={(e) => setForm((prev: any) => ({ ...prev, oversPerInnings: Number(e.target.value) || 20 }))}
            />
          </label>
          <label>
            Win Points
            <input
              type="number"
              value={form.pointsRuleWin}
              onChange={(e) => setForm((prev: any) => ({ ...prev, pointsRuleWin: Number(e.target.value) || 2 }))}
            />
          </label>
          <label>
            Tie Points
            <input
              type="number"
              value={form.pointsRuleTie}
              onChange={(e) => setForm((prev: any) => ({ ...prev, pointsRuleTie: Number(e.target.value) || 1 }))}
            />
          </label>
          <label>
            No Result Points
            <input
              type="number"
              value={form.pointsRuleNoResult}
              onChange={(e) => setForm((prev: any) => ({ ...prev, pointsRuleNoResult: Number(e.target.value) || 1 }))}
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={Boolean(form.allowManualPointsOverride)}
              onChange={(e) => setForm((prev: any) => ({ ...prev, allowManualPointsOverride: e.target.checked }))}
            />
            Allow manual points override
          </label>
          <button className="button primary" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button className="button secondary" type="button" onClick={recompute}>
            Recompute Projections
          </button>
        </form>
      </Card>
    </div>
  );
}
