import {mockApi, signIn, t, visit} from '../support/helpers';

describe('about pages', () => {
  beforeEach(() => {
    signIn();
    mockApi();
  });

  it('"What is Aloca" explains the app', () => {
    visit('/what-aloca');

    cy.findByRole('heading', {name: t('about.whatHeading')}).should('be.visible');
    cy.findAllByRole('listitem').should('have.length', 3);
  });

  it('the benefits page opens from the account and has a back button', () => {
    visit('/profile');
    cy.findByText(t('profile.genzTitle')).click();

    cy.findByRole('heading', {name: t('about.benefitHeading')}).should('be.visible');
    cy.findByRole('heading', {name: t('about.benefit2Title')}).should('be.visible');
    cy.findByRole('button', {name: t('common.back')}).click();
    cy.location('pathname').should('eq', '/profile');
  });
});
