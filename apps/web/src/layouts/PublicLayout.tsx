import { Link, NavLink, Outlet } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';
import { IntroLoadingScreen } from '../components/IntroLoadingScreen';
import { TournamentProvider, useTournament } from '../context/TournamentContext';

const links = [
  { to: '/public/home', label: 'Home' },
  { to: '/public/fixtures', label: 'Fixtures' },
  { to: '/public/results', label: 'Results' },
  { to: '/public/points', label: 'Points' },
  { to: '/public/stats', label: 'Stats' },
  { to: '/public/awards', label: 'Awards' },
];

function PublicNavbar() {
  const { tournaments, selectedTournamentId, setSelectedTournamentId } = useTournament();

  return (
    <header className="topbar">
      <Link to="/public/home" className="brand-link">
        <img src="/logo.png" alt="TurfHero Logo" className="brand-logo" />
        <div className="brand">
          <strong className="brand-title">TurfHero</strong>
          <span className="brand-kicker">Tournament Center</span>
        </div>
      </Link>
      <div className="topbar-right">
        {tournaments.length > 0 && (
          <div className="tournament-picker-wrap">
            <select
              aria-label="Select Tournament"
              value={selectedTournamentId ?? ''}
              onChange={(e) => setSelectedTournamentId(e.target.value)}
              className="topbar-tournament-select"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.season})
                </option>
              ))}
            </select>
          </div>
        )}
        <nav className="top-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
          <NavLink to="/admin/dashboard">Admin</NavLink>
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}

export function PublicLayout() {
  return (
    <TournamentProvider>
      <div className="surface public-surface">
        <IntroLoadingScreen />
        <PublicNavbar />
        <main className="page-shell">
          <Outlet />
        </main>
        <nav className="mobile-bottom-nav">
          {links.slice(0, 5).map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </TournamentProvider>
  );
}

