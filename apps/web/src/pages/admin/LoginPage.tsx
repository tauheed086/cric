import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DEFAULT_ADMIN_NAME } from '../../api/client';
import { useAdminAuth } from '../../context/AdminAuthContext';

export function AdminLoginPage() {
  const { login, isLoading } = useAdminAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState(DEFAULT_ADMIN_NAME);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      await login(password.trim(), username.trim());
      navigate('/admin/dashboard', { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid username or password. Please try again.');
    }
  }

  return (
    <div className="admin-login-wrapper">
      <div className="admin-login-card">
        <div className="admin-login-header">
          <div className="admin-login-brand">
            <img src="/logo.png" alt="TurfHero Logo" className="admin-login-logo" />
            <div className="admin-login-titles">
              <h1 className="admin-login-title">TurfHero</h1>
              <span className="admin-login-kicker">Admin Portal</span>
            </div>
          </div>
          <p className="admin-login-desc">Sign in to access tournament management and scoring.</p>
        </div>

        {errorMessage && (
          <div className="admin-login-alert" role="alert">
            <svg
              className="admin-login-alert-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="admin-login-form">
          <div className="admin-form-group">
            <label htmlFor="username" className="admin-form-label">
              Username
            </label>
            <input
              id="username"
              type="text"
              className="admin-form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              autoComplete="username"
              required
            />
          </div>

          <div className="admin-form-group">
            <label htmlFor="password" className="admin-form-label">
              Password
            </label>
            <div className="admin-password-wrap">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="admin-form-input admin-password-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="admin-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="admin-login-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="admin-login-footer">
          <Link to="/public/home" className="admin-back-link">
            &larr; Return to Public Tournament View
          </Link>
        </div>
      </div>
    </div>
  );
}
