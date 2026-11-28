import {mockActivityLogs, mockModeration} from '@/__tests__/fixtures/admin/data';
import {openAdmin} from '../../support/admin';
import {callsTo, t} from '../../support/helpers';

const number = new Intl.NumberFormat('vi');
const card = (titleKey: string) => cy.findByText(t(titleKey)).closest('section');

describe('admin: dashboard', () => {
  it('shows the four key figures', () => {
    openAdmin('/admin/dashboard');

    cy.findByText(number.format(12846)).should('be.visible');
    cy.findByText(number.format(3912)).should('be.visible');
    cy.findByText(number.format(8754)).should('be.visible');
    cy.findByText(number.format(21430)).should('be.visible');
  });

  it('draws the new-users chart with a month per bar, and its table', () => {
    openAdmin('/admin/dashboard');

    // the numbers of the chart are also a table, behind "Show as table"
    cy.findByText(t('admin.common.showTable')).click();
    cy.findByRole('table', {name: t('admin.dashboard.newUsers')}).findAllByRole('row').should('have.length', 12);
  });

  it('ranks the top destinations', () => {
    openAdmin('/admin/dashboard');

    card('admin.dashboard.topDestinations').within(() => {
      cy.findAllByRole('listitem').should('have.length', 5);
      cy.findAllByRole('listitem').first().should('contain.text', 'Đà Lạt');
    });
  });

  it('lists recent activity, with a link to the whole log', () => {
    openAdmin('/admin/dashboard');

    card('admin.dashboard.recentActivity').within(() => {
      cy.findAllByRole('listitem').should('have.length', 6);
      cy.findAllByRole('listitem').first().should('contain.text', mockActivityLogs[0].actor);
      cy.findByRole('link', {name: t('admin.common.viewAll')}).click();
    });

    cy.location('pathname').should('eq', '/admin/activity-logs');
  });

  it('lists what waits for moderation, with a link to it', () => {
    openAdmin('/admin/dashboard');
    const pending = mockModeration.filter(item => item.status === 'pending');

    card('admin.dashboard.pendingModeration').within(() => {
      cy.findByText(pending[0].content).should('be.visible');
      cy.findByText(t('admin.dashboard.pendingCount', {count: pending.length})).should('be.visible');
      cy.findByRole('link', {name: t('admin.common.viewAll')}).click();
    });

    cy.location('pathname').should('eq', '/admin/moderation');
  });

  it('says when nothing waits for moderation', () => {
    openAdmin('/admin/dashboard', {'GET /admin/moderation': mockModeration.map(item => ({...item, status: 'approved'}))});

    cy.findByText(t('admin.moderation.emptyTitle')).should('be.visible');
  });

  it('refreshes the figures', () => {
    const calls = openAdmin('/admin/dashboard');
    cy.findByText(number.format(12846)).should('be.visible');

    cy.findByRole('button', {name: t('admin.common.refresh')}).click();

    cy.wrap(calls).should(list => expect(callsTo(list, 'GET', '/admin/dashboard')).to.have.length(2));
  });

  it('opens on an empty database (no destination yet)', () => {
    const metric = {value: 0, delta: 0};
    openAdmin('/admin/dashboard', {
      'GET /admin/dashboard': {
        stats: {users: metric, trips: metric, challengesCompleted: metric, aiChats: metric, posts: metric, reviews: metric},
        newUsers: [{date: '2026-01-01', value: 0}],
        topDestinations: [],
      },
    });

    cy.findByText(t('admin.dashboard.topDestinations')).should('be.visible');
  });
});
