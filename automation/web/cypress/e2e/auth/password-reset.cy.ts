import {expectCall, expectNoCall, mockApi, reply, t, visit} from '../../support/helpers';

// The code steps (confirm the account / reset the password) and the new password.
const typeCode = (code: string) => {
  // the focus moves to the next box after every digit
  cy.findByLabelText(t('auth.verify.digit', {n: 1})).click();
  cy.focused().type(code);
};

describe('forgot password', () => {
  it('needs an e-mail, and links back to sign-in', () => {
    mockApi();
    visit('/forgot-password');

    cy.findByRole('button', {name: t('auth.forgot.submit')}).click();

    cy.findByText(t('validation.emailRequired')).should('be.visible');
    cy.findByRole('link', {name: t('auth.backToLogin')}).should('have.attr', 'href', '/login');
  });

  it('sends a code and goes to the code step', () => {
    const calls = mockApi({'POST /auth/forgot-password': {message: 'ok'}});
    visit('/forgot-password');

    cy.get('#email').type('lan@x.vn');
    cy.findByRole('button', {name: t('auth.forgot.submit')}).click();

    cy.location('pathname').should('eq', '/refresh-verify-code');
    expectCall(calls, 'POST', '/auth/forgot-password').its('body').should('deep.equal', {email: 'lan@x.vn'});
  });

  it('explains an unknown e-mail', () => {
    mockApi({'POST /auth/forgot-password': reply(401, {message: 'The email is not exist'})});
    visit('/forgot-password');

    cy.get('#email').type('lan@x.vn');
    cy.findByRole('button', {name: t('auth.forgot.submit')}).click();

    cy.findByText(t('auth.forgot.failed')).should('be.visible');
  });
});

describe('code step', () => {
  it('needs all 6 digits', () => {
    const calls = mockApi();
    visit('/verify-account');

    typeCode('123');
    cy.findByRole('button', {name: t('auth.verify.submit')}).click();

    cy.findByText(t('auth.verify.incomplete')).should('be.visible');
    expectNoCall(calls, 'POST');
  });

  it('the digits move on by themselves', () => {
    mockApi();
    visit('/verify-account');

    typeCode('4821');

    cy.findByLabelText(t('auth.verify.digit', {n: 1})).should('have.value', '4');
    cy.findByLabelText(t('auth.verify.digit', {n: 4})).should('have.value', '1');
    cy.findByLabelText(t('auth.verify.digit', {n: 5})).should('have.focus');
  });

  it('confirms the account and goes to sign-in', () => {
    const calls = mockApi({'POST /auth/confirm-account': {message: 'ok'}});
    visit('/verify-account');

    typeCode('123456');
    cy.findByRole('button', {name: t('auth.verify.submit')}).click();

    cy.location('pathname').should('eq', '/login');
    expectCall(calls, 'POST', '/auth/confirm-account').its('body').should('deep.include', {code: '123456'});
  });

  it('explains a wrong code and lets the user try again', () => {
    mockApi({'POST /auth/confirm-account': reply(401, {message: 'Your code is not correct'})});
    visit('/verify-account');

    typeCode('123456');
    cy.findByRole('button', {name: t('auth.verify.submit')}).click();

    cy.findByText(t('auth.verify.wrongCode')).should('be.visible');
    cy.findByRole('button', {name: t('auth.verify.submit')}).should('be.enabled');
  });

  it('the reset code leads to the new password', () => {
    mockApi({'POST /auth/reset-password/123456': {message: 'ok'}});
    visit('/refresh-verify-code');

    typeCode('123456');
    cy.findByRole('button', {name: t('auth.verify.submit')}).click();

    cy.location('pathname').should('eq', '/new-password');
  });
});

describe('new password', () => {
  const fill = (password = 'newpass1', confirm = password) => {
    cy.get('#password').type(password);
    cy.get('#confirmPassword').type(confirm);
    cy.findByRole('button', {name: t('auth.newPassword.submit')}).click();
  };

  it('lists the empty fields after Submit', () => {
    mockApi();
    visit('/new-password');

    cy.findByRole('button', {name: t('auth.newPassword.submit')}).click();

    cy.findByText(t('validation.passwordRequired')).should('be.visible');
    cy.findByText(t('validation.confirmRequired')).should('be.visible');
  });

  it('refuses different passwords', () => {
    mockApi();
    visit('/new-password');

    fill('newpass1', 'newpass2');

    cy.findByText(t('auth.newPassword.mismatch')).should('be.visible');
  });

  it('saves the new password and goes to sign-in', () => {
    const calls = mockApi({'POST /auth/reset-password/': {message: 'ok'}});
    visit('/new-password');

    fill();

    cy.location('pathname').should('eq', '/login');
    expectCall(calls, 'POST', '/auth/reset-password/')
      .its('body')
      .should('deep.include', {password: 'newpass1', confirmPassword: 'newpass1'});
  });

  it('explains an expired reset', () => {
    mockApi({'POST /auth/reset-password/': reply(401, {message: 'Please verify the code sent to your email first'})});
    visit('/new-password');

    fill();

    cy.findByText(t('auth.newPassword.expired')).should('be.visible');
  });
});
