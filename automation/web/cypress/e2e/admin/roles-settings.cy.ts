import {mockRoles} from '@/__tests__/fixtures/admin/data';
import {openAdmin} from '../../support/admin';
import {callsTo, expectCall, expectNoCall, reply, t} from '../../support/helpers';

describe('admin: roles', () => {
  it('describes both roles with their members and permissions', () => {
    openAdmin('/admin/roles');

    cy.findAllByRole('heading', {level: 2}).first().should('contain.text', t('admin.roles.admin'));
    cy.findAllByRole('heading', {level: 2}).eq(1).should('contain.text', t('admin.roles.user'));
    cy.findAllByText(String(mockRoles.members.user)).first().should('be.visible');
    cy.findByText(t('admin.rolesPage.readOnly')).should('be.visible');
  });

  it('draws the permission matrix', () => {
    openAdmin('/admin/roles');

    cy.findByRole('table', {name: t('admin.rolesPage.matrix')}).within(() => {
      cy.findAllByRole('row').should('have.length', 11);
      // admin: 10 permissions, user: 5
      cy.findAllByText(t('admin.rolesPage.allowed')).should('have.length', 15);
      cy.findAllByText(t('admin.rolesPage.notAllowed')).should('have.length', 5);
    });
  });
});

describe('admin: settings', () => {
  const field = (key: string) => cy.findByLabelText(t(`admin.settings.fields.${key}`));
  const save = () => cy.findByRole('button', {name: t('admin.settings.save')});
  const undo = () => cy.findByRole('button', {name: t('admin.settings.reset')});

  it('shows the settings of the backend; Save and Undo wait for a change', () => {
    openAdmin('/admin/settings');

    field('appName').should('have.value', 'Aloca');
    field('supportEmail').should('have.value', 'support@example.com');
    field('hotline').should('have.value', '19001009');
    save().should('be.disabled');
    undo().should('be.disabled');
    cy.findByText(t('admin.settings.saved')).should('be.visible');
  });

  it('edits a field, then undoes it', () => {
    openAdmin('/admin/settings');

    field('appName').clear().type('Aloca Travel');
    cy.findByText(t('admin.settings.unsaved')).should('be.visible');
    save().should('be.enabled');

    undo().click();

    field('appName').should('have.value', 'Aloca');
    save().should('be.disabled');
  });

  it('puts back a value and nothing is "changed" any more', () => {
    openAdmin('/admin/settings');

    field('hotline').clear().type('190010091');
    save().should('be.enabled');
    field('hotline').clear().type('19001009');

    save().should('be.disabled');
  });

  it('validates every field before saving, with the red border', () => {
    const calls = openAdmin('/admin/settings');

    field('appName').clear();
    field('supportEmail').clear().type('nope');
    field('hotline').clear().type('abc');
    save().click();

    cy.findByText(t('admin.settings.errors.appName')).should('be.visible');
    cy.findByText(t('admin.settings.errors.email')).should('be.visible');
    cy.findByText(t('admin.settings.errors.hotline')).should('be.visible');
    field('appName').should('have.attr', 'aria-invalid', 'true');
    expectNoCall(calls, 'PUT');
  });

  it('saves to the backend and shows the saved values', () => {
    const calls = openAdmin('/admin/settings', {
      'PUT /admin/settings': {appName: 'Aloca Travel', supportEmail: 'help@aloca.vn', hotline: '1900'},
    });

    field('appName').clear().type(' Aloca Travel ');
    field('supportEmail').clear().type('help@aloca.vn');
    field('hotline').clear().type('1900');
    save().click();

    cy.findByText(t('admin.settings.savedToast')).should('be.visible');
    save().should('be.disabled');
    expectCall(calls, 'PUT', '/admin/settings')
      .its('body')
      .should('deep.equal', {appName: 'Aloca Travel', supportEmail: 'help@aloca.vn', hotline: '1900'});
  });

  it('shows the message of the backend when saving fails, and keeps the edits', () => {
    openAdmin('/admin/settings', {'PUT /admin/settings': reply(400, {message: 'Invalid supportEmail'})});

    field('hotline').clear().type('1900100');
    save().click();

    cy.findByRole('alert').should('contain.text', 'Invalid supportEmail');
    save().should('be.enabled');
  });

  it('offers a retry when the settings cannot be loaded', () => {
    let attempts = 0;
    const calls = openAdmin('/admin/settings', {
      'GET /admin/settings': () => {
        attempts += 1;
        // the app retries a failing request 3 times before showing the error
        return attempts <= 4 ? reply(500) : {appName: 'Aloca', supportEmail: '', hotline: ''};
      },
    });

    cy.findByRole('button', {name: t('admin.common.refresh')}).click();

    field('appName').should('have.value', 'Aloca');
    cy.wrap(calls).should(list => expect(callsTo(list, 'GET', '/admin/settings').length).to.be.greaterThan(4));
  });
});
