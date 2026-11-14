import {Navigate, Route, Routes} from 'react-router-dom';
import {adminRoutes} from '@/app/routes';
import AdminLayout from './components/layout/AdminLayout';
import ActivityLogsPage from './pages/ActivityLogsPage';
import AiPage from './pages/AiPage';
import ChallengesPage from './pages/ChallengesPage';
import DashboardPage from './pages/DashboardPage';
import HomeContentPage from './pages/HomeContentPage';
import ModerationPage from './pages/ModerationPage';
import NotificationsPage from './pages/NotificationsPage';
import ReportsPage from './pages/ReportsPage';
import RolesPage from './pages/RolesPage';
import SettingsPage from './pages/SettingsPage';
import TripsPage from './pages/TripsPage';
import UserDetailsPage from './pages/UserDetailsPage';
import UsersPage from './pages/UsersPage';
import VideosPage from './pages/VideosPage';

// Pages under /admin/* (paths relative to /admin, see adminRoutes in
// app/routes.ts). The app router loads this module on demand, behind the
// admin role guard, so the user app does not download it.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route index element={<Navigate to={adminRoutes.dashboard} replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="users/:id" element={<UserDetailsPage />} />
        <Route path="trips" element={<TripsPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="ai" element={<AiPage />} />
        <Route path="home" element={<HomeContentPage />} />
        <Route path="videos" element={<VideosPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
        <Route path="moderation" element={<ModerationPage />} />
        <Route path="roles" element={<RolesPage />} />
        <Route path="*" element={<Navigate to={adminRoutes.dashboard} replace />} />
      </Route>
    </Routes>
  );
}
