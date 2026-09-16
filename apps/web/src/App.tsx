import { Navigate, Route, Routes } from 'react-router-dom';
import { PublicLayout } from './layouts/PublicLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { PublicHomePage } from './pages/public/HomePage';
import { PublicFixturesPage } from './pages/public/FixturesPage';
import { PublicMatchCenterPage } from './pages/public/MatchCenterPage';
import { PublicResultsPage } from './pages/public/ResultsPage';
import { PublicPointsPage } from './pages/public/PointsPage';
import { PublicTeamPage } from './pages/public/TeamPage';
import { PublicPlayerPage } from './pages/public/PlayerPage';
import { PublicStatsPage } from './pages/public/StatsPage';
import { PublicAwardsPage } from './pages/public/AwardsPage';
import { PublicAnnouncementsPage } from './pages/public/AnnouncementsPage';
import { PublicSearchPage } from './pages/public/SearchPage';
import { AdminDashboardPage } from './pages/admin/DashboardPage';
import { AdminTournamentPage } from './pages/admin/TournamentPage';
import { AdminTeamsPage } from './pages/admin/TeamsPage';
import { AdminPlayersPage } from './pages/admin/PlayersPage';
import { AdminFixturesPage } from './pages/admin/FixturesPage';
import { AdminScoringPage } from './pages/admin/ScoringPage';
import { AdminResultsPage } from './pages/admin/ResultsPage';
import { AdminAwardsPage } from './pages/admin/AwardsPage';
import { AdminAnnouncementsPage } from './pages/admin/AnnouncementsPage';
import { AdminSettingsPage } from './pages/admin/SettingsPage';
import { AdminUsersPage } from './pages/admin/UsersPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/public/home" replace />} />

      <Route path="/public" element={<PublicLayout />}>
        <Route path="home" element={<PublicHomePage />} />
        <Route path="fixtures" element={<PublicFixturesPage />} />
        <Route path="matches/:matchId" element={<PublicMatchCenterPage />} />
        <Route path="results" element={<PublicResultsPage />} />
        <Route path="points" element={<PublicPointsPage />} />
        <Route path="teams/:teamId" element={<PublicTeamPage />} />
        <Route path="players/:playerId" element={<PublicPlayerPage />} />
        <Route path="stats" element={<PublicStatsPage />} />
        <Route path="awards" element={<PublicAwardsPage />} />
        <Route path="announcements" element={<PublicAnnouncementsPage />} />
        <Route path="search" element={<PublicSearchPage />} />
      </Route>

      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="tournament" element={<AdminTournamentPage />} />
        <Route path="teams" element={<AdminTeamsPage />} />
        <Route path="players" element={<AdminPlayersPage />} />
        <Route path="fixtures" element={<AdminFixturesPage />} />
        <Route path="scoring/:matchId?" element={<AdminScoringPage />} />
        <Route path="results" element={<AdminResultsPage />} />
        <Route path="awards" element={<AdminAwardsPage />} />
        <Route path="announcements" element={<AdminAnnouncementsPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/public/home" replace />} />
    </Routes>
  );
}

export default App;
