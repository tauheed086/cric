import type { PointsTableRow } from '@cric/types';
import { Card, StatusBadge } from './ui';

export function PointsTableView({ rows }: { rows: PointsTableRow[] }) {
  return (
    <Card className="table-card">
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Team</th>
              <th>P</th>
              <th>W</th>
              <th>L</th>
              <th>T</th>
              <th>NR</th>
              <th>Pts</th>
              <th>NRR</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.teamId}>
                <td>{row.teamName}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.lost}</td>
                <td>{row.tied}</td>
                <td>{row.noResult}</td>
                <td>{row.points}</td>
                <td>{row.netRunRate.toFixed(3)}</td>
                <td>
                  {row.qualified ? <StatusBadge status="WINNER" /> : null}
                  {row.eliminated ? <StatusBadge status="ABANDONED" /> : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
