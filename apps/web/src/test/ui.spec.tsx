import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { FixtureCard } from '../components/FixtureCard';
import { PointsTableView } from '../components/PointsTableView';

describe('UI components', () => {
  it('renders fixture card with live score', () => {
    render(
      <BrowserRouter>
        <FixtureCard
          match={{
            id: 'm1',
            matchNumber: 'Match 01',
            venue: 'Ground',
            stage: 'LEAGUE' as any,
            status: 'INNINGS_1' as any,
            startsAt: new Date().toISOString(),
            teamA: { id: 'a', name: 'A', shortName: 'A' },
            teamB: { id: 'b', name: 'B', shortName: 'B' },
            score: { runs: 20, wickets: 1, overs: '2.0', runRate: 10 },
          }}
        />
      </BrowserRouter>,
    );

    expect(screen.getByText('Match 01')).toBeInTheDocument();
    expect(screen.getByText('20/1 (2.0)')).toBeInTheDocument();
  });

  it('renders points table rows', () => {
    render(
      <PointsTableView
        rows={[
          {
            teamId: 't1',
            teamName: 'Falcons',
            played: 1,
            won: 1,
            lost: 0,
            tied: 0,
            noResult: 0,
            points: 2,
            netRunRate: 1.2,
            qualified: true,
            eliminated: false,
          },
        ]}
      />,
    );

    expect(screen.getByText('Falcons')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
