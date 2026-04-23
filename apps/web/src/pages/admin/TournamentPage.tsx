import { useState } from 'react';
import { apiPost } from '../../api/client';
import { Card, SectionTitle } from '../../components/ui';

const defaultForm = {
  tournament: {
    name: 'Community Premier Cup',
    season: '2026',
    sponsorName: '',
    sponsorLogoUrl: '',
    heroBannerUrl: '',
  },
  settings: {
    format: 'T20',
    oversPerInnings: 20,
    ballType: 'Leather',
    numberOfTeams: 8,
    groupStructure: 'Single Group',
    knockoutStages: 'Semi + Final',
    pointsRuleWin: 2,
    pointsRuleTie: 1,
    pointsRuleNoResult: 1,
    nrrRule: 'Standard',
    tieRule: 'Super Over',
    bonusPointsEnabled: false,
    playerOfSeriesFormula: 'Manual',
    rankingLogic: 'Runs + wickets',
    allowManualPointsOverride: true,
  },
};

export function AdminTournamentPage() {
  const [form, setForm] = useState(defaultForm);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState('saving');
    try {
      await apiPost('/admin/tournament', form);
      setState('saved');
    } catch {
      setState('error');
    }
  };

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Tournament Setup" />
        <form className="form-grid" onSubmit={submit}>
          <label>
            Tournament Name
            <input
              value={form.tournament.name}
              onChange={(e) => setForm((prev) => ({ ...prev, tournament: { ...prev.tournament, name: e.target.value } }))}
            />
          </label>
          <label>
            Season
            <input
              value={form.tournament.season}
              onChange={(e) => setForm((prev) => ({ ...prev, tournament: { ...prev.tournament, season: e.target.value } }))}
            />
          </label>
          <label>
            Sponsor
            <input
              value={form.tournament.sponsorName}
              onChange={(e) => setForm((prev) => ({ ...prev, tournament: { ...prev.tournament, sponsorName: e.target.value } }))}
            />
          </label>
          <label>
            Overs Per Innings
            <input
              type="number"
              value={form.settings.oversPerInnings}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, oversPerInnings: Number(e.target.value) || 20 },
                }))
              }
            />
          </label>
          <label>
            Number Of Teams
            <input
              type="number"
              value={form.settings.numberOfTeams}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, numberOfTeams: Number(e.target.value) || 2 },
                }))
              }
            />
          </label>
          <label>
            Points For Win
            <input
              type="number"
              value={form.settings.pointsRuleWin}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, pointsRuleWin: Number(e.target.value) || 2 },
                }))
              }
            />
          </label>
          <button className="button primary" type="submit" disabled={state === 'saving'}>
            {state === 'saving' ? 'Saving...' : 'Save Tournament'}
          </button>
          <small>{state === 'saved' ? 'Saved successfully.' : state === 'error' ? 'Save failed.' : ''}</small>
        </form>
      </Card>
    </div>
  );
}
