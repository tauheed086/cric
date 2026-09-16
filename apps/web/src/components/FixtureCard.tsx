import { Link, useNavigate } from 'react-router-dom';
import type { MatchCard } from '@cric/types';
import { Card, StatusBadge, TeamBadge } from './ui';

function scoreLabel(score: MatchCard['teamAScore']) {
  if (!score) {
    return '-';
  }
  return `${score.runs}/${score.wickets} (${score.overs})`;
}

export function FixtureCard({ match }: { match: MatchCard }) {
  const navigate = useNavigate();
  let resolvedTeamAScore = match.teamAScore ?? null;
  let resolvedTeamBScore = match.teamBScore ?? null;

  if (!resolvedTeamAScore && !resolvedTeamBScore && match.score) {
    if (match.currentBattingTeamId === match.teamB.id) {
      resolvedTeamBScore = match.score;
    } else {
      resolvedTeamAScore = match.score;
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

  const handleCardClick = () => {
    navigate(`/public/matches/${match.id}`);
  };

  return (
    <Card
      className="fixture-card is-clickable"
      onClick={handleCardClick}
      role="link"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <TeamBadge team={match.teamA} size="md" />
            <strong>{match.teamA.shortName}</strong>
          </div>
          <span className={`fixture-team-score ${isTeamAScoreEmpty ? 'is-empty' : ''}`.trim()}>{teamAScore}</span>
        </div>
        <div className="fixture-center">
          {winnerShortName ? <span className="fixture-winner">Winner: {winnerShortName}</span> : null}
          <span className="fixture-versus">vs</span>
        </div>
        <div className="fixture-team is-away">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexDirection: 'row-reverse' }}>
            <TeamBadge team={match.teamB} size="md" />
            <strong>{match.teamB.shortName}</strong>
          </div>
          <span className={`fixture-team-score ${isTeamBScoreEmpty ? 'is-empty' : ''}`.trim()}>{teamBScore}</span>
        </div>
      </div>
      <div className="fixture-foot">
        <small>{match.statusText ?? 'Awaiting update'}</small>
        <Link
          to={`/public/matches/${match.id}`}
          className="fixture-link-cta"
          onClick={(e) => e.stopPropagation()}
        >
          View Full Scorecard & Stats →
        </Link>
      </div>
    </Card>
  );
}
