import { useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import type { MatchCard } from '@cric/types';
import { useApi } from '../../hooks/useApi';
import { useSse } from '../../hooks/useSse';
import { Card, EmptyState, LoadingSkeleton, PillTabs, StatusBadge, TeamBadge } from '../../components/ui';

type CommentaryItem = {
  id: string;
  sequence: number;
  commentary?: string | null;
  runsOffBat: number;
  extrasRuns: number;
  wicket: boolean;
  striker: { id?: string; displayName: string };
  bowler: { id?: string; displayName: string };
};

type SquadItem = {
  id: string;
  teamId: string;
  isPlayingXI: boolean;
  player: {
    id: string;
    displayName: string;
    role: string;
    jerseyNumber?: number | null;
  };
};

type MatchDetailResponse = MatchCard & {
  resultSummary?: string | null;
  momPlayer?: {
    id: string;
    displayName: string;
  } | null;
};

const tabs = ['Scorecard', 'Overview', 'Stats', 'Squads', 'Commentary'];

function formatScore(score?: MatchCard['teamAScore']) {
  if (!score) return '-';
  return `${score.runs}/${score.wickets} (${score.overs})`;
}

export function PublicMatchCenterPage() {
  const { matchId } = useParams();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<string>(
    initialTab && tabs.includes(initialTab) ? initialTab : 'Scorecard'
  );
  const [selectedInningFilter, setSelectedInningFilter] = useState<'all' | '1' | '2'>('all');

  const overview = useApi<MatchDetailResponse>(`/public/matches/${matchId}/overview`);
  const scorecard = useApi<any>(`/public/matches/${matchId}/scorecard`);
  const commentary = useApi<CommentaryItem[]>(`/public/matches/${matchId}/commentary`);
  const squads = useApi<SquadItem[]>(`/public/matches/${matchId}/squads`);
  const stats = useApi<any>(`/public/matches/${matchId}/stats`);

  const refetchAll = useCallback(() => {
    void Promise.all([
      overview.refetch(),
      scorecard.refetch(),
      commentary.refetch(),
      squads.refetch(),
      stats.refetch(),
    ]);
  }, [overview.refetch, scorecard.refetch, commentary.refetch, squads.refetch, stats.refetch]);

  useSse<{ data: unknown }>(matchId ? `/events/matches/${matchId}` : null, refetchAll);

  const loading = overview.loading || scorecard.loading;

  const matchData = overview.data;

  // Resolve team scores
  let teamAScore = matchData?.teamAScore;
  let teamBScore = matchData?.teamBScore;
  if (!teamAScore && !teamBScore && matchData?.score) {
    if (matchData.currentBattingTeamId === matchData.teamB.id) {
      teamBScore = matchData.score;
    } else {
      teamAScore = matchData.score;
    }
  }

  // Determine winner name
  const winnerName =
    matchData?.winnerTeamId === matchData?.teamA.id
      ? matchData?.teamA.name
      : matchData?.winnerTeamId === matchData?.teamB.id
        ? matchData?.teamB.name
        : null;

  const inningsList = useMemo(() => {
    if (!scorecard.data) return [];
    const list = [];
    if (scorecard.data.innings1) list.push(scorecard.data.innings1);
    if (scorecard.data.innings2) list.push(scorecard.data.innings2);
    return list;
  }, [scorecard.data]);

  // Head to Head Stats Computation
  const computedStats = useMemo(() => {
    if (!inningsList.length) return null;
    const inn1 = inningsList[0];
    const inn2 = inningsList[1] ?? null;

    const calcBoundaries = (battingList: any[] = []) => {
      let fours = 0;
      let sixes = 0;
      for (const b of battingList) {
        fours += b.fours || 0;
        sixes += b.sixes || 0;
      }
      const boundaryRuns = fours * 4 + sixes * 6;
      return { fours, sixes, boundaryRuns };
    };

    const inn1Boundaries = calcBoundaries(inn1?.batting);
    const inn2Boundaries = calcBoundaries(inn2?.batting);

    // Top performers
    const allBatters: Array<{ name: string; runs: number; balls: number; team: string }> = [];
    const allBowlers: Array<{ name: string; wickets: number; runs: number; overs: string; team: string }> = [];

    if (inn1) {
      inn1.batting?.forEach((b: any) =>
        allBatters.push({ name: b.name, runs: b.runs, balls: b.balls, team: inn1.battingTeam })
      );
      inn1.bowling?.forEach((bw: any) =>
        allBowlers.push({ name: bw.name, wickets: bw.wickets, runs: bw.runs, overs: bw.overs, team: inn1.bowlingTeam })
      );
    }
    if (inn2) {
      inn2.batting?.forEach((b: any) =>
        allBatters.push({ name: b.name, runs: b.runs, balls: b.balls, team: inn2.battingTeam })
      );
      inn2.bowling?.forEach((bw: any) =>
        allBowlers.push({ name: bw.name, wickets: bw.wickets, runs: bw.runs, overs: bw.overs, team: inn2.bowlingTeam })
      );
    }

    allBatters.sort((a, b) => b.runs - a.runs);
    allBowlers.sort((a, b) => b.wickets - a.wickets || a.runs - b.runs);

    return {
      inn1,
      inn2,
      inn1Boundaries,
      inn2Boundaries,
      topBatters: allBatters.slice(0, 5),
      topBowlers: allBowlers.slice(0, 5),
    };
  }, [inningsList]);

  // Squads grouped by Team
  const groupedSquads = useMemo(() => {
    if (!squads.data || !matchData) return { teamA: [], teamB: [] };
    const teamA = squads.data.filter((s) => s.teamId === matchData.teamA.id);
    const teamB = squads.data.filter((s) => s.teamId === matchData.teamB.id);
    return { teamA, teamB };
  }, [squads.data, matchData]);

  if (loading && !matchData) {
    return (
      <div className="page-grid">
        <LoadingSkeleton rows={8} />
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="page-grid">
        <EmptyState title="Match unavailable" body="The selected match could not be loaded." />
      </div>
    );
  }

  return (
    <div className="page-grid">
      {/* Breadcrumb / Back link */}
      <div>
        <Link
          to="/public/results"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-soft)',
            fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <span>←</span>
          <span>Back to Match Results & Fixtures</span>
        </Link>
      </div>

      {/* Match Hero Banner */}
      <div className="match-hero-card">
        <div className="match-hero-top">
          <div className="match-hero-meta">
            <span className="match-number-badge">{matchData.matchNumber}</span>
            <span>•</span>
            <span>{matchData.stage}</span>
            <span>•</span>
            <span>{matchData.venue}</span>
          </div>
          <StatusBadge status={matchData.status} />
        </div>

        {/* Desktop 3-Column View (> 768px) */}
        <div className="match-hero-teams is-desktop-hero">
          <div className="match-hero-team">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <TeamBadge team={matchData.teamA} size="lg" />
              <span className="match-hero-team-name">{matchData.teamA.name}</span>
            </div>
            <span className={`match-hero-score ${matchData.winnerTeamId === matchData.teamA.id ? 'is-winner' : ''}`}>
              {formatScore(teamAScore)}
            </span>
          </div>

          <div className="match-hero-center">
            <span className="match-hero-status">
              {matchData.resultSummary || matchData.statusText || 'Match Result'}
            </span>
            <span className="match-hero-date">
              {new Date(matchData.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>

          <div className="match-hero-team is-away">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row-reverse' }}>
              <TeamBadge team={matchData.teamB} size="lg" />
              <span className="match-hero-team-name">{matchData.teamB.name}</span>
            </div>
            <span className={`match-hero-score ${matchData.winnerTeamId === matchData.teamB.id ? 'is-winner' : ''}`}>
              {formatScore(teamBScore)}
            </span>
          </div>
        </div>

        {/* Mobile / Tablet Compact Scoreboard View (<= 768px) */}
        <div className="match-hero-scoreboard is-mobile-hero">
          <div className={`scoreboard-row ${matchData.winnerTeamId === matchData.teamA.id ? 'is-winner-row' : ''}`}>
            <div className="scoreboard-team-info">
              <TeamBadge team={matchData.teamA} size="sm" />
              <span className="scoreboard-team-name">{matchData.teamA.name}</span>
            </div>
            <div className="scoreboard-score-info">
              <span className={`scoreboard-score ${matchData.winnerTeamId === matchData.teamA.id ? 'is-winner' : ''}`}>
                {formatScore(teamAScore)}
              </span>
              {matchData.winnerTeamId === matchData.teamA.id && <span className="winner-star">★</span>}
            </div>
          </div>

          <div className={`scoreboard-row ${matchData.winnerTeamId === matchData.teamB.id ? 'is-winner-row' : ''}`}>
            <div className="scoreboard-team-info">
              <TeamBadge team={matchData.teamB} size="sm" />
              <span className="scoreboard-team-name">{matchData.teamB.name}</span>
            </div>
            <div className="scoreboard-score-info">
              <span className={`scoreboard-score ${matchData.winnerTeamId === matchData.teamB.id ? 'is-winner' : ''}`}>
                {formatScore(teamBScore)}
              </span>
              {matchData.winnerTeamId === matchData.teamB.id && <span className="winner-star">★</span>}
            </div>
          </div>

          <div className="scoreboard-footer">
            <span className="scoreboard-status-text">
              {matchData.resultSummary || matchData.statusText || 'Match Result'}
            </span>
            <span className="scoreboard-date-text">
              {new Date(matchData.startsAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
          </div>
        </div>

        {/* Man of the Match Highlight Ribbon */}
        {matchData.momPlayer ? (
          <div className="match-mom-banner">
            <span className="mom-trophy">🏆</span>
            <span>
              Player of the Match: <strong>{matchData.momPlayer.displayName}</strong>
            </span>
          </div>
        ) : null}

        {/* Navigation Tabs */}
        <PillTabs tabs={tabs} active={activeTab} onSelect={setActiveTab} />
      </div>

      {/* TAB CONTENT */}

      {/* 1. SCORECARD TAB */}
      {activeTab === 'Scorecard' && (
        <div>
          {inningsList.length > 1 && (
            <div className="innings-filter-bar">
              <button
                type="button"
                className={`innings-filter-btn ${selectedInningFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedInningFilter('all')}
              >
                All Innings
              </button>
              {inningsList.map((inn: any) => {
                const shortLabel =
                  matchData.teamA.name === inn.battingTeam
                    ? matchData.teamA.shortName
                    : matchData.teamB.name === inn.battingTeam
                      ? matchData.teamB.shortName
                      : inn.battingTeam;
                return (
                  <button
                    key={inn.inningsNumber}
                    type="button"
                    className={`innings-filter-btn ${selectedInningFilter === String(inn.inningsNumber) ? 'active' : ''}`}
                    onClick={() => setSelectedInningFilter(String(inn.inningsNumber) as '1' | '2')}
                  >
                    {shortLabel} (Inn {inn.inningsNumber})
                  </button>
                );
              })}
            </div>
          )}

          {inningsList.length === 0 ? (
            <Card>
              <EmptyState title="No Scorecard Data" body="The scorecard for this match is not yet recorded." />
            </Card>
          ) : (
            inningsList
              .filter(
                (inn: any) =>
                  selectedInningFilter === 'all' || selectedInningFilter === String(inn.inningsNumber)
              )
              .map((inn: any) => (
                <div key={inn.inningsNumber} className="scorecard-inning-card">
                  <div className="scorecard-inning-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <TeamBadge
                        team={
                          inn.battingTeam === matchData.teamA.name
                            ? matchData.teamA
                            : inn.battingTeam === matchData.teamB.name
                              ? matchData.teamB
                              : null
                        }
                        name={inn.battingTeam}
                        size="md"
                      />
                      <div>
                        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{inn.battingTeam}</h3>
                        <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                          Innings {inn.inningsNumber} • Bowled by {inn.bowlingTeam}
                        </span>
                      </div>
                    </div>
                    <div className="scorecard-header-score">
                      <strong>
                        {inn.totalRuns}/{inn.wickets}
                      </strong>
                      <span style={{ fontSize: 13, color: 'var(--text-soft)', marginLeft: 8, fontWeight: 500 }}>
                        ({inn.overs} Ov, RR {inn.runRate})
                      </span>
                    </div>
                  </div>

                  {/* Batting Figures */}
                  <div className="scorecard-table-wrap">
                    <table className="scorecard-table">
                      <thead>
                        <tr>
                          <th>Batter</th>
                          <th className="numeric">R</th>
                          <th className="numeric">B</th>
                          <th className="numeric">4s</th>
                          <th className="numeric">6s</th>
                          <th className="numeric">SR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inn.batting && inn.batting.length > 0 ? (
                          inn.batting.map((b: any, idx: number) => {
                            const sr = b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(1) : '0.0';
                            return (
                              <tr key={idx}>
                                <td className="strong">
                                  {b.playerId ? (
                                    <Link to={`/public/players/${b.playerId}`} className="player-link">
                                      {b.name}
                                    </Link>
                                  ) : (
                                    b.name
                                  )}
                                </td>
                                <td className="numeric strong">{b.runs}</td>
                                <td className="numeric">{b.balls}</td>
                                <td className="numeric">{b.fours}</td>
                                <td className="numeric">{b.sixes}</td>
                                <td className="numeric">{sr}</td>
                              </tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-soft)' }}>
                              No batting events recorded.
                            </td>
                          </tr>
                        )}
                        <tr className="total-row">
                          <td>Extras: {inn.extras ?? 0}</td>
                          <td colSpan={5} className="numeric">
                            Total: <strong>{inn.totalRuns}/{inn.wickets}</strong> ({inn.overs} Ov)
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Fall of Wickets */}
                  {inn.fallOfWickets && inn.fallOfWickets.length > 0 && (
                    <div className="fow-container">
                      <strong>Fall of Wickets:</strong>
                      <div className="fow-chips">
                        {inn.fallOfWickets.map((fow: any, fIdx: number) => (
                          <span key={fIdx} className="fow-chip">
                            {fow.score} ({fow.player}, {fow.over} ov)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bowling Figures */}
                  <div className="scorecard-table-wrap">
                    <table className="scorecard-table">
                      <thead>
                        <tr>
                          <th>Bowler</th>
                          <th className="numeric">O</th>
                          <th className="numeric">R</th>
                          <th className="numeric">W</th>
                          <th className="numeric">Econ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inn.bowling && inn.bowling.length > 0 ? (
                          inn.bowling.map((bw: any, idx: number) => (
                            <tr key={idx}>
                              <td className="strong">
                                {bw.playerId ? (
                                  <Link to={`/public/players/${bw.playerId}`} className="player-link">
                                    {bw.name}
                                  </Link>
                                ) : (
                                  bw.name
                                )}
                              </td>
                              <td className="numeric">{bw.overs}</td>
                              <td className="numeric">{bw.runs}</td>
                              <td className="numeric strong">{bw.wickets}</td>
                              <td className="numeric">{bw.economy?.toFixed(2) ?? '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-soft)' }}>
                              No bowling events recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* 2. OVERVIEW TAB */}
      {activeTab === 'Overview' && (
        <div className="split-grid">
          <Card>
            <h3 style={{ marginTop: 0 }}>Match Summary</h3>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--accent)' }}>
              {matchData.resultSummary || matchData.statusText}
            </p>
            {winnerName && (
              <p>
                Winner: <strong>{winnerName}</strong>
              </p>
            )}
            <p>
              Toss: <strong>{matchData.tossText || 'Toss not recorded'}</strong>
            </p>
            {matchData.momPlayer && (
              <p>
                Player of the Match:{' '}
                <Link to={`/public/players/${matchData.momPlayer.id}`} className="player-link">
                  <strong>{matchData.momPlayer.displayName}</strong>
                </Link>
              </p>
            )}
            <small style={{ color: 'var(--text-soft)' }}>
              Last updated: {matchData.lastUpdatedAt ? new Date(matchData.lastUpdatedAt).toLocaleString() : '-'}
            </small>
          </Card>

          <Card>
            <h3 style={{ marginTop: 0 }}>Match Information</h3>
            <p>
              <strong>Match:</strong> {matchData.matchNumber} ({matchData.stage})
            </p>
            <p>
              <strong>Venue:</strong> {matchData.venue}
            </p>
            <p>
              <strong>Date & Time:</strong> {new Date(matchData.startsAt).toLocaleString()}
            </p>
            <p>
              <strong>Teams:</strong> {matchData.teamA.name} vs {matchData.teamB.name}
            </p>
          </Card>
        </div>
      )}

      {/* 3. STATS TAB */}
      {activeTab === 'Stats' && (
        <div className="page-grid">
          {computedStats && computedStats.inn1 && computedStats.inn2 ? (
            <Card>
              <h3 style={{ marginTop: 0, marginBottom: 16 }}>Head to Head Match Comparison</h3>
              <div className="scorecard-table-wrap">
                <table className="comparison-table">
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left' }}>Metric</th>
                      <th style={{ textAlign: 'center' }}>{computedStats.inn1.battingTeam}</th>
                      <th style={{ textAlign: 'center' }}>{computedStats.inn2.battingTeam}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Total Runs / Wickets</td>
                      <td>
                        {computedStats.inn1.totalRuns}/{computedStats.inn1.wickets}
                      </td>
                      <td>
                        {computedStats.inn2.totalRuns}/{computedStats.inn2.wickets}
                      </td>
                    </tr>
                    <tr>
                      <td>Overs Bowled</td>
                      <td>{computedStats.inn1.overs}</td>
                      <td>{computedStats.inn2.overs}</td>
                    </tr>
                    <tr>
                      <td>Run Rate</td>
                      <td>{computedStats.inn1.runRate}</td>
                      <td>{computedStats.inn2.runRate}</td>
                    </tr>
                    <tr>
                      <td>Fours (4s)</td>
                      <td>{computedStats.inn1Boundaries.fours}</td>
                      <td>{computedStats.inn2Boundaries.fours}</td>
                    </tr>
                    <tr>
                      <td>Sixes (6s)</td>
                      <td>{computedStats.inn1Boundaries.sixes}</td>
                      <td>{computedStats.inn2Boundaries.sixes}</td>
                    </tr>
                    <tr>
                      <td>Boundary Runs</td>
                      <td>{computedStats.inn1Boundaries.boundaryRuns}</td>
                      <td>{computedStats.inn2Boundaries.boundaryRuns}</td>
                    </tr>
                    <tr>
                      <td>Extras Conceded</td>
                      <td>{computedStats.inn1.extras ?? 0}</td>
                      <td>{computedStats.inn2.extras ?? 0}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}

          {computedStats && (computedStats.topBatters.length > 0 || computedStats.topBowlers.length > 0) ? (
            <div className="split-grid">
              <Card>
                <h3 style={{ marginTop: 0 }}>Top Batters</h3>
                <div className="scorecard-table-wrap">
                  <table className="scorecard-table">
                    <thead>
                      <tr>
                        <th>Batter</th>
                        <th>Team</th>
                        <th className="numeric">Runs</th>
                        <th className="numeric">Balls</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedStats.topBatters.map((b, i) => (
                        <tr key={i}>
                          <td className="strong">{b.name}</td>
                          <td style={{ color: 'var(--text-soft)', fontSize: 12 }}>{b.team}</td>
                          <td className="numeric strong">{b.runs}</td>
                          <td className="numeric">{b.balls}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              <Card>
                <h3 style={{ marginTop: 0 }}>Top Bowlers</h3>
                <div className="scorecard-table-wrap">
                  <table className="scorecard-table">
                    <thead>
                      <tr>
                        <th>Bowler</th>
                        <th>Team</th>
                        <th className="numeric">Wickets</th>
                        <th className="numeric">Runs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {computedStats.topBowlers.map((bw, i) => (
                        <tr key={i}>
                          <td className="strong">{bw.name}</td>
                          <td style={{ color: 'var(--text-soft)', fontSize: 12 }}>{bw.team}</td>
                          <td className="numeric strong">{bw.wickets}</td>
                          <td className="numeric">{bw.runs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : (
            <Card>
              <EmptyState title="No Stats Yet" body="Match statistics will be available once the match progresses." />
            </Card>
          )}
        </div>
      )}

      {/* 4. SQUADS TAB */}
      {activeTab === 'Squads' && (
        <div className="squad-two-col">
          <Card>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <TeamBadge team={matchData.teamA} size="sm" />
              <span>{matchData.teamA.name}</span>
            </h3>
            {groupedSquads.teamA.length > 0 ? (
              <ul className="plain-list">
                {groupedSquads.teamA.map((row) => (
                  <li key={row.id}>
                    <div>
                      <Link to={`/public/players/${row.player.id}`} className="player-link">
                        <strong>{row.player.displayName}</strong>
                      </Link>
                      <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        {row.player.role}
                        {row.player.jerseyNumber ? ` • #${row.player.jerseyNumber}` : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-soft)' }}>Squad not announced.</p>
            )}
          </Card>

          <Card>
            <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
              <TeamBadge team={matchData.teamB} size="sm" />
              <span>{matchData.teamB.name}</span>
            </h3>
            {groupedSquads.teamB.length > 0 ? (
              <ul className="plain-list">
                {groupedSquads.teamB.map((row) => (
                  <li key={row.id}>
                    <div>
                      <Link to={`/public/players/${row.player.id}`} className="player-link">
                        <strong>{row.player.displayName}</strong>
                      </Link>
                      <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>
                        {row.player.role}
                        {row.player.jerseyNumber ? ` • #${row.player.jerseyNumber}` : ''}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: 'var(--text-soft)' }}>Squad not announced.</p>
            )}
          </Card>
        </div>
      )}

      {/* 5. COMMENTARY TAB */}
      {activeTab === 'Commentary' && (
        <Card>
          <h3 style={{ marginTop: 0, marginBottom: 16 }}>Ball by Ball Commentary</h3>
          {commentary.data && commentary.data.length > 0 ? (
            <div className="commentary-list">
              {commentary.data.map((item) => (
                <article key={item.id}>
                  <strong>
                    {item.striker?.id ? (
                      <Link to={`/public/players/${item.striker.id}`} className="player-link">
                        {item.striker.displayName}
                      </Link>
                    ) : (
                      item.striker?.displayName
                    )}
                    {' vs '}
                    {item.bowler?.id ? (
                      <Link to={`/public/players/${item.bowler.id}`} className="player-link">
                        {item.bowler.displayName}
                      </Link>
                    ) : (
                      item.bowler?.displayName
                    )}
                  </strong>
                  <p>
                    {item.runsOffBat + item.extrasRuns} run(s)
                    {item.wicket ? ' • WICKET' : ''}
                  </p>
                  <small>{item.commentary ?? 'No scorer note'}</small>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No commentary" body="Commentary will appear here as balls are bowled." />
          )}
        </Card>
      )}
    </div>
  );
}
