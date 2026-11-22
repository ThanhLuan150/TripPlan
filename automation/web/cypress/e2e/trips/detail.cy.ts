import {tripDetail, trips} from '../../support/fixtures';
import {mockApi, reply, signIn, t, visit} from '../../support/helpers';

const api = {'GET /trip-plan/get-trip/t1': {tripDatas: tripDetail}, 'GET /trip-plan/get-trip': {dataTrip: trips}};

// value of a stat card ("challenges", "points earned", "days")
const stat = (labelKey: string) => cy.findByText(t(labelKey)).prev();

describe('trip detail', () => {
  beforeEach(() => {
    signIn();
  });

  it('shows the trip, its progress and the first day', () => {
    mockApi(api);
    visit('/assistant/trips/t1');

    cy.findByRole('heading', {name: 'Lâm Đồng'}).should('be.visible');
    cy.findByText('2/3/2026 - 3/3/2026').should('be.visible');
    stat('trips.detail.challenges').should('have.text', '1/3');
    stat('trips.detail.pointsEarned').should('have.text', '20/110');
    stat('trips.detail.days').should('have.text', '2');
    // day 1 is open: its challenges and costs; day 2 is closed
    cy.findByText('Chụp ảnh Hồ Xuân Hương').should('be.visible');
    cy.findByText('200.000 VND').should('be.visible');
    cy.findByText('Leo núi Langbiang').should('not.exist');
  });

  it('opens and closes the days', () => {
    mockApi(api);
    visit('/assistant/trips/t1');
    const day2 = () => cy.findByRole('button', {name: /Langbiang/});

    day2().should('have.attr', 'aria-expanded', 'false');
    day2().click();
    day2().should('have.attr', 'aria-expanded', 'true');
    cy.findByText('Leo núi Langbiang').should('be.visible');
    cy.findByText(t('trips.detail.other')).should('be.visible');

    cy.findByRole('button', {name: /Trung tâm Đà Lạt/}).click();
    cy.findByText('Chụp ảnh Hồ Xuân Hương').should('not.exist');
  });

  it('a completed challenge shows its photo and cannot be retaken', () => {
    mockApi(api);
    visit('/assistant/trips/t1');

    cy.findByRole('img', {name: 'Chụp ảnh Hồ Xuân Hương'}).should('exist').closest('button').should('be.disabled');
  });

  it('a challenge not done yet offers to add a photo', () => {
    mockApi(api);
    visit('/assistant/trips/t1');

    cy.findByRole('button', {name: t('trips.detail.addPhoto')}).should('be.visible');
    cy.findByText(t('trips.detail.todo')).should('be.visible');
    cy.findByText(t('trips.detail.done')).should('be.visible');
  });

  it('links to the map and back to the list', () => {
    mockApi(api);
    visit('/assistant/trips/t1');

    cy.findByRole('button', {name: t('trips.detail.viewMap')}).click();
    cy.location('pathname').should('eq', '/assistant/trips/t1/map');
  });

  it('the back arrow returns to the list', () => {
    mockApi(api);
    visit('/assistant/trips/t1');

    cy.findByRole('button', {name: t('trips.detail.backToList')}).click();

    cy.location('pathname').should('eq', '/assistant/trips');
  });

  it('offers to go back to the list when the trip cannot be loaded', () => {
    mockApi({'GET /trip-plan/get-trip/t1': reply(404), 'GET /trip-plan/get-trip': {dataTrip: trips}});
    visit('/assistant/trips/t1');

    // the app retries a failed request before giving up
    cy.findByText(t('trips.detail.loadFailed'), {timeout: 20_000}).should('be.visible');
    cy.findByRole('button', {name: t('trips.detail.backToList')}).click();

    cy.location('pathname').should('eq', '/assistant/trips');
  });
});
