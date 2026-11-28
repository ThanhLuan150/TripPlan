import {expectCall, expectNoCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

const DEST = 'Hà Giang';
const path = `/destination/${encodeURIComponent(DEST)}`;

const review = (id: string, rating: number, content: string, extra: Record<string, unknown> = {}) => ({
  _id: id,
  destination: DEST,
  rating,
  content,
  createdAt: '2026-03-01T09:00:00.000Z',
  updatedAt: '2026-03-01T09:00:00.000Z',
  author: {_id: `u-${id}`, username: `traveler-${id}`, image: null},
  mine: false,
  ...extra,
});

const reviewsPage = (extra: Record<string, unknown> = {}) => ({
  destination: DEST,
  summary: {average: 4.5, count: 2},
  page: 1,
  limit: 10,
  total: 2,
  items: [review('r1', 5, 'Cung đường tuyệt vời'), review('r2', 4, 'Hơi lạnh nhưng rất đẹp')],
  myReview: null,
  ...extra,
});

const stars = (n: number) => cy.findByRole('radio', {name: t('reviews.star_other', {count: n})});

describe('destination reviews, signed out', () => {
  it('shows the average and the reviews, and asks to sign in to write one', () => {
    mockApi({'GET /destination-reviews': reviewsPage()});
    visit(path);

    cy.findByRole('heading', {name: t('reviews.pageTitle', {place: DEST})}).should('be.visible');
    cy.findByLabelText(t('reviews.average')).should('contain.text', '4.5');
    cy.findByText(t('reviews.count_other', {count: 2})).should('be.visible');
    cy.findByText('Cung đường tuyệt vời').should('be.visible');
    cy.findByText('traveler-r1').should('be.visible');
    cy.findByRole('link', {name: t('reviews.signIn')}).should('have.attr', 'href', '/login');
    cy.findByRole('form').should('not.exist');
  });

  it('links to the plans of the destination', () => {
    mockApi({'GET /destination-reviews': reviewsPage()});
    visit(path);

    cy.findByRole('link', {name: t('reviews.plansLink', {place: DEST})}).should('have.attr', 'href', `/explore?q=${encodeURIComponent(DEST)}`);
  });

  it('says there is no review yet', () => {
    mockApi({'GET /destination-reviews': reviewsPage({summary: {average: null, count: 0}, total: 0, items: []})});
    visit(path);

    cy.findByText(t('reviews.noAverage')).should('be.visible');
    cy.findByText(t('reviews.empty')).should('be.visible');
  });

  it('shows "not found" for a destination that does not exist', () => {
    mockApi({'GET /destination-reviews': reply(404, {message: 'Destination not found'})});
    visit('/destination/Atlantis');

    cy.findByText(t('reviews.notFoundTitle')).should('be.visible');
  });

  it('opens from the public page of a plan', () => {
    mockApi({
      'GET /public-trip/a1': {
        tripDatas: {nameTrip: 'Vòng cung Hà Giang', location: DEST, startDate: '2026-03-02T09:00:00', endDate: '2026-03-04T09:00:00', dataTripDays: []},
        likesCount: 0,
        liked: false,
        saved: false,
      },
      'GET /destination-reviews': reviewsPage(),
    });
    visit('/trip/a1');

    cy.findByRole('link', {name: t('trips.publicTrip.reviewsLink', {place: DEST})}).click();

    cy.location('pathname').should('eq', path);
    cy.findByText('Cung đường tuyệt vời').should('be.visible');
  });
});

describe('destination reviews, signed in', () => {
  beforeEach(() => {
    signIn();
  });

  it('writes a review with stars and a comment, and the page shows it as "your review"', () => {
    const mine = review('me1', 4, 'Rất đáng đi', {mine: true});
    let created = false;
    const calls = mockApi({
      'GET /destination-reviews': () =>
        created ? reviewsPage({myReview: mine, items: [mine, review('r1', 5, 'Cung đường tuyệt vời')], summary: {average: 4.5, count: 2}}) : reviewsPage(),
      'POST /destination-reviews': () => {
        created = true;
        return {review: mine, summary: {average: 4.5, count: 2}};
      },
    });
    visit(path);

    stars(4).click();
    cy.findByLabelText(t('reviews.commentLabel')).type('  Rất đáng đi  ');
    cy.findByRole('button', {name: t('reviews.submit')}).click();

    expectCall(calls, 'POST', '/destination-reviews').its('body').should('deep.eq', {destination: DEST, rating: 4, content: 'Rất đáng đi'});
    cy.findByRole('region', {name: t('reviews.yourReview')}).should('contain.text', 'Rất đáng đi');
    cy.findByRole('form').should('not.exist');
  });

  it('asks for the stars and the comment before sending anything', () => {
    const calls = mockApi({'GET /destination-reviews': reviewsPage()});
    visit(path);

    cy.findByRole('button', {name: t('reviews.submit')}).click();

    cy.findByText(t('reviews.errRating')).should('be.visible');
    cy.findByText(t('reviews.errContent')).should('be.visible');
    expectNoCall(calls, 'POST', '/destination-reviews');
  });

  it('refuses a second review of the same destination (409) with a clear message', () => {
    mockApi({'GET /destination-reviews': reviewsPage(), 'POST /destination-reviews': reply(409, {message: 'You already reviewed this destination, edit your review instead'})});
    visit(path);

    stars(3).click();
    cy.findByLabelText(t('reviews.commentLabel')).type('Ổn');
    cy.findByRole('button', {name: t('reviews.submit')}).click();

    cy.findByText(t('reviews.duplicate')).should('be.visible');
  });

  describe('own review', () => {
    const mine = review('me1', 3, 'Cũng được', {mine: true});
    const withMine = () => reviewsPage({myReview: mine, items: [mine, review('r1', 5, 'Cung đường tuyệt vời')], total: 2});

    it('shows Edit and Delete only on the review of the user', () => {
      mockApi({'GET /destination-reviews': withMine()});
      visit(path);

      cy.findByRole('region', {name: t('reviews.yourReview')}).within(() => {
        cy.findByRole('button', {name: t('reviews.edit')}).should('be.visible');
        cy.findByRole('button', {name: t('reviews.delete')}).should('be.visible');
      });
      cy.findAllByRole('button', {name: t('reviews.edit')}).should('have.length', 1);
      cy.findByText('Cũng được').should('have.length', 1);
    });

    it('edits the review', () => {
      const calls = mockApi({
        'GET /destination-reviews': withMine(),
        'PUT /destination-reviews/me1': {review: {...mine, rating: 5, content: 'Tuyệt hơn tôi nghĩ'}, summary: {average: 5, count: 2}},
      });
      visit(path);

      cy.findByRole('button', {name: t('reviews.edit')}).click();
      cy.findByLabelText(t('reviews.commentLabel')).should('have.value', 'Cũng được').clear().type('Tuyệt hơn tôi nghĩ');
      stars(5).click();
      cy.findByRole('button', {name: t('reviews.update')}).click();

      expectCall(calls, 'PUT', '/destination-reviews/me1').its('body').should('deep.eq', {rating: 5, content: 'Tuyệt hơn tôi nghĩ'});
      expectNoCall(calls, 'POST', '/destination-reviews');
    });

    it('asks before deleting and then deletes the review', () => {
      const calls = mockApi({
        'GET /destination-reviews': withMine(),
        'DELETE /destination-reviews/me1': {summary: {average: 5, count: 1}},
      });
      visit(path);

      cy.findByRole('button', {name: t('reviews.delete')}).click();
      cy.findByText(t('reviews.deleteTitle')).should('be.visible');
      expectNoCall(calls, 'DELETE');
      cy.findByRole('button', {name: t('reviews.deleteAction')}).click();

      expectCall(calls, 'DELETE', '/destination-reviews/me1');
    });

    it('does not delete when the user cancels', () => {
      const calls = mockApi({'GET /destination-reviews': withMine()});
      visit(path);

      cy.findByRole('button', {name: t('reviews.delete')}).click();
      cy.findByRole('button', {name: t('common.cancel')}).click();

      cy.findByText(t('reviews.deleteTitle')).should('not.exist');
      expectNoCall(calls, 'DELETE');
    });

    it('says the review is not theirs when the server answers 403', () => {
      mockApi({'GET /destination-reviews': withMine(), 'PUT /destination-reviews/me1': reply(403, {message: 'You can only change your own review'})});
      visit(path);

      cy.findByRole('button', {name: t('reviews.edit')}).click();
      cy.findByRole('button', {name: t('reviews.update')}).click();

      cy.findByText(t('reviews.notAllowed')).should('be.visible');
    });
  });
});
