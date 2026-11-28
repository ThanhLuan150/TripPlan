import {expectCall, expectNoCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';
import {tripDetail} from '../../support/fixtures';

const off = {isPosted: false, visibility: 'private', content: '', postedAt: null};
const on = {isPosted: true, visibility: 'public', content: 'Ba ngày ăn uống', postedAt: '2026-03-01T09:00:00.000Z'};

const base = (post: unknown) => ({
  'GET /trip-plan/get-trip/t1': {tripDatas: tripDetail},
  'GET /trip-plan/favorites': {dataTrip: []},
  'GET /trip-plan/t1/visibility': {visibility: 'private'},
  'GET /trip-plan/t1/notes': {notes: []},
  'GET /trip-plan/t1/budget-estimate': {estimate: null},
  'GET /trip-plan/t1/post': post,
});

const open = () => {
  visit('/assistant/trips/t1');
  cy.findByRole('button', {name: t('trips.post.openLabel')}).click();
  return cy.findByRole('dialog', {name: t('trips.post.title')});
};

describe('share a trip as a post', () => {
  beforeEach(() => {
    signIn();
  });

  it('opens a dialog that says the plan is private and that posting makes it public', () => {
    mockApi(base(off));
    open().within(() => {
      cy.findByText(t('trips.post.notPosted')).should('be.visible');
      cy.findByText(t('trips.post.notice')).should('be.visible');
      cy.findByRole('button', {name: t('trips.post.share')}).should('be.visible');
      cy.findByRole('button', {name: t('trips.post.remove')}).should('not.exist');
    });
  });

  it('shares the plan with an introduction', () => {
    const calls = mockApi({...base(off), 'POST /trip-plan/t1/post': on});
    open().within(() => {
      cy.findByLabelText(t('trips.post.contentLabel')).type('  Ba ngày ăn uống  ');
      cy.findByRole('button', {name: t('trips.post.share')}).click();
    });

    expectCall(calls, 'POST', '/trip-plan/t1/post').its('body').should('deep.eq', {content: 'Ba ngày ăn uống'});
    cy.findByText(t('trips.post.posted')).should('be.visible');
    cy.findByRole('link', {name: t('trips.post.viewPost')}).should('have.attr', 'href', '/trip/t1');
  });

  it('the introduction is optional', () => {
    const calls = mockApi({...base(off), 'POST /trip-plan/t1/post': {...on, content: ''}});
    open().within(() => cy.findByRole('button', {name: t('trips.post.share')}).click());

    expectCall(calls, 'POST', '/trip-plan/t1/post').its('body').should('deep.eq', {content: ''});
  });

  it('shows the introduction of a plan that is already a post and updates it', () => {
    const calls = mockApi({...base(on), 'POST /trip-plan/t1/post': {...on, content: 'Mới'}});
    open().within(() => {
      cy.findByLabelText(t('trips.post.contentLabel')).should('have.value', 'Ba ngày ăn uống').clear().type('Mới');
      cy.findByRole('button', {name: t('trips.post.update')}).click();
    });

    expectCall(calls, 'POST', '/trip-plan/t1/post').its('body').should('deep.eq', {content: 'Mới'});
  });

  it('refuses an introduction that is too long without sending it', () => {
    const calls = mockApi(base(off));
    open().within(() => {
      cy.findByLabelText(t('trips.post.contentLabel')).invoke('val', 'a'.repeat(1001)).trigger('input').type('a');
      cy.findByText(t('trips.post.tooLong', {max: 1000})).should('be.visible');
      cy.findByRole('button', {name: t('trips.post.share')}).should('be.disabled');
    });
    expectNoCall(calls, 'POST', '/trip-plan/t1/post');
  });

  it('says the plan needs a day when the server refuses an empty plan', () => {
    mockApi({...base(off), 'POST /trip-plan/t1/post': reply(400, {message: 'Add at least one day to the trip before sharing it'})});
    open().within(() => cy.findByRole('button', {name: t('trips.post.share')}).click());

    cy.findByText(t('trips.post.noDays')).should('be.visible');
  });

  it('asks before removing the post, then makes the plan private again', () => {
    const calls = mockApi({...base(on), 'DELETE /trip-plan/t1/post': off});
    open().within(() => cy.findByRole('button', {name: t('trips.post.remove')}).click());

    cy.findByText(t('trips.post.removeTitle')).should('be.visible');
    expectNoCall(calls, 'DELETE', '/trip-plan/t1/post');
    cy.findByRole('button', {name: t('trips.post.removeAction')}).click();

    expectCall(calls, 'DELETE', '/trip-plan/t1/post');
    cy.findByText(t('trips.post.notPosted')).should('be.visible');
  });

  it('cancelling the removal keeps the post', () => {
    const calls = mockApi(base(on));
    open().within(() => cy.findByRole('button', {name: t('trips.post.remove')}).click());

    cy.findByRole('button', {name: t('common.cancel')}).click();

    cy.findByText(t('trips.post.posted')).should('be.visible');
    expectNoCall(calls, 'DELETE', '/trip-plan/t1/post');
  });

  it('shows the introduction on the public page of the post and in the list', () => {
    mockApi({
      'GET /public-trip/t1': {
        tripDatas: {nameTrip: 'Đà Lạt 3 ngày', location: 'Lâm Đồng', startDate: '2026-03-02T09:00:00', endDate: '2026-03-04T09:00:00', postContent: 'Ba ngày ăn uống', dataTripDays: []},
        likesCount: 0,
        liked: false,
        saved: false,
      },
      'GET /public-trip': {page: 1, limit: 12, total: 1, items: [{_id: 't1', nameTrip: 'Đà Lạt 3 ngày', location: 'Lâm Đồng', startDate: '2026-03-02T09:00:00', endDate: '2026-03-04T09:00:00', postContent: 'Ba ngày ăn uống'}]},
    });
    visit('/explore');
    cy.findByText('Ba ngày ăn uống').should('be.visible');

    cy.findByRole('link', {name: /Đà Lạt 3 ngày/}).click();

    cy.findByText(t('trips.publicTrip.authorNote')).should('be.visible');
    cy.findByText('Ba ngày ăn uống').should('be.visible');
  });
});
