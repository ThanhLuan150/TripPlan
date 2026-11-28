import {user} from '../../support/fixtures';
import {expectCall, expectNoCall, mockApi, signIn, t, visit} from '../../support/helpers';

const category = (key: string) => cy.findByRole('button', {name: t(`profile.preferences.category.${key}`)});
const empty = {preferences: {categories: [], notes: '', updatedAt: null}};
const stored = {preferences: {categories: ['nature', 'food'], notes: 'ít người', updatedAt: '2026-03-01T00:00:00.000Z'}};

describe('travel preferences', () => {
  beforeEach(() => {
    signIn('user', user);
  });

  it('is reached from the profile page', () => {
    mockApi();
    visit('/profile');

    cy.findByRole('link', {name: t('profile.preferences.link')}).click();
    cy.location('pathname').should('eq', '/profile/preferences');
  });

  it('shows the five groups, none chosen, when nothing is saved', () => {
    mockApi({'GET /user/preferences': empty});
    visit('/profile/preferences');

    ['nature', 'food', 'culture', 'shopping', 'discovery'].forEach(key => category(key).should('have.attr', 'aria-pressed', 'false'));
    cy.findByRole('button', {name: t('profile.preferences.delete')}).should('not.exist');
  });

  it('saves the chosen groups and the note', () => {
    const calls = mockApi({
      'GET /user/preferences': empty,
      'PUT /user/preferences': {message: 'ok', preferences: {categories: ['culture'], notes: 'di tích', updatedAt: 'x'}},
    });
    visit('/profile/preferences');

    category('culture').click().should('have.attr', 'aria-pressed', 'true');
    cy.findByLabelText(t('profile.preferences.notes')).type('di tích');
    cy.findByRole('button', {name: t('profile.save')}).click();

    expectCall(calls, 'PUT', '/user/preferences').its('body').should('deep.eq', {categories: ['culture'], notes: 'di tích'});
    cy.findByText(t('profile.preferences.saved')).should('be.visible');
  });

  it('does not save an empty form', () => {
    const calls = mockApi({'GET /user/preferences': empty});
    visit('/profile/preferences');

    cy.findByRole('button', {name: t('profile.save')}).click();

    cy.findByText(t('profile.preferences.errors.empty')).should('be.visible');
    expectNoCall(calls, 'PUT', '/user/preferences');
  });

  it('starts from the saved preferences and lets the user unselect a group', () => {
    const calls = mockApi({'GET /user/preferences': stored, 'PUT /user/preferences': {message: 'ok', preferences: stored.preferences}});
    visit('/profile/preferences');

    category('nature').should('have.attr', 'aria-pressed', 'true');
    category('food').click().should('have.attr', 'aria-pressed', 'false');
    cy.findByRole('button', {name: t('profile.save')}).click();

    expectCall(calls, 'PUT', '/user/preferences').its('body').should('deep.eq', {categories: ['nature'], notes: 'ít người'});
  });

  it('asks for confirmation before deleting', () => {
    const calls = mockApi({'GET /user/preferences': stored, 'DELETE /user/preferences': {message: 'ok', ...empty}});
    visit('/profile/preferences');

    cy.findByRole('button', {name: t('profile.preferences.delete')}).click();
    cy.findByText(t('profile.preferences.deleteTitle')).should('be.visible');
    cy.findByRole('button', {name: t('common.cancel')}).click();
    expectNoCall(calls, 'DELETE', '/user/preferences');

    cy.findByRole('button', {name: t('profile.preferences.delete')}).click();
    cy.findByRole('button', {name: t('common.delete')}).click();

    expectCall(calls, 'DELETE', '/user/preferences');
    cy.findByText(t('profile.preferences.deleted')).should('be.visible');
    category('nature').should('have.attr', 'aria-pressed', 'false');
  });
});
