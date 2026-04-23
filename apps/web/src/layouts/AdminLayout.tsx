import { NavLink, Outlet } from 'react-router-dom';

const links = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/tournament', label: 'Tournament' },
  { to: '/admin/teams', label: 'Teams' },
  { to: '/admin/players', label: 'Players' },
  { to: '/admin/fixtures', label: 'Fixtures' },
  { to: '/admin/results', label: 'Results' },
  { to: '/admin/awards', label: 'Awards' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminLayout() {
  return (
    <div className="surface admin-surface">
      <aside className="admin-sidebar">
        <div className="brand">
          <span className="brand-kicker">Scorer Console</span>
          <strong>Admin Panel</strong>
        </div>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to}>
              {link.label}
            </NavLink>
          ))}
          <NavLink to="/public/home">Public App</NavLink>
        </nav>
      </aside>
      <main className="page-shell">
        <Outlet />
      </main>
    </div>
  );
}
