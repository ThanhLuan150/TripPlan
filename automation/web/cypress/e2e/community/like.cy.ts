import {expectCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

const card = (id: string, nameTrip: string, likesCount = 0, liked = false) => ({
  _id: id,
  nameTrip,
  location: 'Lâm Đồng',
  startDate: '2026-03-02T09:00:00',
  endDate: '2026-03-04T09:00:00',
  transportCostTotal: 100000,
  foodCostTotal: 200000,
  otherCostTotal: 50000,
  likesCount,
  liked,
});

const publicTrip = (likesCount: number, liked: boolean) => ({
  tripDatas: {
    nameTrip: 'Đà Lạt 3 ngày',
    location: 'Lâm Đồng',
    startDate: '2026-03-02T09:00:00',
    endDate: '2026-03-04T09:00:00',
    dataTripDays: [{title: 'Trung tâm Đà Lạt', date: '2026-03-02T09:00:00', challenges: []}],
  },
  likesCount,
  liked,
});

const countsAre = (expected: string[]) =>
  cy.findAllByTestId('likes-count').should(counts => {
    expect([...counts].map(c => c.textContent)).to.deep.eq(expected);
  });

describe('like a post, signed in', () => {
  beforeEach(() => {
    signIn();
  });

  it('likes and unlikes a plan in the Explore list and shows the total from the server', () => {
    const calls = mockApi({
      'GET /public-trip': {
        page: 1,
        limit: 12,
        total: 2,
        items: [card('a1', 'Đà Lạt 3 ngày', 5, true), card('b2', 'Huế 2 ngày', 0, false)],
      },
      'POST /public-trip/b2/like': {liked: true, likesCount: 1},
      'DELETE /public-trip/a1/like': {liked: false, likesCount: 4},
    });
    visit('/explore');

    countsAre(['5', '0']);

    cy.findByRole('button', {name: t('trips.like.like')}).click();
    expectCall(calls, 'POST', '/public-trip/b2/like');
    cy.findAllByRole('button', {name: t('trips.like.unlike')}).should('have.length', 2);

    cy.findAllByRole('button', {name: t('trips.like.unlike')}).first().click();
    expectCall(calls, 'DELETE', '/public-trip/a1/like');
    countsAre(['4', '1']);
    cy.location('pathname').should('eq', '/explore');
  });

  it('likes the plan on its public page', () => {
    const calls = mockApi({
      'GET /public-trip/a1': publicTrip(2, false),
      'POST /public-trip/a1/like': {liked: true, likesCount: 3},
    });
    visit('/trip/a1');

    cy.findByRole('button', {name: t('trips.like.like')}).click();

    expectCall(calls, 'POST', '/public-trip/a1/like');
    cy.findByRole('button', {name: t('trips.like.unlike')}).should('have.attr', 'aria-pressed', 'true');
    cy.findByTestId('likes-count').should('have.text', '3');
  });

  it('keeps the old state and says so when the plan is gone', () => {
    mockApi({
      'GET /public-trip/a1': publicTrip(2, false),
      'POST /public-trip/a1/like': reply(404, {message: 'Post not found'}),
    });
    visit('/trip/a1');

    cy.findByRole('button', {name: t('trips.like.like')}).click();

    cy.findByText(t('trips.like.unavailable')).should('be.visible');
    cy.findByTestId('likes-count').should('have.text', '2');
  });
});

describe('like a post, signed out', () => {
  it('shows the total and sends the visitor to sign in', () => {
    mockApi({'GET /public-trip/a1': publicTrip(9, false)});
    visit('/trip/a1');

    cy.findByTestId('likes-count').should('have.text', '9');
    cy.findByRole('link', {name: t('trips.like.signIn')}).should('have.attr', 'href', '/login');
  });
});
