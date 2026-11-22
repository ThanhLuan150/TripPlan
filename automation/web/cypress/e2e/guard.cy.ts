import {adminData} from '../support/admin';
import {mockApi, signIn, visit} from '../support/helpers';

// Route guards: who may open which part of the app.
describe('access control', () => {
  ['/home', '/assistant/chat', '/assistant/trips', '/ranking', '/profile', '/profile/edit', '/notification', '/videos'].forEach(path => {
    it(`a visitor opening ${path} is sent to the landing page`, () => {
      mockApi();
      visit(path);

      cy.location('pathname').should('eq', '/');
    });
  });

  it('a visitor cannot open the admin panel', () => {
    mockApi();
    visit('/admin/users');

    cy.location('pathname').should('eq', '/');
  });

  it('a normal user opening the admin panel is sent home', () => {
    signIn('user');
    mockApi();
    visit('/admin/dashboard');

    cy.location('pathname').should('eq', '/home');
  });

  it('an admin can open the admin panel', () => {
    signIn('admin');
    mockApi(adminData);
    visit('/admin/users');

    cy.location('pathname').should('eq', '/admin/users');
  });
});
