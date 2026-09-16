import { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../../api/client';
import { useTournament } from '../../context/TournamentContext';
import { Card, SectionTitle } from '../../components/ui';

export function PublicSearchPage() {
  const { selectedTournamentId } = useTournament();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const onSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const tParam = selectedTournamentId ? `&tournamentId=${encodeURIComponent(selectedTournamentId)}` : '';
      const data = await apiGet<any>(`/public/search?q=${encodeURIComponent(query)}${tParam}`);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Search" />
        <form className="search-form" onSubmit={onSearch}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search team, player, match number" />
          <button className="button primary" type="submit" disabled={!query.trim() || loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </Card>

      {results ? (
        <div className="split-grid">
          <Card>
            <h3>Teams</h3>
            <ul className="plain-list">
              {results.teams.map((team: any) => (
                <li key={team.id}>
                  <Link to={`/public/teams/${team.id}`}>{team.name}</Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3>Players</h3>
            <ul className="plain-list">
              {results.players.map((player: any) => (
                <li key={player.id}>
                  <Link to={`/public/players/${player.id}`}>{player.displayName}</Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <h3>Matches</h3>
            <ul className="plain-list">
              {results.matches.map((match: any) => (
                <li key={match.id}>
                  <Link to={`/public/matches/${match.id}`}>{match.matchNumber}</Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
