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
import {mockApi, signIn, t, visit} from './helpers';

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
// `user` replaces details of the signed-in admin (e.g. {username} to be one of the listed accounts).
export const openAdmin = (path: string, overrides: Record<string, unknown> = {}, user: Record<string, unknown> = {}): Call[] => {
  signIn('admin', user);
  const calls = mockApi({...adminData, ...overrides});
  visit(path);
  return calls;
};

// the rows of a data table (without the header row)
export const bodyRows = (name?: string) =>
  (name ? cy.findByRole('table', {name}) : cy.get('table').first()).find('tbody tr');

// Opens the "More actions" menu of a user. A scroll closes that menu (on purpose), and the page can
// shift a little while it settles (pictures and details load): when that happens right after the
// click, the menu is opened again. Fails only if it cannot stay open after a few tries.
export const openUserMenu = (name: string, tries = 3): void => {
  cy.findByRole('button', {name: t('admin.users.moreActions', {name})}).click();
  // a late scroll would close it: give it a moment, then check
  cy.wait(200);
  cy.get('body').then($body => {
    if ($body.find('[role="menu"]').length === 0) {
      expect(tries, 'the user menu could not stay open').to.be.greaterThan(1);
      openUserMenu(name, tries - 1);
    }
  });
};
