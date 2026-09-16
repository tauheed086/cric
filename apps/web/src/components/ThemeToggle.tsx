import { useTheme } from '../context/ThemeContext';

export function ThemeToggle({ showLabel = false, className = '' }: { showLabel?: boolean; className?: string }) {
  const { theme, toggleTheme } = useTheme();

  const isDark = theme === 'dark';
  const label = isDark ? 'Light Mode' : 'Dark Mode';
  const title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`.trim()}
      onClick={toggleTheme}
      title={title}
      aria-label={title}
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        {isDark ? '☀️' : '🌙'}
      </span>
      {showLabel ? <span className="theme-toggle-label">{label}</span> : null}
    </button>
  );
}
