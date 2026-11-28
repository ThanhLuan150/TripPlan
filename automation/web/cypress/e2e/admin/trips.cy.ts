import {mockTrips} from '@/__tests__/fixtures/admin/data';
import {bodyRows, openAdmin} from '../../support/admin';
import {callsTo, expectNoCall, reply, t} from '../../support/helpers';

const trip = mockTrips[0];
// a deleted plan is not listed unless the status filter asks for it
const active = mockTrips.filter(item => item.status === 'active').length;

describe('admin: trips', () => {
  it('lists the trips with their place, owner and status', () => {
    openAdmin('/admin/trips');

    cy.findByRole('table', {name: t('admin.trips.title')}).should('be.visible');
    bodyRows().should('have.length', 8);
    cy.findByText(t('admin.pagination.summary', {from: 1, to: 8, total: active})).should('be.visible');
    bodyRows().first().should('contain.text', trip.nameTrip).and('contain.text', trip.owner);
  });

  it('searches by trip, destination and owner', () => {
    openAdmin('/admin/trips');
    bodyRows().should('have.length', 8);

    cy.findByRole('searchbox', {name: t('admin.trips.search')}).type(trip.owner);

    bodyRows().first().should('contain.text', trip.nameTrip);
    bodyRows().should('have.length.lessThan', 8);
  });

  it('filters by destination', () => {
    openAdmin('/admin/trips');
    bodyRows().should('have.length', 8);
    const inPlace = mockTrips.filter(item => item.location === trip.location).length;

    cy.findByLabelText(t('admin.trips.destination')).pick(trip.location);

    bodyRows().should('have.length', Math.min(8, inPlace));
  });

  it('says so when nothing matches', () => {
    openAdmin('/admin/trips');
    bodyRows().should('have.length', 8);

    cy.findByRole('searchbox', {name: t('admin.trips.search')}).type('khong co chuyen di nao');

    cy.findByText(t('admin.common.noResults')).should('be.visible');
  });

  it('goes to the second page', () => {
    openAdmin('/admin/trips');
    bodyRows().should('have.length', 8);

    cy.findByRole('button', {name: t('admin.pagination.next')}).click();

    cy.findByText(t('admin.pagination.summary', {from: 9, to: 16, total: active})).should('be.visible');
  });

  it('opens the details of a trip', () => {
    openAdmin('/admin/trips', {
      [`GET /admin/trips/${trip.id}`]: {...trip, ownerId: 'u1', plan: [{id: 'd1', day: 1, date: null, title: 'Dạo phố', imageUrl: '', cost: 1000}]},
    });

    cy.findByRole('button', {name: t('admin.common.viewItem', {name: trip.nameTrip})}).click();

    cy.findByRole('dialog', {name: trip.nameTrip}).within(() => {
      cy.findByText('Dạo phố').should('be.visible');
      cy.findAllByRole('button', {name: t('common.close')}).first().click();
    });
    cy.findByRole('dialog').should('not.exist');
  });

  it('asks before deleting, and deletes', () => {
    const calls = openAdmin('/admin/trips', {[`DELETE /admin/trips/${trip.id}`]: {message: 'ok'}});
    const deleteButton = () => cy.findByRole('button', {name: t('admin.common.deleteItem', {name: trip.nameTrip})});

    deleteButton().click();
    cy.findByRole('alertdialog', {name: t('admin.trips.deleteTitle')})
      .should('contain.text', t('admin.trips.deleteText', {name: trip.nameTrip}))
      .findByRole('button', {name: t('common.cancel')})
      .click();
    expectNoCall(calls, 'DELETE');

    deleteButton().click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText(t('admin.trips.deleted', {name: trip.nameTrip})).should('be.visible');
    cy.wrap(calls).should(list => expect(callsTo(list, 'DELETE', `/admin/trips/${trip.id}`)).to.have.length(1));
  });

  it('shows the message of the backend when deleting fails', () => {
    openAdmin('/admin/trips', {[`DELETE /admin/trips/${trip.id}`]: reply(409, {message: 'Not allowed'})});

    cy.findByRole('button', {name: t('admin.common.deleteItem', {name: trip.nameTrip})}).click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText('Not allowed').should('be.visible');
  });
});

