import {adminData} from '../../support/admin';
import {mockApi, signIn, t, visit} from '../../support/helpers';

// Landing page: the first screen, shown on every visit.
describe('landing page', () => {
  it('a visitor starts on the sign-in page', () => {
    mockApi();
    visit('/');

    cy.findByText(t('auth.landing.description')).should('be.visible');
    cy.findByRole('button', {name: t('auth.landing.start')}).click();

    cy.location('pathname').should('eq', '/login');
  });

  it('a signed-in user goes straight home', () => {
    signIn();
    mockApi();
    visit('/');

    cy.findByRole('button', {name: t('auth.landing.start')}).click();

    cy.location('pathname').should('eq', '/home');
  });

  it('an admin goes to the admin panel', () => {
    signIn('admin');
    mockApi(adminData);
    visit('/');

    cy.findByRole('button', {name: t('auth.landing.start')}).click();

    cy.location('pathname').should('eq', '/admin/dashboard');
  });

  it('an unknown address goes back to the landing page', () => {
    mockApi();
    visit('/no-such-page');

    cy.location('pathname').should('eq', '/');
  });
});
