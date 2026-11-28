import {expectCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

const card = (id: string, nameTrip: string) => ({
  _id: id,
  nameTrip,
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-04T09:00:00',
  transportCostTotal: 100000,
  foodCostTotal: 200000,
  otherCostTotal: 50000,
});

const publicTrip = {
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

describe('explore public trips', () => {
  beforeEach(() => {
    signIn();
  });

  it('lists public plans in the Explore tab and opens one', () => {
    mockApi({
      'GET /public-trip': {page: 1, limit: 12, total: 2, items: [card('a1', 'Đà Lạt 3 ngày'), card('b2', 'Huế 2 ngày')]},
      'GET /public-trip/a1': publicTrip,
    });
    visit('/explore');

    cy.findByRole('link', {name: t('nav.explore')}).should('have.attr', 'aria-current', 'page');
    cy.findByText('Huế 2 ngày').should('be.visible');
    cy.findAllByText(t('trips.explore.cost', {amount: '350.000'})).should('have.length', 2);

    cy.findByRole('link', {name: /Đà Lạt 3 ngày/}).click();
    cy.location('pathname').should('eq', '/trip/a1');
    cy.findByText(t('trips.publicTrip.readOnly')).should('be.visible');
  });

  it('says so when there is nothing public yet', () => {
    mockApi({'GET /public-trip': {page: 1, limit: 12, total: 0, items: []}});
    visit('/explore');

    cy.findByText(t('trips.explore.empty')).should('be.visible');
  });

  it('a signed-in user keeps a private copy of a public plan', () => {
    const calls = mockApi({
      'GET /public-trip/a1': publicTrip,
      'POST /public-trip/a1/copy': {tripId: 'n1', nameTrip: 'Đà Lạt 3 ngày (bản sao)'},
    });
    visit('/trip/a1');

    cy.findByRole('button', {name: t('trips.publicTrip.saveCopy')}).click();

    expectCall(calls, 'POST', '/public-trip/a1/copy');
    cy.location('pathname').should('eq', '/assistant/trips/n1');
  });

  it('tells the user when the plan can no longer be saved', () => {
    mockApi({
      'GET /public-trip/a1': publicTrip,
      'POST /public-trip/a1/copy': reply(404, {message: 'Data Trip not found!'}),
    });
    visit('/trip/a1');

    cy.findByRole('button', {name: t('trips.publicTrip.saveCopy')}).click();

    cy.findByText(t('trips.publicTrip.saveFailed')).should('be.visible');
    cy.location('pathname').should('eq', '/trip/a1');
  });
});

describe('public plan, signed out', () => {
  it('offers to sign in instead of saving', () => {
    mockApi({'GET /public-trip/a1': publicTrip});
    visit('/trip/a1');

    cy.findByRole('link', {name: t('trips.publicTrip.signInToSave')}).should('have.attr', 'href', '/login');
    cy.findByRole('button').should('not.exist');
  });
});
