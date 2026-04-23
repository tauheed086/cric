import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useSse } from '../../hooks/useSse';
import { Card, LoadingSkeleton, SectionTitle, StatusBadge } from '../../components/ui';

const runButtons = [0, 1, 2, 3, 4, 6] as const;
const extrasButtons = ['WIDE', 'NO_BALL', 'BYE', 'LEG_BYE'] as const;
const extrasChipShortLabel: Record<(typeof extrasButtons)[number], string> = {
  WIDE: 'Wd',
  NO_BALL: 'Nb',
  BYE: 'B',
  LEG_BYE: 'Lb',
};

type MatchBallEvent = {
  id: string;
  inningsId: string;
  sequence: number;
  ballInOver: number;
  runsOffBat: number;
  extrasRuns: number;
  extrasType: (typeof extrasButtons)[number] | null;
  wicket: boolean;
  isValidDelivery: boolean;
  strikerId: string;
  bowlerId: string;
};

type OverBallChip = {
  id: string;
  label: string;
  tone: 'default' | 'wicket' | 'extra';
};

type OverSummary = {
  overNumber: number;
  balls: OverBallChip[];
  isCurrent: boolean;
};

type MatchInningsRow = {
  id: string;
  inningsNumber: 1 | 2;
  battingTeamId: string;
  bowlingTeamId: string;
  totalRuns: number;
  wickets: number;
  balls: number;
  runRate: number;
};

type BatterFigure = {
  runs: number;
  balls: number;
  isOut: boolean;
  fours: number;
  sixes: number;
};

type BowlerFigure = {
  runs: number;
  wickets: number;
  balls: number;
  maidens: number;
};

