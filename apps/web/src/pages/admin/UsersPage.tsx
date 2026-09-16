import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { AdminRole, type AdminUserSummary } from '@cric/types';
import {
  apiListAdminUsers,
  apiCreateAdminUser,
  apiUpdateAdminUser,
  apiDeleteAdminUser,
} from '../../api/client';
import { useApi } from '../../hooks/useApi';
import { Card, LoadingSkeleton, SectionTitle } from '../../components/ui';
import { useAdminAuth } from '../../context/AdminAuthContext';

const defaultForm = {
  name: '',
  username: '',
  password: '',
  role: AdminRole.SCORER,
  isActive: true,
};

export function AdminUsersPage() {
  const { isSuperAdmin, userId: currentUserId } = useAdminAuth();
  const { data: users, loading, error, refetch } = useApi<AdminUserSummary[]>('/admin/users');

  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<AdminUserSummary | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  // If not super admin, restrict access
  if (!isSuperAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setSuccessMsg(null);

    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setActionError('Name, username, and password are required.');
      return;
    }

    setSubmitting(true);
    try {
      await apiCreateAdminUser({
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password.trim(),
        role: form.role,
        isActive: form.isActive,
      });

      setSuccessMsg(`User "${form.name}" created successfully as ${form.role === AdminRole.SCORER ? 'Official Scorer' : 'Super Admin'}.`);
      setForm(defaultForm);
      await refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to create user.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: AdminUserSummary) => {
    setActionError(null);
    setSuccessMsg(null);

    if (user.id === currentUserId) {
      setActionError('You cannot deactivate your own account.');
      return;
    }

    try {
      await apiUpdateAdminUser(user.id, { isActive: !user.isActive });
      setSuccessMsg(`Status for ${user.name} updated to ${!user.isActive ? 'Active' : 'Inactive'}.`);
      await refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user status.');
    }
  };

  const handleDeleteUser = async (user: AdminUserSummary) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${user.name}"? This action cannot be undone.`)) {
      return;
    }

    setActionError(null);
    setSuccessMsg(null);

    if (user.id === currentUserId) {
      setActionError('You cannot delete your own account.');
      return;
    }

    try {
      await apiDeleteAdminUser(user.id);
      setSuccessMsg(`User "${user.name}" has been deleted.`);
      await refetch();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete user.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPassword.trim()) return;

    setResetting(true);
    try {
      await apiUpdateAdminUser(resetModalUser.id, { password: newPassword.trim() });
      setSuccessMsg(`Password for "${resetModalUser.name}" has been updated.`);
      setResetModalUser(null);
      setNewPassword('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const totalUsers = users?.length ?? 0;
  const scorersCount = users?.filter((u) => u.role === AdminRole.SCORER).length ?? 0;
  const activeCount = users?.filter((u) => u.isActive).length ?? 0;

  return (
    <div className="page-grid">
      {/* Overview & Security Info */}
      <Card>
        <SectionTitle
          title="User & Scorer Management"
          subtitle="Register and oversee official scorers and administrators. Official scorers have full scoring privileges scoped exclusively to the tournaments they create."
        />

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '1rem',
            margin: '1rem 0',
          }}
        >
          <div className="metric-chip" style={{ padding: '0.85rem 1.15rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Total Users</span>
            <strong style={{ fontSize: '1.4rem' }}>{totalUsers}</strong>
          </div>
          <div className="metric-chip" style={{ padding: '0.85rem 1.15rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Official Scorers</span>
            <strong style={{ fontSize: '1.4rem', color: 'var(--primary)' }}>{scorersCount}</strong>
          </div>
          <div className="metric-chip" style={{ padding: '0.85rem 1.15rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Active Accounts</span>
            <strong style={{ fontSize: '1.4rem', color: '#22c55e' }}>{activeCount}</strong>
          </div>
        </div>

        {actionError && (
          <div
            className="admin-login-alert"
            style={{ marginBottom: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
          >
            <span>{actionError}</span>
          </div>
        )}

        {successMsg && (
          <div
            className="admin-login-alert"
            style={{ marginBottom: '1rem', background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', borderColor: 'rgba(34, 197, 94, 0.3)' }}
          >
            <span>{successMsg}</span>
          </div>
        )}
      </Card>

      {/* Register Scorer Form */}
      <Card>
        <SectionTitle
          title="Register New Scorer / Admin"
          subtitle="Add an official scorer. Scorers can create tournaments, configure teams, schedule fixtures, and score matches in real-time."
        />

        <form onSubmit={handleCreateUser} className="form-grid compact" style={{ marginTop: '1rem' }}>
          <div>
            <label className="admin-form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="admin-form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              Username
            </label>
            <input
              type="text"
              placeholder="e.g. scorer_john"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="admin-form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              Password
            </label>
            <input
              type="password"
              placeholder="Min. 4 characters"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </div>

          <div>
            <label className="admin-form-label" style={{ fontSize: '0.8rem', marginBottom: '4px' }}>
              Role
            </label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as AdminRole }))}
              style={{
                width: '100%',
                padding: '0.65rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--surface-input)',
                color: 'var(--text)',
              }}
            >
              <option value={AdminRole.SCORER}>Official Scorer (Scoped Tournaments)</option>
              <option value={AdminRole.SUPER_ADMIN}>Super Admin (Full Management)</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', paddingTop: '1.2rem' }}>
            <button
              type="submit"
              className="button primary"
              disabled={submitting || !form.name || !form.username || !form.password}
              style={{ width: '100%', height: '42px' }}
            >
              {submitting ? 'Registering...' : '+ Register User'}
            </button>
          </div>
        </form>
      </Card>

      {/* Directory Table */}
      <Card>
        <SectionTitle
          title="User Directory"
          subtitle="Manage active credentials, reset passwords, or revoke access for scorer accounts."
        />

        {loading && <LoadingSkeleton rows={5} />}
        {error && <p style={{ color: '#ef4444' }}>Unable to load users.</p>}

        {!loading && users && users.length === 0 && (
          <p style={{ color: 'var(--text-muted)', padding: '1rem 0' }}>No users registered yet.</p>
        )}

        {!loading && users && users.length > 0 && (
          <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Tournaments</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Created</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isSuper = u.role === AdminRole.SUPER_ADMIN;

                  return (
                    <tr
                      key={u.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        opacity: u.isActive ? 1 : 0.6,
                      }}
                    >
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <strong style={{ fontSize: '0.95rem' }}>{u.name}</strong>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{u.username}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.7rem',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontWeight: 700,
                            letterSpacing: '0.03em',
                            textTransform: 'uppercase',
                            background: isSuper ? 'rgba(239, 68, 68, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                            color: isSuper ? '#ef4444' : '#3b82f6',
                          }}
                        >
                          {isSuper ? 'Super Admin' : 'Scorer'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{ fontWeight: 600 }}>{u.tournamentsCount ?? 0}</span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: 600,
                            background: u.isActive ? 'rgba(34, 197, 94, 0.12)' : 'rgba(156, 163, 175, 0.15)',
                            color: u.isActive ? '#22c55e' : '#9ca3af',
                          }}
                        >
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            className="button secondary"
                            style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                            onClick={() => {
                              setResetModalUser(u);
                              setNewPassword('');
                            }}
                            title="Reset password"
                          >
                            Reset Password
                          </button>

                          {!isSelf && (
                            <button
                              type="button"
                              className="button secondary"
                              style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                              onClick={() => handleToggleStatus(u)}
                              title={u.isActive ? 'Deactivate account' : 'Activate account'}
                            >
                              {u.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                          )}

                          {!isSelf && (
                            <button
                              type="button"
                              className="button"
                              style={{
                                fontSize: '0.75rem',
                                padding: '0.35rem 0.65rem',
                                background: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                              }}
                              onClick={() => handleDeleteUser(u)}
                              title="Delete user"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Reset Password Modal */}
      {resetModalUser && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            className="surface"
            style={{
              maxWidth: '420px',
              width: '100%',
              borderRadius: '12px',
              padding: '1.5rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border)',
            }}
          >
            <SectionTitle
              title="Reset Password"
              subtitle={`Set a new password for "${resetModalUser.name}" (@${resetModalUser.username}).`}
            />

            <form onSubmit={handleResetPassword} style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label className="admin-form-label" style={{ fontSize: '0.85rem', marginBottom: '6px' }}>
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid var(--border)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setResetModalUser(null)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button primary"
                  disabled={resetting || !newPassword.trim()}
                >
                  {resetting ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
