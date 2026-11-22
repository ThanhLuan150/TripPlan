import {trips} from '../../support/fixtures';
import {callsTo, expectCall, expectNoCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

describe('trip list', () => {
  beforeEach(() => {
    signIn();
  });

  it('lists the active trips, newest first, with their dates', () => {
    mockApi({'GET /trip-plan/get-trip': {dataTrip: trips}});
    visit('/assistant/trips');

    cy.findByText('Biển Nha Trang').should('be.visible');
    cy.findByText('Đà Lạt mộng mơ').should('be.visible');
    // a deleted trip is not shown
    cy.findByText('Đã xoá').should('not.exist');
    cy.findByRole('heading', {level: 2}).should('contain.text', '(2)');
    cy.findByText('10/5 - 12/5').should('be.visible');
    cy.get('[role="link"]').then($links => {
      const names = [...$links].map(link => link.textContent ?? '');
      expect(names.findIndex(text => text.includes('Nha Trang'))).to.be.lessThan(names.findIndex(text => text.includes('Đà Lạt')));
    });
  });

  it('opens a trip on click', () => {
    mockApi({
      'GET /trip-plan/get-trip': {dataTrip: trips},
      'GET /trip-plan/get-trip/t3': {tripDatas: {location: 'Khánh Hòa', startDate: '2026-05-10T00:00:00', endDate: '2026-05-12T00:00:00', dataTripDays: []}},
    });
    visit('/assistant/trips');

    cy.findByText('Biển Nha Trang').click();

    cy.location('pathname').should('eq', '/assistant/trips/t3');
  });

  it('starts a new plan from the "add" card', () => {
    mockApi({'GET /trip-plan/get-trip': {dataTrip: trips}});
    visit('/assistant/trips');

    cy.findByRole('link', {name: new RegExp(t('trips.list.add'))}).click();

    cy.location('pathname').should('eq', '/assistant/trips/new');
  });

  it('deletes a trip after confirmation and reloads the list', () => {
    let remaining = [...trips];
    const calls = mockApi({
      'GET /trip-plan/get-trip': () => ({dataTrip: remaining}),
      'DELETE /trip-plan/t1': () => {
        remaining = remaining.filter(trip => trip._id !== 't1');
        return {message: 'ok'};
      },
    });
    visit('/assistant/trips');

    cy.findByRole('button', {name: t('trips.list.deleteLabel', {name: 'Đà Lạt mộng mơ'})}).click();
    cy.findByRole('dialog').should('contain.text', t('trips.list.deleteConfirm', {name: 'Đà Lạt mộng mơ'}));
    cy.findByRole('dialog').findByRole('button', {name: t('common.delete')}).click();

    cy.findByText('Đà Lạt mộng mơ').should('not.exist');
    cy.findByText('Biển Nha Trang').should('be.visible');
    expectCall(calls, 'DELETE', '/trip-plan/t1');
  });

  it('the deletion can be cancelled', () => {
    const calls = mockApi({'GET /trip-plan/get-trip': {dataTrip: trips}});
    visit('/assistant/trips');

    cy.findByRole('button', {name: t('trips.list.deleteLabel', {name: 'Biển Nha Trang'})}).click();
    cy.findByRole('button', {name: t('common.cancel')}).click();

    cy.findByRole('dialog').should('not.exist');
    cy.findByText('Biển Nha Trang').should('be.visible');
    expectNoCall(calls, 'DELETE');
  });

  it('tells when a deletion failed', () => {
    mockApi({'GET /trip-plan/get-trip': {dataTrip: trips}, 'DELETE /trip-plan/t3': reply(500)});
    visit('/assistant/trips');

    cy.findByRole('button', {name: t('trips.list.deleteLabel', {name: 'Biển Nha Trang'})}).click();
    cy.findByRole('dialog').findByRole('button', {name: t('common.delete')}).click();

    cy.findByText(t('trips.list.deleteFailed')).should('be.visible');
  });

  it('shows the empty state when there is no active trip', () => {
    mockApi({'GET /trip-plan/get-trip': {dataTrip: [trips[1]]}});
    visit('/assistant/trips');

    cy.findByText(t('trips.list.emptyTitle')).should('be.visible');
  });

  it('"refresh" loads the list again', () => {
    const calls = mockApi({'GET /trip-plan/get-trip': {dataTrip: trips}});
    visit('/assistant/trips');
    cy.findByText('Biển Nha Trang').should('be.visible');

    cy.findByRole('button', {name: t('common.refresh')}).click();

    cy.wrap(calls).should(list => expect(callsTo(list, 'GET', '/trip-plan/get-trip')).to.have.length(2));
  });
});
