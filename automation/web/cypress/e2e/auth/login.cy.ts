import {adminData} from '../../support/admin';
import {expectCall, mockApi, RED_BORDER, reply, t, visit} from '../../support/helpers';

// Login form: Formik + Yup validation, the same error line and red border as
// every other form.
describe('login', () => {
  it('shows an error under each empty field, and the red border, after Submit', () => {
    mockApi();
    visit('/login');

    cy.findByRole('button', {name: t('auth.login.submit')}).click();

    cy.findByText(t('validation.usernameRequired')).should('be.visible');
    cy.findByText(t('validation.passwordRequired')).should('be.visible');
    cy.get('#username').should('have.css', 'border-top-color', RED_BORDER);
    cy.get('#password').should('have.css', 'border-top-color', RED_BORDER);
  });

  it('shows nothing for a field that was only passed through', () => {
    mockApi();
    visit('/login');

    cy.get('#username').focus();
    cy.get('#password').focus();
    cy.get('#username').focus();

    cy.findByText(t('validation.usernameRequired')).should('not.exist');
    cy.get('#username').should('not.have.css', 'border-top-color', RED_BORDER);
  });

  it('checks the length of the username when it is left, then clears the error', () => {
    mockApi();
    visit('/login');

    cy.get('#username').type('abc');
    cy.get('#password').focus();
    cy.findByText(t('validation.usernameMin')).should('be.visible');

    cy.get('#username').clear().type('traveler');
    cy.findByText(t('validation.usernameMin')).should('not.exist');
    cy.get('#username').should('not.have.css', 'border-top-color', RED_BORDER);
  });

  it('the eye button shows and hides the password', () => {
    mockApi();
    visit('/login');

    cy.get('#password').should('have.attr', 'type', 'password');
    cy.findByRole('button', {name: t('auth.showPassword')}).click();
    cy.get('#password').should('have.attr', 'type', 'text');
    cy.findByRole('button', {name: t('auth.hidePassword')}).click();
    cy.get('#password').should('have.attr', 'type', 'password');
  });

  it('signs in and opens the home page', () => {
    const calls = mockApi({
      'POST /auth/login': {accessToken: 'tok', data: {username: 'traveler', role: 'user'}},
    });
    visit('/login');

    cy.get('#username').type('traveler');
    cy.get('#password').type('secret1');
    cy.findByRole('button', {name: t('auth.login.submit')}).click();

    cy.location('pathname').should('eq', '/home');
    expectCall(calls, 'POST', '/auth/login').its('body').should('deep.equal', {username: 'traveler', password: 'secret1'});
    cy.window().its('localStorage').invoke('getItem', 'AccessToken').should('eq', 'tok');
  });

  it('an admin lands in the admin panel', () => {
    mockApi({...adminData, 'POST /auth/login': {accessToken: 'tok', data: {username: 'boss', role: 'admin'}}});
    visit('/login');

    cy.get('#username').type('boss12');
    cy.get('#password').type('secret1');
    cy.findByRole('button', {name: t('auth.login.submit')}).click();

    cy.location('pathname').should('eq', '/admin/dashboard');
  });

  [
    ['wrong password', reply(401, {message: 'Wrong password'}), 'auth.login.wrongCredentials'],
    ['unknown user', reply(404, {message: 'Not found'}), 'auth.login.wrongCredentials'],
    ['unverified account', reply(401, {message: 'Unverified account'}), 'auth.login.unverified'],
    ['server error', reply(500, {message: 'boom'}), 'auth.login.failed'],
  ].forEach(([label, response, message]) => {
    it(`explains a failed sign-in: ${label as string}`, () => {
      mockApi({'POST /auth/login': response});
      visit('/login');

      cy.get('#username').type('traveler');
      cy.get('#password').type('secret1');
      cy.findByRole('button', {name: t('auth.login.submit')}).click();

      cy.findByText(t(message as string)).should('be.visible');
      cy.location('pathname').should('eq', '/login');
    });
  });

  it('links to the other auth pages', () => {
    mockApi();
    visit('/login');

    cy.findByRole('link', {name: t('auth.login.forgot')}).click();
    cy.location('pathname').should('eq', '/forgot-password');

    visit('/login');
    cy.findByRole('link', {name: t('auth.login.signUp')}).click();
    cy.location('pathname').should('eq', '/registration');
  });
});
