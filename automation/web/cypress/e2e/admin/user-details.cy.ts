import {mockTrips, mockUsers} from '@/__tests__/fixtures/admin/data';
import {openAdmin} from '../../support/admin';
import {callsTo, reply, t} from '../../support/helpers';

const [, , second, , suspended] = mockUsers;
const at = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

const detail = (extra: Record<string, unknown> = {}, who = second) => ({
  user: who,
  aiConversations: 4,
  trips: [{...mockTrips[0], imageUrl: ''}],
  challenges: [
    {id: 'c1', name: 'Hồ Gươm', location: 'Hà Nội', points: 50, completed: true, joinedAt: at(5), completedAt: at(2)},
    {id: 'c2', name: 'Sa Pa', location: 'Lào Cai', points: 80, completed: false, joinedAt: at(1), completedAt: null},
  ],
  activity: [{id: 'l1', at: at(1), action: 'login', target: '', level: 'info'}],
  ...extra,
});

const heading = (who = second) => cy.findByRole('heading', {level: 1, name: who.fullname});
const tab = (key: string) => cy.findByRole('tab', {name: t(`admin.users.tabs.${key}`)});

describe('admin: user profile', () => {
  it('shows the profile header and the statistics', () => {
    openAdmin(`/admin/users/${second.id}`, {[`GET /admin/users/${second.id}`]: detail()});

    heading().should('be.visible');
    cy.findByRole('link', {name: t('admin.users.backToUsers')}).should('have.attr', 'href', '/admin/users');
    cy.findByRole('region', {name: t('admin.users.statistics')}).within(() => {
      cy.findByText(t('admin.users.stats.totalTrips')).should('be.visible');
      cy.findByText(t('admin.users.stats.aiConversations')).should('be.visible');
    });
  });

  it('switches between the four tabs, also with the arrow keys', () => {
    openAdmin(`/admin/users/${second.id}`, {[`GET /admin/users/${second.id}`]: detail()});
    heading().should('be.visible');

    tab('overview').should('have.attr', 'aria-selected', 'true');
    cy.findByText(t('admin.users.basicInfo')).should('be.visible');

    tab('trips').click();
    cy.findByText(mockTrips[0].nameTrip).should('be.visible');

    tab('challenges').click();
    cy.findByText('Hồ Gươm').should('be.visible');

    tab('activity').click();
    cy.findByText(t('admin.activityLogs.actions.login')).should('be.visible');

    cy.focused().type('{rightarrow}');
    tab('overview').should('have.attr', 'aria-selected', 'true');
  });

  it('shows empty states for a user without trips or challenges', () => {
    openAdmin(`/admin/users/${second.id}`, {[`GET /admin/users/${second.id}`]: detail({trips: [], challenges: []})});
    heading().should('be.visible');

    tab('trips').click();
    cy.findByText(t('admin.users.trips.empty')).should('be.visible');
    tab('challenges').click();
    cy.findAllByText(t('admin.users.challenges.empty')).first().should('be.visible');
  });

  it('shows why an account is suspended and reactivates it', () => {
    const blocked = {...suspended, suspendReason: 'Spam links', suspendedAt: at(2)};
    const calls = openAdmin(`/admin/users/${blocked.id}`, {
      [`GET /admin/users/${blocked.id}`]: detail({}, blocked),
      [`PATCH /admin/users/${blocked.id}`]: {...blocked, status: 'active'},
    });

    cy.contains('Spam links').should('be.visible');
    cy.findByRole('button', {name: t('admin.users.reactivateAccount')}).click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.users.dialogs.confirmReactivation')}).click();

    cy.wrap(calls).should(list => expect(callsTo(list, 'PATCH', `/admin/users/${blocked.id}`)).to.have.length(1));
  });

  it('goes back to the list after the account is deleted', () => {
    openAdmin(`/admin/users/${second.id}`, {
      [`GET /admin/users/${second.id}`]: detail(),
      [`PATCH /admin/users/${second.id}`]: {...second, status: 'delete'},
    });
    heading().should('be.visible');

    cy.findByRole('button', {name: t('admin.users.moreActions', {name: second.fullname})}).click();
    cy.findByRole('menuitem', {name: t('admin.users.deleteAccount')}).click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.users.deleteAccount')}).click();

    cy.location('pathname').should('eq', '/admin/users');
  });

  it('says when the user does not exist', () => {
    openAdmin('/admin/users/nobody', {'GET /admin/users/nobody': reply(404, {message: 'User not found'})});

    cy.findByText(t('admin.users.notFound'), {timeout: 20_000}).should('be.visible');
    cy.findByRole('link', {name: t('admin.users.backToUsers')}).should('be.visible');
  });
});
