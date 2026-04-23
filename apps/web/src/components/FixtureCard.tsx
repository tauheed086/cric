import { Link } from 'react-router-dom';
import type { MatchCard } from '@cric/types';
import { Card, StatusBadge } from './ui';

function scoreLabel(score: MatchCard['teamAScore']) {
  if (!score) {
    return '-';
  }
  return `${score.runs}/${score.wickets} (${score.overs})`;
}

export function FixtureCard({ match }: { match: MatchCard }) {
  let resolvedTeamAScore = match.teamAScore ?? null;
  let resolvedTeamBScore = match.teamBScore ?? null;

  if (!resolvedTeamAScore && !resolvedTeamBScore && match.score && match.currentBattingTeamId) {
    if (match.currentBattingTeamId === match.teamA.id) {
      resolvedTeamAScore = match.score;
    } else if (match.currentBattingTeamId === match.teamB.id) {
      resolvedTeamBScore = match.score;
    }
  }

  const teamAScore = scoreLabel(resolvedTeamAScore);
  const teamBScore = scoreLabel(resolvedTeamBScore);
  const isTeamAScoreEmpty = !resolvedTeamAScore;
  const isTeamBScoreEmpty = !resolvedTeamBScore;
  const winnerShortName =
    match.winnerTeamId === match.teamA.id
      ? match.teamA.shortName
      : match.winnerTeamId === match.teamB.id
        ? match.teamB.shortName
        : null;

  return (
    <Card className="fixture-card">
      <div className="fixture-head">
        <div>
          <h3>{match.matchNumber}</h3>
          <p>
            {new Date(match.startsAt).toLocaleString()} • {match.venue}
          </p>
        </div>
        <StatusBadge status={match.status} />
      </div>
      <div className="fixture-teams">
        <div className="fixture-team">
          <strong>{match.teamA.shortName}</strong>
          <span className={`fixture-team-score ${isTeamAScoreEmpty ? 'is-empty' : ''}`.trim()}>{teamAScore}</span>
        </div>
        <div className="fixture-center">
          {winnerShortName ? <span className="fixture-winner">Winner: {winnerShortName}</span> : null}
          <span className="fixture-versus">vs</span>
        </div>
        <div className="fixture-team is-away">
          <strong>{match.teamB.shortName}</strong>
          <span className={`fixture-team-score ${isTeamBScoreEmpty ? 'is-empty' : ''}`.trim()}>{teamBScore}</span>
        </div>
      </div>
      <div className="fixture-foot">
        <small>{match.statusText ?? 'Awaiting update'}</small>
        <Link to={`/public/matches/${match.id}`}>Open Match</Link>
      </div>
    </Card>
  );
}