function formatOversFromBalls(balls: number): string {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

function inningsLabel(inningsNumber: 1 | 2): string {
  return inningsNumber === 1 ? '1st inning' : '2nd inning';
}

function toOverBallChip(ball: MatchBallEvent): OverBallChip {
  if (ball.wicket) {
    return { id: ball.id, label: 'W', tone: 'wicket' };
  }

  if (ball.extrasType) {
    const totalRuns = ball.runsOffBat + ball.extrasRuns;
    const shortLabel = extrasChipShortLabel[ball.extrasType];
    return {
      id: ball.id,
      label: `${totalRuns}${shortLabel}`,
      tone: 'extra',
    };
  }

  return {
    id: ball.id,
    label: String(ball.runsOffBat + ball.extrasRuns),
    tone: 'default',
  };
}

export function AdminScoringPage() {
  const { matchId } = useParams();
  const fixtures = useApi<any[]>('/admin/fixtures');
  const players = useApi<any[]>('/admin/players');
  const match = useApi<any>(matchId ? `/admin/matches/${matchId}` : null);
  const teams = useApi<any[]>('/admin/teams');
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [tossTeamId, setTossTeamId] = useState('');
  const [tossDecision, setTossDecision] = useState('BAT');
  const [inningsNumber, setInningsNumber] = useState<1 | 2>(1);
  const [strikerId, setStrikerId] = useState('');
  const [nonStrikerId, setNonStrikerId] = useState('');
  const [bowlerId, setBowlerId] = useState('');
  const [commentary, setCommentary] = useState('');
  const [resultSummary, setResultSummary] = useState('');
  const [winnerTeamId, setWinnerTeamId] = useState('');
  const [autoNextBatter, setAutoNextBatter] = useState(true);
  const [autoNextBowler, setAutoNextBowler] = useState(true);

  const refresh = useCallback(async () => {
    await Promise.all([fixtures.refetch(), players.refetch(), teams.refetch()]);
    if (matchId) {
      await match.refetch();
    }
  }, [fixtures, match, matchId, players, teams]);

  useSse<{ data: unknown }>(matchId ? `/events/matches/${matchId}` : null, () => {
    if (matchId) {
      void match.refetch();
    }
  });

  const activeMatchId = matchId || fixtures.data?.[0]?.match?.id;
  const activeMatch = matchId ? match.data : fixtures.data?.find((f) => f.match?.id === activeMatchId)?.match;

  const teamNameById = useMemo(() => new Map((teams.data ?? []).map((team) => [team.id, team.name])), [teams.data]);
  const playerNameById = useMemo(() => new Map((players.data ?? []).map((player) => [player.id, player.displayName])), [players.data]);

  const teamOptions = useMemo(
    () => teams.data?.filter((team) => team.id === activeMatch?.teamAId || team.id === activeMatch?.teamBId) ?? [],
    [teams.data, activeMatch],
  );
  const winningTeamName = useMemo(() => {
    const winnerTeamId = activeMatch?.winnerTeamId as string | undefined;
    if (!winnerTeamId) {
      return null;
    }
    return teamNameById.get(winnerTeamId) ?? winnerTeamId;
  }, [activeMatch, teamNameById]);

  const inningsTeams = useMemo(() => {
    if (!activeMatch) {
      return { battingTeamId: '', bowlingTeamId: '' };
    }

    const inningsRows = (activeMatch.innings as MatchInningsRow[] | undefined) ?? [];
    const selectedInnings = inningsRows.find((row) => row.inningsNumber === inningsNumber);
    if (selectedInnings) {
      return {
        battingTeamId: selectedInnings.battingTeamId,
        bowlingTeamId: selectedInnings.bowlingTeamId,
      };
    }

    const teamAId = activeMatch.teamAId as string;
    const teamBId = activeMatch.teamBId as string;

    let innings1Batting = teamAId;
    let innings1Bowling = teamBId;

    if (activeMatch.tossWonByTeamId && activeMatch.tossDecision) {
      const tossWinner = activeMatch.tossWonByTeamId as string;
      const otherTeam = tossWinner === teamAId ? teamBId : teamAId;
      if (activeMatch.tossDecision === 'BAT') {
        innings1Batting = tossWinner;
        innings1Bowling = otherTeam;
      } else {
        innings1Bowling = tossWinner;
        innings1Batting = otherTeam;
      }
    }

    if (inningsNumber === 1) {
      return { battingTeamId: innings1Batting, bowlingTeamId: innings1Bowling };
    }

    return { battingTeamId: innings1Bowling, bowlingTeamId: innings1Batting };
  }, [activeMatch, inningsNumber]);

  const squadPlayerIdsByTeam = useMemo(() => {
    const map = new Map<string, Set<string>>();
    const rows = (activeMatch?.squadSelections as Array<{ teamId: string; playerId: string }> | undefined) ?? [];
    for (const row of rows) {
      if (!map.has(row.teamId)) {
        map.set(row.teamId, new Set<string>());
      }
      map.get(row.teamId)?.add(row.playerId);
    }
    return map;
  }, [activeMatch]);

  const { battingPlayers, bowlingPlayers } = useMemo(() => {
    const allPlayers = players.data ?? [];
    const battingIds = squadPlayerIdsByTeam.get(inningsTeams.battingTeamId);
    const bowlingIds = squadPlayerIdsByTeam.get(inningsTeams.bowlingTeamId);

    const scopedBattingPlayers = battingIds ? allPlayers.filter((player) => battingIds.has(player.id)) : allPlayers;
    const scopedBowlingPlayers = bowlingIds ? allPlayers.filter((player) => bowlingIds.has(player.id)) : allPlayers;

    return {
      battingPlayers: scopedBattingPlayers,
      bowlingPlayers: scopedBowlingPlayers,
    };
  }, [players.data, squadPlayerIdsByTeam, inningsTeams]);

  const inningsRows = useMemo(
    () => ((activeMatch?.innings as MatchInningsRow[] | undefined) ?? []),
    [activeMatch],
  );

  const selectedInnings = useMemo(
    () => inningsRows.find((row) => row.inningsNumber === inningsNumber) ?? null,
    [inningsRows, inningsNumber],
  );

  const inningsOne = useMemo(() => inningsRows.find((row) => row.inningsNumber === 1) ?? null, [inningsRows]);
  const inningsTwo = useMemo(() => inningsRows.find((row) => row.inningsNumber === 2) ?? null, [inningsRows]);
  const liveInningsNumber = (activeMatch?.currentInnings as 0 | 1 | 2 | undefined) ?? inningsNumber;

  const selectedInningsBalls = useMemo(
    () =>
      ((activeMatch?.ballEvents as MatchBallEvent[] | undefined) ?? [])
        .filter((ball) => ball.inningsId === selectedInnings?.id)
        .sort((left, right) => left.sequence - right.sequence),
    [activeMatch, selectedInnings],
  );

  const battingFiguresById = useMemo(() => {
    const figures = new Map<string, BatterFigure>();
    for (const player of battingPlayers) {
      figures.set(player.id, { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 });
    }

    for (const ball of selectedInningsBalls) {
      if (!ball.strikerId) {
        continue;
      }
      const figure = figures.get(ball.strikerId) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
      figure.runs += ball.runsOffBat;
      if (ball.runsOffBat === 4) {
        figure.fours += 1;
      }
      if (ball.runsOffBat === 6) {
        figure.sixes += 1;
      }
      if (ball.isValidDelivery) {
        figure.balls += 1;
      }
      if (ball.wicket) {
        figure.isOut = true;
      }
      figures.set(ball.strikerId, figure);
    }

    return figures;
  }, [battingPlayers, selectedInningsBalls]);

  const dismissedBatterIds = useMemo(() => {
    const ids = new Set<string>();
    for (const [playerId, figure] of battingFiguresById.entries()) {
      if (figure.isOut) {
        ids.add(playerId);
      }
    }
    return ids;
  }, [battingFiguresById]);

  const bowlingFiguresById = useMemo(() => {
    const figures = new Map<string, BowlerFigure>();
    for (const player of bowlingPlayers) {
      figures.set(player.id, { runs: 0, wickets: 0, balls: 0, maidens: 0 });
    }

    for (const ball of selectedInningsBalls) {
      if (!ball.bowlerId) {
        continue;
      }
      const figure = figures.get(ball.bowlerId) ?? { runs: 0, wickets: 0, balls: 0, maidens: 0 };
      figure.runs += ball.runsOffBat + ball.extrasRuns;
      if (ball.wicket) {
        figure.wickets += 1;
      }
      if (ball.isValidDelivery) {
        figure.balls += 1;
      }
      figures.set(ball.bowlerId, figure);
    }

    type OverAccumulator = { bowlerId: string; runs: number; legalBalls: number };
    const overByNumber = new Map<number, OverAccumulator>();
    let runningOverNumber = 1;

    for (const [index, ball] of selectedInningsBalls.entries()) {
      if (!ball.bowlerId) {
        continue;
      }
      const previous = selectedInningsBalls[index - 1];
      if (previous && ball.ballInOver === 1 && previous.ballInOver === 6) {
        runningOverNumber += 1;
      }

      const existing = overByNumber.get(runningOverNumber);
      if (existing) {
        existing.runs += ball.runsOffBat + ball.extrasRuns;
        if (ball.isValidDelivery) {
          existing.legalBalls += 1;
        }
      } else {
        overByNumber.set(runningOverNumber, {
          bowlerId: ball.bowlerId,
          runs: ball.runsOffBat + ball.extrasRuns,
          legalBalls: ball.isValidDelivery ? 1 : 0,
        });
      }
    }

    for (const over of overByNumber.values()) {
      if (over.legalBalls === 6 && over.runs === 0) {
        const figure = figures.get(over.bowlerId) ?? { runs: 0, wickets: 0, balls: 0, maidens: 0 };
        figure.maidens += 1;
        figures.set(over.bowlerId, figure);
      }
    }

    return figures;
  }, [bowlingPlayers, selectedInningsBalls]);

  const legalBallsSoFar = useMemo(() => selectedInningsBalls.filter((ball) => ball.isValidDelivery).length, [selectedInningsBalls]);

  const overInProgress = legalBallsSoFar > 0 && legalBallsSoFar % 6 !== 0;

  const currentOverBowlerId = useMemo(() => {
    if (!overInProgress) {
      return null;
    }
    return selectedInningsBalls[selectedInningsBalls.length - 1]?.bowlerId ?? null;
  }, [overInProgress, selectedInningsBalls]);

  const previousCompletedOverBowlerId = useMemo(() => {
    if (overInProgress || legalBallsSoFar === 0) {
      return null;
    }

    for (let index = selectedInningsBalls.length - 1; index >= 0; index -= 1) {
      const ball = selectedInningsBalls[index];
      if (ball?.isValidDelivery) {
        return ball.bowlerId;
      }
    }

    return null;
  }, [overInProgress, legalBallsSoFar, selectedInningsBalls]);

  const disabledBowlerIds = useMemo(() => {
    const ids = new Set<string>();

    if (overInProgress && currentOverBowlerId) {
      for (const player of bowlingPlayers) {
        if (player.id !== currentOverBowlerId) {
          ids.add(player.id);
        }
      }
      return ids;
    }

    if (previousCompletedOverBowlerId) {
      ids.add(previousCompletedOverBowlerId);
    }

    return ids;
  }, [bowlingPlayers, overInProgress, currentOverBowlerId, previousCompletedOverBowlerId]);

  const isBowlerInactive = useCallback((playerId: string) => disabledBowlerIds.has(playerId), [disabledBowlerIds]);

  useEffect(() => {
    const battingIds = new Set(battingPlayers.map((player) => player.id));
    const bowlingIds = new Set(bowlingPlayers.map((player) => player.id));

    if (!battingIds.has(strikerId) || dismissedBatterIds.has(strikerId)) {
      setStrikerId('');
    }

    if (!battingIds.has(nonStrikerId) || dismissedBatterIds.has(nonStrikerId)) {
      setNonStrikerId('');
    }

    if (!bowlingIds.has(bowlerId) || disabledBowlerIds.has(bowlerId)) {
      setBowlerId('');
    }
  }, [battingPlayers, bowlingPlayers, strikerId, nonStrikerId, bowlerId, dismissedBatterIds, disabledBowlerIds]);

  const canSubmitBall = Boolean(
    strikerId &&
      nonStrikerId &&
      bowlerId &&
      strikerId !== nonStrikerId &&
      !dismissedBatterIds.has(strikerId) &&
      !dismissedBatterIds.has(nonStrikerId) &&
      !disabledBowlerIds.has(bowlerId),
  );

  const overHistory = useMemo(() => {
    if (!selectedInnings) {
      return [] as OverSummary[];
    }

    if (!selectedInningsBalls.length) {
      return [] as OverSummary[];
    }

    let runningOverNumber = 1;
    const ballsWithOver = selectedInningsBalls.map((ball, index) => {
      const previous = selectedInningsBalls[index - 1];
      if (previous && ball.ballInOver === 1 && previous.ballInOver === 6) {
        runningOverNumber += 1;
      }
      return {
        ...ball,
        overNumber: runningOverNumber,
      };
    });

    const latestOverNumber = ballsWithOver[ballsWithOver.length - 1]?.overNumber ?? 1;
    const grouped = new Map<number, OverBallChip[]>();

    for (const ball of ballsWithOver) {
      if (!grouped.has(ball.overNumber)) {
        grouped.set(ball.overNumber, []);
      }
      grouped.get(ball.overNumber)?.push(toOverBallChip(ball));
    }

    return Array.from(grouped.entries()).map(([overNumber, balls]) => ({
      overNumber,
      balls,
      isCurrent: overNumber === latestOverNumber,
    }));
  }, [selectedInnings, selectedInningsBalls]);

  const batterOptionLabel = useCallback(
    (playerId: string, playerName: string) => {
      const figure = battingFiguresById.get(playerId) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
      const strikerMark = playerId === strikerId ? ' *' : '';
      const wicketMark = figure.isOut ? ' W' : '';
      const inactiveText = figure.isOut ? ' - Not active' : '';
      return `${playerName}${strikerMark} ${figure.runs}(${figure.balls})${wicketMark}${inactiveText}`;
    },
    [battingFiguresById, strikerId],
  );

  const bowlerOptionLabel = useCallback(
    (playerId: string, playerName: string) => {
      const figure = bowlingFiguresById.get(playerId) ?? { runs: 0, wickets: 0, balls: 0, maidens: 0 };
      const bowlerMark = playerId === bowlerId ? ' *' : '';
      const inactiveText = isBowlerInactive(playerId) ? ' - Not active' : '';
      return `${playerName}${bowlerMark} ${figure.runs}/${figure.wickets} (${formatOversFromBalls(figure.balls)})${inactiveText}`;
    },
    [bowlerId, bowlingFiguresById, isBowlerInactive],
  );

  const visibleBattingIds = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();

    for (const ball of selectedInningsBalls) {
      if (!ball.strikerId) {
        continue;
      }
      if (!seen.has(ball.strikerId)) {
        seen.add(ball.strikerId);
        ordered.push(ball.strikerId);
      }
    }

    for (const currentId of [strikerId, nonStrikerId]) {
      if (currentId && !seen.has(currentId)) {
        seen.add(currentId);
        ordered.push(currentId);
      }
    }

    return ordered;
  }, [selectedInningsBalls, strikerId, nonStrikerId]);

  const visibleBowlingIds = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();

    for (const ball of selectedInningsBalls) {
      if (!ball.bowlerId) {
        continue;
      }
      if (!seen.has(ball.bowlerId)) {
        seen.add(ball.bowlerId);
        ordered.push(ball.bowlerId);
      }
    }

    if (bowlerId && !seen.has(bowlerId)) {
      seen.add(bowlerId);
      ordered.push(bowlerId);
    }

    return ordered;
  }, [selectedInningsBalls, bowlerId]);

  const currentBowlerId = bowlerId || selectedInningsBalls[selectedInningsBalls.length - 1]?.bowlerId || '';

  const inningsHeaderLabel = inningsNumber === 1 ? '1st inning' : '2nd inning';
  const inningsSummaryLabel = useCallback(
    (row: MatchInningsRow | null) => {
      if (!row) {
        return '0 - 0 (0.0)';
      }
      return `${row.totalRuns} - ${row.wickets} (${formatOversFromBalls(row.balls)})`;
    },
    [],
  );

  const post = async (path: string, body: unknown = {}) => {
    if (!activeMatchId) {
      return;
    }

    setSaving(true);
    setActionError(null);
    try {
      await apiPost(path.replace(':id', activeMatchId), body);
      await refresh();
      if (matchId) {
        await match.refetch();
      }
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Request failed');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const postBall = async (payload: {
    inningsNumber: 1 | 2;
    runsOffBat: 0 | 1 | 2 | 3 | 4 | 6;
    extrasType?: 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE';
    extrasRuns?: number;
    wicket?: boolean;
    wicketType?: string;
    strikerId: string;
    nonStrikerId: string;
    bowlerId: string;
    commentary: string;
  }) => {
    await post('/admin/matches/:id/score', payload);

    let nextStrikerId = payload.strikerId;
    let nextNonStrikerId = payload.nonStrikerId;
    let nextBowlerId = payload.bowlerId;

    const isLegalDelivery = payload.extrasType !== 'WIDE' && payload.extrasType !== 'NO_BALL';
    const ballInOver = (legalBallsSoFar % 6) + 1;
    const overCompleted = isLegalDelivery && ballInOver === 6;
    const deliveryRuns = payload.runsOffBat + (payload.extrasRuns ?? 0);
    let strikeSwappedByRuns = false;

    if (!payload.wicket && deliveryRuns % 2 === 1) {
      nextStrikerId = payload.nonStrikerId;
      nextNonStrikerId = payload.strikerId;
      strikeSwappedByRuns = true;
    }

    if (payload.wicket && autoNextBatter) {
      const dismissedBatters = new Set(dismissedBatterIds);
      dismissedBatters.add(payload.strikerId);

      if (overCompleted) {
        nextStrikerId = payload.nonStrikerId;
        const replacement = battingPlayers.find((player) => !dismissedBatters.has(player.id) && player.id !== nextStrikerId);
        nextNonStrikerId = replacement?.id ?? '';
      } else {
        nextNonStrikerId = payload.nonStrikerId;
        const replacement = battingPlayers.find((player) => !dismissedBatters.has(player.id) && player.id !== nextNonStrikerId);
        nextStrikerId = replacement?.id ?? '';
      }
    }
    if (!payload.wicket && overCompleted && !strikeSwappedByRuns) {
      const temp = nextStrikerId;
      nextStrikerId = nextNonStrikerId;
      nextNonStrikerId = temp;
    }

    if (autoNextBowler && overCompleted) {
      const replacementBowler = bowlingPlayers.find((player) => player.id !== payload.bowlerId);
      if (replacementBowler) {
        nextBowlerId = replacementBowler.id;
      }
    }

    setStrikerId(nextStrikerId);
    setNonStrikerId(nextNonStrikerId);
    setBowlerId(nextBowlerId);
  };

  if (fixtures.loading || players.loading || teams.loading || (matchId && match.loading)) {
    return <LoadingSkeleton rows={10} />;
  }

  if (!activeMatchId || !activeMatch) {
    return (
      <Card>
        <SectionTitle title="Scoring Panel" />
        <p>Create fixtures first, then open scoring from this page.</p>
        <Link className="button primary" to="/admin/fixtures">
          Go To Fixtures
        </Link>
      </Card>
    );
  }

  return (
    <div className="page-grid">
      <Card>
        <SectionTitle title="Match Scoring Panel" action={<StatusBadge status={activeMatch.status} />} />
        <p>
          {activeMatch.matchNumber} | {teamNameById.get(activeMatch.teamAId) ?? activeMatch.teamAId} vs {teamNameById.get(activeMatch.teamBId) ?? activeMatch.teamBId}
        </p>
        <small>{activeMatch.statusText}</small>
        {winningTeamName ? (
          <p style={{ marginTop: 10 }}>
            Winner: <strong>{winningTeamName}</strong>
          </p>
        ) : null}
        {actionError ? <p style={{ color: 'var(--danger)', marginTop: 10 }}>{actionError}</p> : null}
      </Card>

      <Card>
        <SectionTitle title="Toss + Innings Controls" />
        <div className="inline-actions">
          <select value={tossTeamId} onChange={(e) => setTossTeamId(e.target.value)}>
            <option value="">Toss winner</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select value={tossDecision} onChange={(e) => setTossDecision(e.target.value)}>
            <option value="BAT">BAT</option>
            <option value="BOWL">BOWL</option>
          </select>
          <button className="button secondary" disabled={!tossTeamId || saving} onClick={() => post('/admin/matches/:id/toss', { wonByTeamId: tossTeamId, decision: tossDecision })}>
            Save Toss
          </button>
        </div>
        <div className="inline-actions">
          <button className="button secondary" disabled={saving} onClick={() => post('/admin/matches/:id/start-innings', { inningsNumber: 1 })}>
            Start Innings 1
          </button>
          <button className="button secondary" disabled={saving} onClick={() => post('/admin/matches/:id/start-innings', { inningsNumber: 2 })}>
            Start Innings 2
          </button>
          {/* <button className="button secondary" disabled={saving} onClick={() => post('/admin/matches/:id/end-innings')}>
            End Innings
          </button> */}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Ball Entry Controls" />
        <p style={{ marginBottom: 12 }}>
          Batting: <strong>{teamNameById.get(inningsTeams.battingTeamId) ?? inningsTeams.battingTeamId}</strong> | Bowling:{' '}
          <strong>{teamNameById.get(inningsTeams.bowlingTeamId) ?? inningsTeams.bowlingTeamId}</strong>
        </p>
        <div className="innings-split-summary">
          <div className={`innings-split-card ${liveInningsNumber === 1 ? 'is-active' : ''}`.trim()}>
            <span className="innings-split-kicker">
              {teamNameById.get(inningsOne?.battingTeamId ?? '') ?? '-'}, {inningsLabel(1)}
            </span>
            <strong className="innings-split-score">{inningsSummaryLabel(inningsOne)}</strong>
            <span className="innings-split-rate">CRR {(inningsOne?.runRate ?? 0).toFixed(2)}</span>
          </div>
          <div className={`innings-split-card ${liveInningsNumber === 2 ? 'is-active' : ''}`.trim()}>
            <span className="innings-split-kicker">
              {teamNameById.get(inningsTwo?.battingTeamId ?? '') ?? '-'}, {inningsLabel(2)}
            </span>
            <strong className="innings-split-score">{inningsSummaryLabel(inningsTwo)}</strong>
            <span className="innings-split-rate">CRR {(inningsTwo?.runRate ?? 0).toFixed(2)}</span>
          </div>
        </div>
        {/* <div className="innings-scorecard">
          <div className="innings-scorecard-top">
            <div>
              <span className="innings-scorecard-team">
                {teamNameById.get(inningsTeams.battingTeamId) ?? inningsTeams.battingTeamId}, {inningsHeaderLabel}
              </span>
              <div className="innings-scorecard-main">
                {(selectedInnings?.totalRuns ?? 0)} - {(selectedInnings?.wickets ?? 0)} ({formatOversFromBalls(selectedInnings?.balls ?? 0)})
              </div>
            </div>
            <div className="innings-scorecard-rate">
              <span>CRR</span>
              <strong>{(selectedInnings?.runRate ?? 0).toFixed(2)}</strong>
            </div>
          </div>

          
        </div> */}
        <div className="over-history" aria-live="polite">
          {overHistory.length ? (
            overHistory.map((over) => (
              <div key={over.overNumber} className={`over-summary ${over.isCurrent ? 'is-current-over' : ''}`.trim()}>
                <span className="over-summary-label">{over.isCurrent ? `This over (${over.overNumber})` : `Over ${over.overNumber}`}:</span>
                <div className="over-ball-list">
                  {over.balls.map((ball) => (
                    <span key={ball.id} className={`over-ball-chip ${ball.tone === 'wicket' ? 'is-wicket' : ball.tone === 'extra' ? 'is-extra' : ''}`.trim()}>
                      {ball.label}
                    </span>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="over-summary">
              <span className="over-summary-label">This over:</span>
              <div className="over-ball-list">
                <span className="over-ball-empty">No balls yet</span>
              </div>
            </div>
          )}
        </div>
        <div className="player-history-grid">
          <div className="player-history-block">
            <span className="player-history-title">Batters</span>
            <div className="player-history-list">
              {visibleBattingIds.map((playerId) => {
                const figure = battingFiguresById.get(playerId) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
                const isOnStrike = playerId === strikerId;
                const isInactive = figure.isOut;
                const playerName = playerNameById.get(playerId) ?? playerId;

                return (
                  <div key={playerId} className={`player-history-row ${isInactive ? 'is-inactive' : ''}`.trim()}>
                    <div className="player-name-wrap">
                      <span className="player-name">
                        {playerName}
                        {isOnStrike ? ' *' : ''}
                      </span>
                      {isInactive ? <span className="player-tag wicket">W</span> : null}
                    </div>
                    <div className="player-figure-wrap">
                      <span className="player-figures">
                        {figure.runs}({figure.balls})
                      </span>
                      {isInactive ? <span className="player-tag inactive">Not active</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="player-history-block">
            <span className="player-history-title">Bowlers</span>
            <div className="player-history-list">
              {visibleBowlingIds.map((playerId) => {
                const figure = bowlingFiguresById.get(playerId) ?? { runs: 0, wickets: 0, balls: 0, maidens: 0 };
                const isCurrentBowler = playerId === bowlerId;
                const isInactive = isBowlerInactive(playerId);
                const playerName = playerNameById.get(playerId) ?? playerId;

                return (
                  <div key={playerId} className={`player-history-row ${isInactive ? 'is-inactive' : ''}`.trim()}>
                    <div className="player-name-wrap">
                      <span className="player-name">
                        {playerName}
                        {isCurrentBowler ? ' *' : ''}
                      </span>
                    </div>
                    <div className="player-figure-wrap">
                      <span className="player-figures">
                        {figure.runs}/{figure.wickets} ({formatOversFromBalls(figure.balls)})
                      </span>
                      {isInactive ? <span className="player-tag inactive">Not active</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="form-grid compact">
          <label className="checkbox-row">
            <input type="checkbox" checked={autoNextBatter} onChange={(e) => setAutoNextBatter(e.target.checked)} />
            Auto select next batter on wicket
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={autoNextBowler} onChange={(e) => setAutoNextBowler(e.target.checked)} />
            Auto select next bowler after over
          </label>
          <select value={inningsNumber} onChange={(e) => setInningsNumber(Number(e.target.value) as 1 | 2)}>
            <option value={1}>Innings 1</option>
            <option value={2}>Innings 2</option>
          </select>
          <select value={strikerId} onChange={(e) => setStrikerId(e.target.value)}>
            <option value="">Striker</option>
            {battingPlayers.map((player) => {
              const figure = battingFiguresById.get(player.id) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
              const isInactive = figure.isOut || player.id === nonStrikerId;
              return (
                <option key={player.id} value={player.id} disabled={isInactive}>
                  {batterOptionLabel(player.id, player.displayName)}
                </option>
              );
            })}
          </select>
          <select value={nonStrikerId} onChange={(e) => setNonStrikerId(e.target.value)}>
            <option value="">Non-striker</option>
            {battingPlayers.map((player) => {
              const figure = battingFiguresById.get(player.id) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
              const isInactive = figure.isOut || player.id === strikerId;
              return (
                <option key={player.id} value={player.id} disabled={isInactive}>
                  {batterOptionLabel(player.id, player.displayName)}
                </option>
              );
            })}
          </select>
          <select value={bowlerId} onChange={(e) => setBowlerId(e.target.value)}>
            <option value="">Bowler</option>
            {bowlingPlayers.map((player) => (
              <option key={player.id} value={player.id} disabled={isBowlerInactive(player.id)}>
                {bowlerOptionLabel(player.id, player.displayName)}
              </option>
            ))}
          </select>
          <input value={commentary} onChange={(e) => setCommentary(e.target.value)} placeholder="Commentary note" />
        </div>

        <div className="score-keypad">
          {runButtons.map((run) => (
            <button
              key={run}
              className="button score-btn"
              disabled={!canSubmitBall || saving}
              onClick={() =>
                postBall({
                  inningsNumber,
                  runsOffBat: run,
                  strikerId,
                  nonStrikerId,
                  bowlerId,
                  commentary,
                })
              }
            >
              {run}
            </button>
          ))}
          <button
            className="button score-btn wicket"
            disabled={!canSubmitBall || saving}
            onClick={() =>
              postBall({
                inningsNumber,
                runsOffBat: 0,
                wicket: true,
                wicketType: 'OUT',
                strikerId,
                nonStrikerId,
                bowlerId,
                commentary,
              })
            }
          >
            W
          </button>
          {extrasButtons.map((extrasType) => (
            <button
              key={extrasType}
              className="button score-btn"
              disabled={!canSubmitBall || saving}
              onClick={() =>
                postBall({
                  inningsNumber,
                  runsOffBat: 0,
                  extrasType,
                  extrasRuns: 1,
                  strikerId,
                  nonStrikerId,
                  bowlerId,
                  commentary,
                })
              }
            >
              {extrasType}
            </button>
          ))}
          <button className="button danger" disabled={saving} onClick={() => post('/admin/matches/:id/undo')}>
            Undo
          </button>
<br />
          <div className="inline-actions">
          
          <button className="button secondary" disabled={saving} onClick={() => post('/admin/matches/:id/end-innings')}>
            End Match
          </button>
        </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Interruption Controls" />
        <div className="inline-actions">
          <button className="button secondary" onClick={() => post('/admin/matches/:id/interruption', { type: 'RAIN_DELAY', statusText: 'Rain delay in progress' })}>
            Rain Delay
          </button>
          <button className="button secondary" onClick={() => post('/admin/matches/:id/interruption', { type: 'INJURY_BREAK', statusText: 'Injury break' })}>
            Injury
          </button>
          <button className="button secondary" onClick={() => post('/admin/matches/:id/interruption', { type: 'DRINKS', statusText: 'Drinks break' })}>
            Drinks
          </button>
          <button className="button danger" onClick={() => post('/admin/matches/:id/interruption', { type: 'ABANDONED', statusText: 'Match abandoned due to weather' })}>
            Abandon
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Result Publishing" />
        <div className="form-grid compact">
          <select value={winnerTeamId} onChange={(e) => setWinnerTeamId(e.target.value)}>
            <option value="">Select winner</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <input value={resultSummary} onChange={(e) => setResultSummary(e.target.value)} placeholder="Result summary" />
          <button className="button primary" disabled={!resultSummary || saving} onClick={() => post('/admin/matches/:id/declare-result', { winnerTeamId: winnerTeamId || null, resultSummary })}>
            Publish Result
          </button>
        </div>
      </Card>
    </div>
  );
}
