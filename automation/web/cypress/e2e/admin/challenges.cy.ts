import {mockChallenges} from '@/__tests__/fixtures/admin/data';
import {bodyRows, openAdmin} from '../../support/admin';
import {callsTo, expectCall, expectNoCall, t} from '../../support/helpers';

const challenge = mockChallenges[0];
const saveButton = () => cy.findByRole('button', {name: t('admin.users.dialogs.saveChanges')});

describe('admin: challenges', () => {
  it('shows the totals and the first challenges', () => {
    openAdmin('/admin/challenges');

    cy.findByRole('table', {name: t('admin.challenges.title')}).should('be.visible');
    cy.findByText(t('admin.challenges.stats.total')).should('be.visible');
    bodyRows().should('have.length', 8);
    cy.findByText(t('admin.pagination.summary', {from: 1, to: 8, total: 20})).should('be.visible');
    bodyRows().first().should('contain.text', challenge.nameLocation);
  });

  it('filters by province and searches', () => {
    openAdmin('/admin/challenges');
    bodyRows().should('have.length', 8);

    cy.findByLabelText(t('admin.challenges.columns.province')).pick('Hà Giang');
    bodyRows().should('have.length', mockChallenges.filter(c => c.province === 'Hà Giang').length);

    cy.findByLabelText(t('admin.challenges.columns.province')).pick('all');
    cy.findByRole('searchbox', {name: t('admin.challenges.search')}).type('fansipan');
    bodyRows().should('have.length', 1);
  });

  it('validates the points of a challenge, then saves', () => {
    const calls = openAdmin('/admin/challenges', {
      [`PATCH /admin/challenges/${challenge.id}`]: {...challenge, points: 300},
    });
    cy.findByRole('button', {name: t('admin.common.editItem', {name: challenge.nameLocation})}).click();
    const points = () => cy.findByRole('dialog', {name: t('admin.challenges.edit')}).findByLabelText(t('admin.challenges.columns.points'));

    points().clear().type('5000');
    saveButton().click();
    cy.findByRole('dialog').findByText(t('admin.challenges.errors.points', {max: 1000})).should('be.visible');
    expectNoCall(calls, 'PATCH');

    points().clear().type('300');
    saveButton().click();

    cy.findByText(t('admin.challenges.updated')).should('be.visible');
    expectCall(calls, 'PATCH', `/admin/challenges/${challenge.id}`).its('body').should('deep.equal', {points: 300});
  });

  it('the name is required', () => {
    openAdmin('/admin/challenges');
    cy.findByRole('button', {name: t('admin.common.editItem', {name: challenge.nameLocation})}).click();

    cy.findByRole('dialog', {name: t('admin.challenges.edit')}).findByLabelText(t('admin.challenges.columns.place')).clear();
    saveButton().click();

    cy.findByRole('dialog').findByText(t('admin.challenges.errors.nameRequired')).should('be.visible');
  });

  it('deletes after asking', () => {
    const calls = openAdmin('/admin/challenges', {[`DELETE /admin/challenges/${challenge.id}`]: {message: 'ok'}});

    cy.findByRole('button', {name: t('admin.common.deleteItem', {name: challenge.nameLocation})}).click();
    cy.findByRole('alertdialog', {name: t('admin.challenges.deleteTitle')}).should('be.visible');
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText(t('admin.challenges.deleted', {name: challenge.nameLocation})).should('be.visible');
    cy.wrap(calls).should(list => expect(callsTo(list, 'DELETE', `/admin/challenges/${challenge.id}`)).to.have.length(1));
  });
});
