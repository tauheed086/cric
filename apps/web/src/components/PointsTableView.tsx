import type { PointsTableRow } from '@cric/types';
import { Card, TeamBadge } from './ui';

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
                <td>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                    <TeamBadge
                      team={{
                        name: row.teamName,
                        shortName: row.teamShortName,
                        logoUrl: row.logoUrl,
                        jerseyPrimary: row.jerseyPrimary,
                      }}
                      name={row.teamName}
                      size="md"
                    />
                    <span className="team-name">{row.teamName}</span>
                    {row.qualified ? <span className="qualified-pill" title="Qualified for Playoffs">Q</span> : null}
                  </div>
                </td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.lost}</td>
                <td>{row.tied}</td>
                <td>{row.noResult}</td>
                <td>{row.points}</td>
                <td>{row.netRunRate.toFixed(3)}</td>
                <td>
                  <div className="form-badges">
                    {(row.form ?? row.recentForm ?? []).map((res, idx) => (
                      <span
                        key={idx}
                        className={`form-badge form-badge-${res.toLowerCase()}`}
                        title={res === 'W' ? 'Won' : res === 'L' ? 'Lost' : res}
                      >
                        {res}
                      </span>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
