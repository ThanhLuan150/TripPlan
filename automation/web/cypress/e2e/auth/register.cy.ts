import {expectCall, expectNoCall, mockApi, RED_BORDER, reply, t, visit} from '../../support/helpers';

const fill = (confirm = 'secret1') => {
  cy.get('#email').type('lan@x.vn');
  cy.get('#username').type('traveler');
  cy.get('#password').type('secret1');
  cy.get('#confirmPassword').type(confirm);
  cy.findByRole('button', {name: t('auth.register.submit')}).click();
};

describe('register', () => {
  it('lists the empty fields after Submit', () => {
    mockApi();
    visit('/registration');

    cy.findByRole('button', {name: t('auth.register.submit')}).click();

    cy.findByText(t('validation.emailRequired')).should('be.visible');
    cy.findByText(t('validation.usernameRequired')).should('be.visible');
    cy.findByText(t('validation.passwordRequired')).should('be.visible');
    cy.findByText(t('validation.confirmRequired')).should('be.visible');
  });

  it('validates the e-mail when the field is left', () => {
    mockApi();
    visit('/registration');

    cy.get('#email').type('nope');
    cy.get('#username').focus();

    cy.findByText(t('validation.emailInvalid')).should('be.visible');
    cy.get('#email').should('have.css', 'border-top-color', RED_BORDER);
  });

  it('refuses different passwords', () => {
    const calls = mockApi();
    visit('/registration');

    fill('secret2');

    cy.findByText(t('auth.register.passwordMismatch')).should('be.visible');
    expectNoCall(calls, 'POST', '/auth/register');
  });

  it('registers and asks for the code sent by e-mail', () => {
    const calls = mockApi({'POST /auth/register': {message: 'ok'}});
    visit('/registration');

    fill();

    cy.location('pathname').should('eq', '/verify-account');
    expectCall(calls, 'POST', '/auth/register')
      .its('body')
      .should('deep.equal', {email: 'lan@x.vn', username: 'traveler', password: 'secret1', confirmPassword: 'secret1'});
    // the next step says where the code was sent
    cy.findByText('lan@x.vn').should('be.visible');
  });

  [
    ['e-mail already used', reply(401, {message: 'Username or email already exist', field: 'email'}), 'auth.register.emailTaken'],
    ['username already used', reply(401, {message: 'Username or email already exist', field: 'username'}), 'auth.register.usernameTaken'],
    ['server error', reply(500), 'auth.register.failed'],
  ].forEach(([label, response, message]) => {
    it(`explains a failure: ${label as string}`, () => {
      mockApi({'POST /auth/register': response});
      visit('/registration');

      fill();

      cy.findByText(t(message as string)).should('be.visible');
      cy.location('pathname').should('eq', '/registration');
    });
  });
});
