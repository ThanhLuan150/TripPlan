import {openAdmin} from '../../support/admin';
import {t} from '../../support/helpers';

const pages: [string, string][] = [
  ['/admin/dashboard', 'admin.dashboard.title'],
  ['/admin/users', 'admin.users.title'],
  ['/admin/trips', 'admin.trips.title'],
  ['/admin/challenges', 'admin.challenges.title'],
  ['/admin/ai', 'admin.ai.title'],
  ['/admin/videos', 'admin.videos.title'],
  ['/admin/home', 'admin.showcase.title'],
  ['/admin/notifications', 'admin.notifications.title'],
  ['/admin/reports', 'admin.reports.title'],
  ['/admin/activity-logs', 'admin.activityLogs.title'],
  ['/admin/moderation', 'admin.moderation.title'],
  ['/admin/roles', 'admin.rolesPage.title'],
  ['/admin/settings', 'admin.settings.title'],
];

describe('admin: layout and navigation', () => {
  pages.forEach(([path, title]) => {
    it(`opens ${path} with its title`, () => {
      openAdmin(path);

      cy.findByRole('heading', {level: 1, name: t(title)}).should('be.visible');
    });
  });

  it('the sidebar moves between the pages', () => {
    openAdmin('/admin/dashboard');
    const sidebar = () => cy.findAllByRole('navigation').first();

    sidebar().findByRole('link', {name: t('admin.nav.users')}).click();
    cy.location('pathname').should('eq', '/admin/users');
    sidebar().findByRole('link', {name: t('admin.nav.settings')}).click();
    cy.location('pathname').should('eq', '/admin/settings');
  });

  it('the sidebar can collapse to icons and remembers it', () => {
    openAdmin('/admin/dashboard');

    cy.findByRole('button', {name: t('admin.layout.collapse')}).click();
    cy.findByRole('button', {name: t('admin.layout.expand')}).should('be.visible');

    cy.reload();
    cy.findByRole('button', {name: t('admin.layout.expand')}).should('be.visible');
  });

  it('the notification bell shows the unread alerts', () => {
    openAdmin('/admin/dashboard');
    const bell = () => cy.findByRole('button', {name: /\(\d+ chưa đọc\)/});

    // (the alerts arrive after the page: the count is retried until it shows)
    bell().should($bell => expect(Number($bell.text())).to.be.greaterThan(0));
  });

  it('the account menu shows who is signed in and signs out', () => {
    openAdmin('/admin/dashboard');

    cy.findByRole('button', {name: t('admin.layout.account')}).click();
    cy.findByRole('region', {name: t('admin.layout.account')}).should('contain.text', 'Lan Nguyễn');
    cy.findByRole('button', {name: t('admin.layout.logout')}).click();

    cy.location('pathname').should('eq', '/');
    cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
  });

  it('the account menu links to the app', () => {
    openAdmin('/admin/dashboard');

    cy.findByRole('button', {name: t('admin.layout.account')}).click();
    cy.findByRole('link', {name: t('admin.layout.userApp')}).click();

    cy.location('pathname').should('eq', '/home');
  });
});
