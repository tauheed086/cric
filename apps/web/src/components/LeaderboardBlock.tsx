import type { LeaderboardRow } from '@cric/types';
import { Card } from './ui';

export function LeaderboardBlock({ title, rows }: { title: string; rows: LeaderboardRow[] }) {
  return (
    <Card className="leaderboard-card">
      <h3>{title}</h3>
      <ol>
        {rows.slice(0, 8).map((row) => (
          <li key={row.playerId}>
            <div>
              <strong>{row.playerName}</strong>
              <span>{row.teamName}</span>
            </div>
            <b>{row.metric}</b>
          </li>
        ))}
      </ol>
    </Card>
  );
}
