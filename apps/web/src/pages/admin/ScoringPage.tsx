import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiPost } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { useSse } from '../../hooks/useSse';
import { Card, LoadingSkeleton, SectionTitle, StatusBadge, TeamBadge } from '../../components/ui';

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
  const [selectedMomId, setSelectedMomId] = useState('');
  const [momSuccess, setMomSuccess] = useState<string | null>(null);

  const lastInitializedMatchId = useRef<string | null>(null);

  const handleSelectInnings = (targetInnings: 1 | 2) => {
    setInningsNumber(targetInnings);
    setStrikerId('');
    setNonStrikerId('');
    setBowlerId('');
  };

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
  const isMatchLocked = activeMatch?.status === 'COMPLETED' || activeMatch?.status === 'ABANDONED';

  useEffect(() => {
    if (activeMatch?.id && activeMatch.id !== lastInitializedMatchId.current) {
      lastInitializedMatchId.current = activeMatch.id;
      const inningsList = (activeMatch.innings as MatchInningsRow[] | undefined) ?? [];
      const hasInningsTwo = inningsList.some((i) => i.inningsNumber === 2);
      if (activeMatch.currentInnings === 2 || (activeMatch.status === 'COMPLETED' && hasInningsTwo)) {
        setInningsNumber(2);
      } else {
        setInningsNumber(1);
      }
    }
  }, [activeMatch?.id, activeMatch?.currentInnings, activeMatch?.status, activeMatch?.innings]);

  const teamNameById = useMemo(() => new Map((teams.data ?? []).map((team) => [team.id, team.name])), [teams.data]);
  const playerNameById = useMemo(() => new Map((players.data ?? []).map((player) => [player.id, player.displayName])), [players.data]);
  const teamMap = useMemo(() => new Map<string, any>((teams.data ?? []).map((t) => [t.id, t])), [teams.data]);

  const getTeam = useCallback(
    (teamId?: string | null) => {
      if (!teamId) return null;
      return (
        teamMap.get(teamId) ??
        (activeMatch?.teamAId === teamId
          ? activeMatch.teamA
          : activeMatch?.teamBId === teamId
            ? activeMatch.teamB
            : null)
      );
    },
    [teamMap, activeMatch],
  );

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

  const getPlayersForTeam = useCallback(
    (teamId: string): Array<{ id: string; displayName: string }> => {
      if (!teamId) return [];

      const allPlayers = players.data ?? [];

      // 1. Squad selections for this team in this match
      const squadIds = squadPlayerIdsByTeam.get(teamId);
      if (squadIds && squadIds.size > 0) {
        const squadList = allPlayers.filter((p) => squadIds.has(p.id));
        if (squadList.length > 0) {
          return [...squadList].sort((a, b) => a.displayName.localeCompare(b.displayName));
        }
      }

      // 2. Team players from activeMatch (teamA or teamB)
      let matchTeamObj: any = null;
      if (activeMatch?.teamAId === teamId) {
        matchTeamObj = activeMatch.teamA;
      } else if (activeMatch?.teamBId === teamId) {
        matchTeamObj = activeMatch.teamB;
      }

      if (matchTeamObj?.teamPlayers && matchTeamObj.teamPlayers.length > 0) {
        const list = matchTeamObj.teamPlayers
          .map((tp: any) => tp.player ?? allPlayers.find((p: any) => p.id === tp.playerId))
          .filter(Boolean);
        if (list.length > 0) {
          return [...list].sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
        }
      }

      // 3. Fallback to /admin/teams data (which includes teamPlayers)
      const foundTeam = (teams.data ?? []).find((t: any) => t.id === teamId);
      if (foundTeam?.teamPlayers && foundTeam.teamPlayers.length > 0) {
        const list = foundTeam.teamPlayers
          .map((tp: any) => tp.player ?? allPlayers.find((p: any) => p.id === tp.playerId))
          .filter(Boolean);
        if (list.length > 0) {
          return [...list].sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
        }
      }

      // 4. Fallback to /admin/players if teamPlayers relation is present
      const teamMappedPlayers = allPlayers.filter((p: any) =>
        p.teamPlayers?.some((tp: any) => tp.teamId === teamId),
      );
      if (teamMappedPlayers.length > 0) {
        return [...teamMappedPlayers].sort((a: any, b: any) => a.displayName.localeCompare(b.displayName));
      }

      return [];
    },
    [squadPlayerIdsByTeam, players.data, activeMatch, teams.data],
  );

  const teamAPlayers = useMemo(
    () => (activeMatch?.teamAId ? getPlayersForTeam(activeMatch.teamAId) : []),
    [activeMatch?.teamAId, getPlayersForTeam],
  );
  const teamBPlayers = useMemo(
    () => (activeMatch?.teamBId ? getPlayersForTeam(activeMatch.teamBId) : []),
    [activeMatch?.teamBId, getPlayersForTeam],
  );
  const teamAName = useMemo(
    () => (activeMatch?.teamAId ? teamNameById.get(activeMatch.teamAId) || activeMatch.teamA?.name || 'Team A' : 'Team A'),
    [activeMatch, teamNameById],
  );
  const teamBName = useMemo(
    () => (activeMatch?.teamBId ? teamNameById.get(activeMatch.teamBId) || activeMatch.teamB?.name || 'Team B' : 'Team B'),
    [activeMatch, teamNameById],
  );

  const battingPlayers = useMemo(
    () => getPlayersForTeam(inningsTeams.battingTeamId),
    [getPlayersForTeam, inningsTeams.battingTeamId],
  );

  const bowlingPlayers = useMemo(
    () => getPlayersForTeam(inningsTeams.bowlingTeamId),
    [getPlayersForTeam, inningsTeams.bowlingTeamId],
  );

  const battingTeamName = useMemo(
    () => teamNameById.get(inningsTeams.battingTeamId) ?? activeMatch?.teamA?.name ?? 'Batting Team',
    [teamNameById, inningsTeams.battingTeamId, activeMatch],
  );

  const bowlingTeamName = useMemo(
    () => teamNameById.get(inningsTeams.bowlingTeamId) ?? activeMatch?.teamB?.name ?? 'Bowling Team',
    [teamNameById, inningsTeams.bowlingTeamId, activeMatch],
  );

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
      !disabledBowlerIds.has(bowlerId) &&
      !isMatchLocked,
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

    const battingIdSet = new Set(battingPlayers.map((p) => p.id));
    for (const currentId of [strikerId, nonStrikerId]) {
      if (currentId && battingIdSet.has(currentId) && !seen.has(currentId)) {
        seen.add(currentId);
        ordered.push(currentId);
      }
    }

    return ordered;
  }, [selectedInningsBalls, strikerId, nonStrikerId, battingPlayers]);

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

    const bowlingIdSet = new Set(bowlingPlayers.map((p) => p.id));
    if (bowlerId && bowlingIdSet.has(bowlerId) && !seen.has(bowlerId)) {
      seen.add(bowlerId);
      ordered.push(bowlerId);
    }

    return ordered;
  }, [selectedInningsBalls, bowlerId, bowlingPlayers]);

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
    if (isMatchLocked) {
      const message = 'Match is completed. Editing is disabled.';
      setActionError(message);
      throw new Error(message);
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

  const saveMom = async () => {
    const targetPlayerId = selectedMomId || activeMatch?.momPlayerId;
    if (!activeMatchId || !targetPlayerId) {
      return;
    }
    setSaving(true);
    setActionError(null);
    setMomSuccess(null);
    try {
      await apiPost(`/admin/matches/${activeMatchId}/man-of-match`, { playerId: targetPlayerId });
      await refresh();
      if (matchId) {
        await match.refetch();
      }
      setMomSuccess('Man of the Match saved successfully!');
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to update Man of the Match');
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

    const isLegalDelivery = payload.extrasType !== 'WIDE' && payload.extrasType !== 'NO_BALL';
    const ballInOver = (legalBallsSoFar % 6) + 1;
    const overCompleted = isLegalDelivery && ballInOver === 6;

    let physicalRuns = 0;
    if (payload.extrasType === 'BYE' || payload.extrasType === 'LEG_BYE') {
      physicalRuns = payload.extrasRuns ?? 0;
    } else if (!payload.extrasType) {
      if (payload.runsOffBat !== 4 && payload.runsOffBat !== 6) {
        physicalRuns = payload.runsOffBat;
      }
    } else if (payload.extrasType === 'NO_BALL') {
      if (payload.runsOffBat !== 4 && payload.runsOffBat !== 6) {
        physicalRuns = payload.runsOffBat;
      }
    } else if (payload.extrasType === 'WIDE') {
      const penalty = 1;
      const extraRun = Math.max((payload.extrasRuns ?? 1) - penalty, 0);
      physicalRuns = extraRun;
    }

    const runsRunOdd = physicalRuns % 2 === 1;

    let nextStrikerId = payload.strikerId;
    let nextNonStrikerId = payload.nonStrikerId;
    let nextBowlerId = payload.bowlerId;

    if (payload.wicket && autoNextBatter) {
      const dismissedBatters = new Set(dismissedBatterIds);
      dismissedBatters.add(payload.strikerId);

      const replacement = battingPlayers.find(
        (player) => !dismissedBatters.has(player.id) && player.id !== payload.nonStrikerId,
      );

      if (overCompleted) {
        nextStrikerId = payload.nonStrikerId;
        nextNonStrikerId = replacement?.id ?? '';
      } else {
        nextStrikerId = replacement?.id ?? '';
        nextNonStrikerId = payload.nonStrikerId;
      }
    } else if (!payload.wicket) {
      const playerAtEndS = runsRunOdd ? payload.nonStrikerId : payload.strikerId;
      const playerAtEndNS = runsRunOdd ? payload.strikerId : payload.nonStrikerId;

      nextStrikerId = overCompleted ? playerAtEndNS : playerAtEndS;
      nextNonStrikerId = overCompleted ? playerAtEndS : playerAtEndNS;
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '6px 0 10px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 6, background: 'var(--bg-2)', border: '1px solid var(--line)', fontWeight: 700 }}>
            {activeMatch.matchNumber}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TeamBadge team={getTeam(activeMatch.teamAId)} name={teamNameById.get(activeMatch.teamAId)} size="sm" />
            <strong>{teamNameById.get(activeMatch.teamAId) ?? activeMatch.teamAId}</strong>
          </span>
          <span style={{ color: 'var(--text-soft)', fontWeight: 600, fontSize: 13 }}>vs</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <TeamBadge team={getTeam(activeMatch.teamBId)} name={teamNameById.get(activeMatch.teamBId)} size="sm" />
            <strong>{teamNameById.get(activeMatch.teamBId) ?? activeMatch.teamBId}</strong>
          </span>
        </div>
        <small>{activeMatch.statusText}</small>
        {winningTeamName ? (
          <p style={{ marginTop: 10 }}>
            Winner: <strong>{winningTeamName}</strong>
          </p>
        ) : null}
        {isMatchLocked ? <p style={{ marginTop: 10 }}>This match is locked. Score and match controls are disabled.</p> : null}
        {actionError ? <p style={{ color: 'var(--danger)', marginTop: 10 }}>{actionError}</p> : null}
      </Card>

      <Card>
        <SectionTitle title="Toss + Innings Controls" />
        <div className="inline-actions">
          <select value={tossTeamId} disabled={saving || isMatchLocked} onChange={(e) => setTossTeamId(e.target.value)}>
            <option value="">Toss winner</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select value={tossDecision} disabled={saving || isMatchLocked} onChange={(e) => setTossDecision(e.target.value)}>
            <option value="BAT">BAT</option>
            <option value="BOWL">BOWL</option>
          </select>
          <button className="button secondary" disabled={!tossTeamId || saving || isMatchLocked} onClick={() => post('/admin/matches/:id/toss', { wonByTeamId: tossTeamId, decision: tossDecision })}>
            Save Toss
          </button>
        </div>
        <div className="inline-actions">
          <button className="button secondary" disabled={saving || isMatchLocked} onClick={() => post('/admin/matches/:id/start-innings', { inningsNumber: 1 })}>
            Start Innings 1
          </button>
          <button className="button secondary" disabled={saving || isMatchLocked} onClick={() => post('/admin/matches/:id/start-innings', { inningsNumber: 2 })}>
            Start Innings 2
          </button>
          {/* <button className="button secondary" disabled={saving} onClick={() => post('/admin/matches/:id/end-innings')}>
            End Innings
          </button> */}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Ball Entry Controls" />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-soft)' }}>Batting:</span>
            <TeamBadge team={getTeam(inningsTeams.battingTeamId)} name={teamNameById.get(inningsTeams.battingTeamId)} size="sm" />
            <strong>{teamNameById.get(inningsTeams.battingTeamId) ?? inningsTeams.battingTeamId}</strong>
          </div>
          <span style={{ color: 'var(--line)' }}>|</span>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--text-soft)' }}>Bowling:</span>
            <TeamBadge team={getTeam(inningsTeams.bowlingTeamId)} name={teamNameById.get(inningsTeams.bowlingTeamId)} size="sm" />
            <strong>{teamNameById.get(inningsTeams.bowlingTeamId) ?? inningsTeams.bowlingTeamId}</strong>
          </div>
        </div>
        <div className="innings-split-summary">
          <button
            type="button"
            className={`innings-split-card ${inningsNumber === 1 ? 'is-active' : ''}`.trim()}
            onClick={() => handleSelectInnings(1)}
            aria-pressed={inningsNumber === 1}
            title="Click to view 1st inning stats"
          >
            <span className="innings-split-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TeamBadge team={getTeam(inningsOne?.battingTeamId)} name={teamNameById.get(inningsOne?.battingTeamId ?? '')} size="sm" />
              <span>{teamNameById.get(inningsOne?.battingTeamId ?? '') ?? '-'}, {inningsLabel(1)}</span>
              {inningsNumber === 1 ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>
                  • Selected
                </span>
              ) : null}
            </span>
            <strong className="innings-split-score">{inningsSummaryLabel(inningsOne)}</strong>
            <span className="innings-split-rate">CRR {(inningsOne?.runRate ?? 0).toFixed(2)}</span>
          </button>
          <button
            type="button"
            className={`innings-split-card ${inningsNumber === 2 ? 'is-active' : ''}`.trim()}
            onClick={() => handleSelectInnings(2)}
            aria-pressed={inningsNumber === 2}
            title="Click to view 2nd inning stats"
          >
            <span className="innings-split-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <TeamBadge team={getTeam(inningsTwo?.battingTeamId)} name={teamNameById.get(inningsTwo?.battingTeamId ?? '')} size="sm" />
              <span>{teamNameById.get(inningsTwo?.battingTeamId ?? '') ?? '-'}, {inningsLabel(2)}</span>
              {inningsNumber === 2 ? (
                <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--accent)' }}>
                  • Selected
                </span>
              ) : null}
            </span>
            <strong className="innings-split-score">{inningsSummaryLabel(inningsTwo)}</strong>
            <span className="innings-split-rate">CRR {(inningsTwo?.runRate ?? 0).toFixed(2)}</span>
          </button>
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
            <input type="checkbox" checked={autoNextBatter} disabled={saving || isMatchLocked} onChange={(e) => setAutoNextBatter(e.target.checked)} />
            Auto select next batter on wicket
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={autoNextBowler} disabled={saving || isMatchLocked} onChange={(e) => setAutoNextBowler(e.target.checked)} />
            Auto select next bowler after over
          </label>
          <select value={inningsNumber} disabled={saving} onChange={(e) => handleSelectInnings(Number(e.target.value) as 1 | 2)}>
            <option value={1}>Innings 1</option>
            <option value={2}>Innings 2</option>
          </select>
          <select value={strikerId} disabled={saving || isMatchLocked} onChange={(e) => setStrikerId(e.target.value)}>
            <option value="">Striker</option>
            {battingTeamName && battingPlayers.length > 0 ? (
              <optgroup label={`${battingTeamName} (Batting)`}>
                {battingPlayers.map((player) => {
                  const figure = battingFiguresById.get(player.id) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
                  const isInactive = figure.isOut || player.id === nonStrikerId;
                  return (
                    <option key={player.id} value={player.id} disabled={isInactive}>
                      {batterOptionLabel(player.id, player.displayName)}
                    </option>
                  );
                })}
              </optgroup>
            ) : (
              battingPlayers.map((player) => {
                const figure = battingFiguresById.get(player.id) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
                const isInactive = figure.isOut || player.id === nonStrikerId;
                return (
                  <option key={player.id} value={player.id} disabled={isInactive}>
                    {batterOptionLabel(player.id, player.displayName)}
                  </option>
                );
              })
            )}
          </select>
          <select value={nonStrikerId} disabled={saving || isMatchLocked} onChange={(e) => setNonStrikerId(e.target.value)}>
            <option value="">Non-striker</option>
            {battingTeamName && battingPlayers.length > 0 ? (
              <optgroup label={`${battingTeamName} (Batting)`}>
                {battingPlayers.map((player) => {
                  const figure = battingFiguresById.get(player.id) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
                  const isInactive = figure.isOut || player.id === strikerId;
                  return (
                    <option key={player.id} value={player.id} disabled={isInactive}>
                      {batterOptionLabel(player.id, player.displayName)}
                    </option>
                  );
                })}
              </optgroup>
            ) : (
              battingPlayers.map((player) => {
                const figure = battingFiguresById.get(player.id) ?? { runs: 0, balls: 0, isOut: false, fours: 0, sixes: 0 };
                const isInactive = figure.isOut || player.id === strikerId;
                return (
                  <option key={player.id} value={player.id} disabled={isInactive}>
                    {batterOptionLabel(player.id, player.displayName)}
                  </option>
                );
              })
            )}
          </select>
          <select value={bowlerId} disabled={saving || isMatchLocked} onChange={(e) => setBowlerId(e.target.value)}>
            <option value="">Bowler</option>
            {bowlingTeamName && bowlingPlayers.length > 0 ? (
              <optgroup label={`${bowlingTeamName} (Bowling)`}>
                {bowlingPlayers.map((player) => (
                  <option key={player.id} value={player.id} disabled={isBowlerInactive(player.id)}>
                    {bowlerOptionLabel(player.id, player.displayName)}
                  </option>
                ))}
              </optgroup>
            ) : (
              bowlingPlayers.map((player) => (
                <option key={player.id} value={player.id} disabled={isBowlerInactive(player.id)}>
                  {bowlerOptionLabel(player.id, player.displayName)}
                </option>
              ))
            )}
          </select>
          <input value={commentary} disabled={saving || isMatchLocked} onChange={(e) => setCommentary(e.target.value)} placeholder="Commentary note" />
        </div>

        <div className="score-keypad">
          {runButtons.map((run) => (
            <button
              key={run}
              className="button score-btn"
              disabled={!canSubmitBall || saving || isMatchLocked}
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
            disabled={!canSubmitBall || saving || isMatchLocked}
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
              disabled={!canSubmitBall || saving || isMatchLocked}
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
          <button className="button danger" disabled={saving || isMatchLocked} onClick={() => post('/admin/matches/:id/undo')}>
            Undo
          </button>
<br />
          <div className="inline-actions">
          
          <button className="button secondary" disabled={saving || isMatchLocked} onClick={() => post('/admin/matches/:id/end-innings')}>
            End Match
          </button>
        </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Interruption Controls" />
        <div className="inline-actions">
          <button className="button secondary" disabled={saving || isMatchLocked} onClick={() => post('/admin/matches/:id/interruption', { type: 'RAIN_DELAY', statusText: 'Rain delay in progress' })}>
            Rain Delay
          </button>
          <button className="button secondary" disabled={saving || isMatchLocked} onClick={() => post('/admin/matches/:id/interruption', { type: 'INJURY_BREAK', statusText: 'Injury break' })}>
            Injury
          </button>
          <button className="button secondary" disabled={saving || isMatchLocked} onClick={() => post('/admin/matches/:id/interruption', { type: 'DRINKS', statusText: 'Drinks break' })}>
            Drinks
          </button>
          <button className="button danger" disabled={saving || isMatchLocked} onClick={() => post('/admin/matches/:id/interruption', { type: 'ABANDONED', statusText: 'Match abandoned due to weather' })}>
            Abandon
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Result Publishing" />
        <div className="form-grid compact">
          <select value={winnerTeamId} disabled={saving || isMatchLocked} onChange={(e) => setWinnerTeamId(e.target.value)}>
            <option value="">Select winner</option>
            {teamOptions.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <input value={resultSummary} disabled={saving || isMatchLocked} onChange={(e) => setResultSummary(e.target.value)} placeholder="Result summary" />
          <button className="button primary" disabled={!resultSummary || saving || isMatchLocked} onClick={() => post('/admin/matches/:id/declare-result', { winnerTeamId: winnerTeamId || null, resultSummary })}>
            Publish Result
          </button>
        </div>
      </Card>

      <Card>
        <SectionTitle title="Man of the Match" />
        {momSuccess && (
          <p style={{ color: '#22c55e', fontWeight: 500, marginBottom: '0.5rem' }}>{momSuccess}</p>
        )}
        <div className="form-grid compact">
          <select
            value={selectedMomId || activeMatch?.momPlayerId || ''}
            disabled={saving || activeMatch?.status === 'ABANDONED'}
            onChange={(e) => setSelectedMomId(e.target.value)}
          >
            <option value="">Select Man of the Match</option>
            {teamAPlayers.length > 0 && (
              <optgroup label={teamAName}>
                {teamAPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.displayName}
                  </option>
                ))}
              </optgroup>
            )}
            {teamBPlayers.length > 0 && (
              <optgroup label={teamBName}>
                {teamBPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.displayName}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            className="button primary"
            disabled={(!selectedMomId && !activeMatch?.momPlayerId) || saving || activeMatch?.status === 'ABANDONED'}
            onClick={saveMom}
          >
            {saving ? 'Saving...' : 'Save Man of the Match'}
          </button>
        </div>
        {activeMatch?.momPlayerId && (
          <p style={{ marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
            Current MOM: <strong>{playerNameById.get(activeMatch.momPlayerId) || activeMatch.momPlayerId}</strong>
          </p>
        )}
      </Card>
    </div>
  );
}
