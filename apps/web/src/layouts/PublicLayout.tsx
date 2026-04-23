import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/public/home', label: 'Home' },
  { to: '/public/fixtures', label: 'Fixtures' },
  { to: '/public/results', label: 'Results' },
  { to: '/public/points', label: 'Points' },
  { to: '/public/stats', label: 'Stats' },
  { to: '/public/awards', label: 'Awards' },
];

export function PublicLayout() {
  return (
    <div className="surface public-surface">
      <header className="topbar">
        <div className="brand">
          <span className="brand-kicker">Local Cricket</span>
          <strong>Tournament Center</strong>
        </div>
        <nav className="top-nav">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
          <NavLink to="/admin/dashboard">Admin</NavLink>
        </nav>
      </header>
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
  );
}
