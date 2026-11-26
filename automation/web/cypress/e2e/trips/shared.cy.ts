import {expectNoCall, mockApi, reply, t, visit} from '../../support/helpers';

const shared = {
  tripDatas: {
    nameTrip: 'Đà Lạt 3 ngày',
    location: 'Lâm Đồng',
    startDate: '2026-03-02T09:00:00',
    endDate: '2026-03-04T09:00:00',
    dataTripDays: [
      {
        title: 'Trung tâm Đà Lạt',
        date: '2026-03-02T09:00:00',
        transportCost: 100000,
        foodCost: 200000,
        challenges: [{_id: 'c1', challengeSummary: 'Chụp ảnh Hồ Xuân Hương', location: 'Hồ Xuân Hương', points: 20}],
      },
    ],
  },
};

// Public page behind a share link: no sign-in, read only.
describe('shared trip', () => {
  it('a visitor who is not signed in sees the plan, read only', () => {
    const calls = mockApi({'GET /shared/tok123': shared});
    visit('/shared/tok123');

    cy.location('pathname').should('eq', '/shared/tok123'); // not sent to the landing page
    cy.findByRole('heading', {name: 'Đà Lạt 3 ngày'}).should('be.visible');
    cy.findByText(t('trips.shared.readOnly')).should('be.visible');
    cy.findByText('Chụp ảnh Hồ Xuân Hương').should('be.visible');
    cy.findByRole('button').should('not.exist');
    expectNoCall(calls, 'POST');
    expectNoCall(calls, 'DELETE');
  });

  it('an invalid or revoked link says it does not work', () => {
    mockApi({'GET /shared/old': reply(404, {message: 'This shared link is invalid or has been turned off'})});
    visit('/shared/old');

    cy.findByText(t('trips.shared.invalidTitle')).should('be.visible');
    cy.findByRole('link', {name: t('trips.shared.goHome')}).should('be.visible');
  });
});

// Public page of a trip its owner made public: no sign-in, read only.
describe('public trip', () => {
  it('a visitor who is not signed in sees the plan, read only', () => {
    const calls = mockApi({'GET /public-trip/t1': shared});
    visit('/trip/t1');

    cy.location('pathname').should('eq', '/trip/t1'); // not sent to the landing page
    cy.findByRole('heading', {name: 'Đà Lạt 3 ngày'}).should('be.visible');
    cy.findByText(t('trips.publicTrip.readOnly')).should('be.visible');
    cy.findByText('Chụp ảnh Hồ Xuân Hương').should('be.visible');
    cy.findByRole('button').should('not.exist');
    expectNoCall(calls, 'POST');
    expectNoCall(calls, 'PUT');
    expectNoCall(calls, 'DELETE');
  });

  it('a private, deleted or unknown plan says it is not available', () => {
    mockApi({'GET /public-trip/t2': reply(404, {message: 'Data Trip not found!'})});
    visit('/trip/t2');

    cy.findByText(t('trips.publicTrip.invalidTitle')).should('be.visible');
  });
});
