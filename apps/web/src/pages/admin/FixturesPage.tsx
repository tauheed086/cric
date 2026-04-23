import { Link } from 'react-router-dom';
import { useState } from 'react';
import { apiDelete, apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';

const stages = ['LEAGUE', 'QUALIFIER', 'SEMI_FINAL', 'FINAL'];

export function AdminFixturesPage() {
  const teams = useApi<any[]>('/admin/teams');
  const venues = useApi<any[]>('/admin/venues');
  const fixtures = useApi<any[]>('/admin/fixtures');
  const [fixtureForm, setFixtureForm] = useState({
    matchNumber: '',
    stage: 'LEAGUE',
    teamAId: '',
    teamBId: '',
    venueId: '',
    startsAt: '',
  });
  const [venueForm, setVenueForm] = useState({ name: '', city: '', address: '' });

  const addVenue = async (event: React.FormEvent) => {
    event.preventDefault();
    await apiPost('/admin/venues', venueForm);
    setVenueForm({ name: '', city: '', address: '' });
    await venues.refetch();
  };

  const addFixture = async (event: React.FormEvent) => {
    event.preventDefault();
    const teamAId = fixtureForm.teamAId || teams.data?.[0]?.id;
    const teamBId = fixtureForm.teamBId || teams.data?.[1]?.id;
    const venueId = fixtureForm.venueId || venues.data?.[0]?.id;
    if (!teamAId || !teamBId || !venueId || !fixtureForm.matchNumber || !fixtureForm.startsAt) {
      return;
    }
    await apiPost('/admin/fixtures', { ...fixtureForm, teamAId, teamBId, venueId });
    setFixtureForm((prev) => ({ ...prev, matchNumber: '', startsAt: '' }));
    await fixtures.refetch();
  };

  const removeFixture = async (id: string) => {
    await apiDelete(`/admin/fixtures/${id}`);
    await fixtures.refetch();
  };

  if (teams.loading || venues.loading || fixtures.loading) {
    return <LoadingSkeleton rows={8} />;
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Venue Management" />
        <form className="form-grid compact" onSubmit={addVenue}>
          <input placeholder="Venue name" value={venueForm.name} onChange={(e) => setVenueForm((f) => ({ ...f, name: e.target.value }))} />
          <input placeholder="City" value={venueForm.city} onChange={(e) => setVenueForm((f) => ({ ...f, city: e.target.value }))} />
          <input placeholder="Address" value={venueForm.address} onChange={(e) => setVenueForm((f) => ({ ...f, address: e.target.value }))} />
          <button className="button secondary" type="submit" disabled={!venueForm.name}>
            Add Venue
          </button>
        </form>
      </Card>

      <Card>
        <SectionTitle title="Fixture Management" />
        <form className="form-grid compact" onSubmit={addFixture}>
          <input
            placeholder="Match number"
            value={fixtureForm.matchNumber}
            onChange={(e) => setFixtureForm((f) => ({ ...f, matchNumber: e.target.value }))}
          />
          <select value={fixtureForm.stage} onChange={(e) => setFixtureForm((f) => ({ ...f, stage: e.target.value }))}>
            {stages.map((stage) => (
              <option key={stage}>{stage}</option>
            ))}
          </select>
          <select value={fixtureForm.teamAId} onChange={(e) => setFixtureForm((f) => ({ ...f, teamAId: e.target.value }))}>
            <option value="">Team A</option>
            {teams.data?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select value={fixtureForm.teamBId} onChange={(e) => setFixtureForm((f) => ({ ...f, teamBId: e.target.value }))}>
            <option value="">Team B</option>
            {teams.data?.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select value={fixtureForm.venueId} onChange={(e) => setFixtureForm((f) => ({ ...f, venueId: e.target.value }))}>
            <option value="">Venue</option>
            {venues.data?.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name}
              </option>
            ))}
          </select>
          <input type="datetime-local" value={fixtureForm.startsAt} onChange={(e) => setFixtureForm((f) => ({ ...f, startsAt: e.target.value }))} />
          <button className="button primary" type="submit">
            Create Fixture
          </button>
        </form>
      </Card>

      <Card>
        <ul className="plain-list">
          {fixtures.data?.map((item) => (
            <li key={item.id}>
              <div>
                <strong>{item.matchNumber}</strong>
                <span>
                  {item.teamA.name} vs {item.teamB.name} • {new Date(item.startsAt).toLocaleString()}
                </span>
              </div>
              <div className="inline-actions">
                <Link className="button secondary" to={`/admin/scoring/${item.match?.id}`}>
                  Score
                </Link>
                <button className="button danger" onClick={() => removeFixture(item.id)}>
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
