import {vi} from 'vitest';
import * as admin from '@/features/admin/api';
import * as users from '@/features/admin/users/api';
import {
  mockActivityLogs,
  mockAiOverview,
  mockAlerts,
  mockAnnouncements,
  mockChallenges,
  mockDashboard,
  mockModeration,
  mockReports,
  mockRoles,
  mockSettingsData,
  mockShowcase,
  mockTrips,
  mockUsers,
  mockVideos,
} from './data';

// The admin API modules are automocked for every test (setup.ts). This gives
// each call the fixture the page expects; a test overrides what it needs.
export const mockAdminApi = () => {
  const m = vi.mocked(admin);
  m.fetchDashboard.mockResolvedValue(mockDashboard);
  m.fetchAlerts.mockResolvedValue(mockAlerts);
  m.fetchTrips.mockResolvedValue(mockTrips);
  m.fetchChallenges.mockResolvedValue(mockChallenges);
  m.fetchAi.mockResolvedValue(mockAiOverview);
  m.fetchReport.mockImplementation(async period => mockReports[period]);
  m.fetchLogs.mockResolvedValue(mockActivityLogs);
  m.fetchModeration.mockResolvedValue(mockModeration);
  m.fetchVideos.mockResolvedValue(mockVideos);
  m.fetchAnnouncements.mockResolvedValue(mockAnnouncements);
  m.fetchSettings.mockResolvedValue(mockSettingsData);
  m.fetchShowcase.mockResolvedValue(mockShowcase);
  m.fetchRoles.mockResolvedValue(mockRoles);
  vi.mocked(users).fetchUsers.mockResolvedValue(mockUsers);
};
