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
} from '@/__tests__/fixtures/admin/data';
import type {Call} from './helpers';
import {mockApi, signIn, visit} from './helpers';

// The data the admin API sends: the same fixtures as the unit tests.
export const adminData: Record<string, unknown> = {
  'GET /admin/dashboard': mockDashboard,
  'GET /admin/alerts': mockAlerts,
  'GET /admin/trips': mockTrips,
  'GET /admin/challenges': mockChallenges,
  'GET /admin/ai': mockAiOverview,
  'GET /admin/reports': (call: Call) => mockReports[(call.query.period ?? '30d') as keyof typeof mockReports],
  'GET /admin/logs': mockActivityLogs,
  'GET /admin/moderation': mockModeration,
  'GET /admin/videos': mockVideos,
  'GET /admin/announcements': mockAnnouncements,
  'GET /admin/showcase': mockShowcase,
  'GET /admin/settings': mockSettingsData,
  'GET /admin/roles': mockRoles,
  'GET /admin/users': mockUsers,
};

// Opens a page of the admin panel as an administrator. `overrides` replaces or
// adds API answers ("METHOD /path": answer); the returned list holds every call.
export const openAdmin = (path: string, overrides: Record<string, unknown> = {}): Call[] => {
  signIn('admin');
  const calls = mockApi({...adminData, ...overrides});
  visit(path);
  return calls;
};

// the rows of a data table (without the header row)
export const bodyRows = (name?: string) =>
  (name ? cy.findByRole('table', {name}) : cy.get('table').first()).find('tbody tr');
