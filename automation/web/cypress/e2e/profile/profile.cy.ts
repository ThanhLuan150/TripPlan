import {adminData} from '../../support/admin';
import {user} from '../../support/fixtures';
import {mockApi, signIn, t, visit} from '../../support/helpers';

describe('profile', () => {
  it("shows the user's name, e-mail and points", () => {
    signIn('user', {...user, experience: 40});
    mockApi();
    visit('/profile');

    cy.findByRole('heading', {name: 'Lan Nguyễn'}).should('be.visible');
    cy.findByText('lan@x.vn').should('be.visible');
    cy.findByText(t('profile.points', {count: 40})).should('be.visible');
  });

  it('shows the initial of the name when there is no photo', () => {
    signIn('user', {fullname: undefined, image: undefined, username: 'minh'});
    mockApi();
    visit('/profile');

    cy.findAllByText('M').first().should('be.visible');
  });

  it('links to the other screens', () => {
    signIn();
    mockApi();
    visit('/profile');

    cy.findByRole('link', {name: t('profile.edit')}).should('have.attr', 'href', '/profile/edit');
    cy.findByRole('link', {name: t('profile.notifications')}).should('have.attr', 'href', '/notification');
    cy.findByRole('link', {name: t('profile.plans')}).should('have.attr', 'href', '/assistant/trips');
    cy.findByRole('link', {name: t('profile.whatIs')}).should('have.attr', 'href', '/what-aloca');
    cy.findByRole('link', {name: t('profile.hotline')}).should('have.attr', 'href', 'tel:19001009');
  });

  it('only an admin sees the link to the admin panel', () => {
    signIn('user');
    mockApi();
    visit('/profile');

    cy.findByRole('heading', {name: 'Lan Nguyễn'}).should('be.visible');
    cy.findByRole('link', {name: t('profile.adminPanel')}).should('not.exist');
  });

  it('an admin can open the admin panel from here', () => {
    signIn('admin');
    mockApi(adminData);
    visit('/profile');

    cy.findByRole('link', {name: t('profile.adminPanel')}).click();

    cy.location('pathname').should('eq', '/admin/dashboard');
  });

  it('changes the language of the app', () => {
    signIn();
    mockApi();
    visit('/profile');
    cy.findByRole('button', {name: t('profile.logout')}).should('be.visible');

    cy.findAllByRole('button', {name: 'EN'}).first().click();

    cy.findByRole('button', {name: 'Sign out'}).should('be.visible');
  });

  it('logs out: clears the session and goes to the landing page', () => {
    signIn();
    mockApi();
    visit('/profile');

    cy.findByRole('button', {name: t('profile.logout')}).click();

    cy.location('pathname').should('eq', '/');
    cy.window().its('localStorage').invoke('getItem', 'user').should('be.null');
    // and the private pages are closed again
    visit('/home');
    cy.location('pathname').should('eq', '/');
  });
});
