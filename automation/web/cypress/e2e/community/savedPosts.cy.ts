import {expectCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

const card = (id: string, nameTrip: string, saved = false) => ({
  _id: id,
  nameTrip,
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-04T09:00:00',
  transportCostTotal: 100000,
  foodCostTotal: 200000,
  otherCostTotal: 50000,
  likesCount: 0,
  liked: false,
  saved,
});

const publicTrip = (saved: boolean) => ({
  tripDatas: {
    nameTrip: 'Đà Lạt 3 ngày',
    location: 'Lâm Đồng',
    startDate: '2026-03-02T09:00:00',
    endDate: '2026-03-04T09:00:00',
    dataTripDays: [{title: 'Trung tâm Đà Lạt', date: '2026-03-02T09:00:00', challenges: []}],
  },
  likesCount: 0,
  liked: false,
  saved,
});

describe('save a post, signed in', () => {
  beforeEach(() => {
    signIn();
  });

  it('saves and unsaves a plan in the Explore list without leaving it', () => {
    const calls = mockApi({
      'GET /public-trip': {
        page: 1,
        limit: 12,
        total: 2,
        items: [card('a1', 'Đà Lạt 3 ngày', true), card('b2', 'Huế 2 ngày', false)],
      },
      'POST /public-trip/b2/save': {saved: true},
      'DELETE /public-trip/a1/save': {saved: false},
    });
    visit('/explore');

    cy.findByRole('button', {name: t('trips.savePost.save')}).click();
    expectCall(calls, 'POST', '/public-trip/b2/save');
    cy.findAllByRole('button', {name: t('trips.savePost.unsave')}).should('have.length', 2);

    cy.findAllByRole('button', {name: t('trips.savePost.unsave')}).first().click();
    expectCall(calls, 'DELETE', '/public-trip/a1/save');
    cy.findAllByRole('button', {name: t('trips.savePost.save')}).should('have.length', 1);
    cy.location('pathname').should('eq', '/explore');
  });

  it('saves the plan on its public page', () => {
    const calls = mockApi({
      'GET /public-trip/a1': publicTrip(false),
      'POST /public-trip/a1/save': {saved: true},
    });
    visit('/trip/a1');

    cy.findByRole('button', {name: t('trips.savePost.save')}).click();

    expectCall(calls, 'POST', '/public-trip/a1/save');
    cy.findByRole('button', {name: t('trips.savePost.unsave')}).should('have.attr', 'aria-pressed', 'true');
  });

  it('keeps the old state and says so when the plan is gone', () => {
    mockApi({
      'GET /public-trip/a1': publicTrip(false),
      'POST /public-trip/a1/save': reply(404, {message: 'Post not found'}),
    });
    visit('/trip/a1');

    cy.findByRole('button', {name: t('trips.savePost.save')}).click();

    cy.findByText(t('trips.savePost.unavailable')).should('be.visible');
    cy.findByRole('button', {name: t('trips.savePost.save')}).should('have.attr', 'aria-pressed', 'false');
  });

  it('opens the Saved posts area from the profile and lists only the saved plans', () => {
    mockApi({
      'GET /user/saved-posts': {page: 1, limit: 12, total: 1, items: [card('a1', 'Đà Lạt 3 ngày', true)]},
    });
    visit('/saved');

    cy.findByRole('heading', {name: t('trips.saved.title')}).should('be.visible');
    cy.findByRole('link', {name: /Đà Lạt 3 ngày/}).should('have.attr', 'href', '/trip/a1');
    cy.findByRole('button', {name: t('trips.savePost.unsave')}).should('be.visible');
  });

  it('unsaves a post from the Saved posts area', () => {
    const calls = mockApi({
      'GET /user/saved-posts': {page: 1, limit: 12, total: 1, items: [card('a1', 'Đà Lạt 3 ngày', true)]},
      'DELETE /public-trip/a1/save': {saved: false},
    });
    visit('/saved');

    cy.findByRole('button', {name: t('trips.savePost.unsave')}).click();
    expectCall(calls, 'DELETE', '/public-trip/a1/save');
  });

  it('shows an empty state with a way to explore plans', () => {
    mockApi({'GET /user/saved-posts': {page: 1, limit: 12, total: 0, items: []}});
    visit('/saved');

    cy.findByText(t('trips.saved.empty')).should('be.visible');
    cy.findByRole('link', {name: t('trips.saved.goExplore')}).should('have.attr', 'href', '/explore');
  });

  it('shows an error that can be retried', () => {
    mockApi({'GET /user/saved-posts': reply(500, {message: 'boom'})});
    visit('/saved');

    cy.findByRole('alert').should('contain.text', t('trips.saved.error'));
    cy.findByRole('button', {name: t('common.retry')}).should('be.visible');
  });
});

describe('save a post, signed out', () => {
  it('sends the visitor to sign in instead of saving', () => {
    mockApi({'GET /public-trip/a1': publicTrip(false)});
    visit('/trip/a1');

    cy.findByRole('link', {name: t('trips.savePost.signIn')}).should('have.attr', 'href', '/login');
  });
});
