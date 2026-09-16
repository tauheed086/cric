import { NavLink, Outlet } from 'react-router-dom';
import { AdminRole } from '@cric/types';
import { ThemeToggle } from '../components/ThemeToggle';
import { useAdminAuth } from '../context/AdminAuthContext';
import { AdminLoginPage } from '../pages/admin/LoginPage';

const baseLinks = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/tournament', label: 'Tournament' },
  { to: '/admin/teams', label: 'Teams' },
  { to: '/admin/players', label: 'Players' },
  { to: '/admin/fixtures', label: 'Fixtures' },
  { to: '/admin/scoring', label: 'Scoring' },
  { to: '/admin/results', label: 'Results' },
  { to: '/admin/awards', label: 'Awards' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/settings', label: 'Settings' },
];

export function AdminLayout() {
  const { isAuthenticated, adminName, role, isSuperAdmin, logout } = useAdminAuth();

  if (!isAuthenticated) {
    return <AdminLoginPage />;
  }

  const initials = (adminName || 'Admin')
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const roleLabel = role === AdminRole.SUPER_ADMIN ? 'Super Admin' : 'Official Scorer';

  const links = isSuperAdmin
    ? [...baseLinks, { to: '/admin/users', label: 'Users & Scorers' }]
    : baseLinks;

  return (
    <div className="surface admin-surface">
      <aside className="admin-sidebar">
        <div className="admin-brand-wrap">
          <div className="brand-link">
            <img src="/logo.png" alt="TurfHero Logo" className="brand-logo" />
            <div className="brand">
              <strong className="brand-title">TurfHero</strong>
              <span className="brand-kicker">{isSuperAdmin ? 'Super Admin Console' : 'Scorer Console'}</span>
            </div>
          </div>
          <ThemeToggle />
        </div>

        <div className="admin-user-card">
          <div className="admin-user-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="admin-user-details">
            <span className="admin-user-role" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontSize: '0.65rem',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: isSuperAdmin ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                  color: isSuperAdmin ? '#ef4444' : '#3b82f6',
                }}
              >
                {roleLabel}
              </span>
            </span>
            <span className="admin-user-name" title={adminName}>
              {adminName}
            </span>
          </div>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={logout}
            title="Log out"
            aria-label="Log out"
          >
            Log Out
          </button>
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

