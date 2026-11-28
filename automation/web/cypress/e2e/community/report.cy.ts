import {expectCall, expectNoCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

const publicTrip = {
  tripDatas: {
    nameTrip: 'Đà Lạt 3 ngày',
    location: 'Lâm Đồng',
    startDate: '2026-03-02T09:00:00',
    endDate: '2026-03-04T09:00:00',
    dataTripDays: [{title: 'Trung tâm Đà Lạt', date: '2026-03-02T09:00:00', challenges: []}],
  },
  likesCount: 0,
  liked: false,
  saved: false,
};

const open = () => {
  visit('/trip/a1');
  cy.findByRole('button', {name: t('trips.report.open')}).click();
  return cy.findByRole('dialog', {name: t('trips.report.title')});
};
const reason = (key: string) => cy.findByRole('radio', {name: t(`trips.report.reasons.${key}`)});

describe('report a post, signed in', () => {
  beforeEach(() => {
    signIn();
  });

  it('lists the reasons, with "spam" chosen, and says the report is private', () => {
    mockApi({'GET /public-trip/a1': publicTrip});
    open().within(() => {
      for (const key of ['spam', 'inappropriate', 'wrongLocation', 'copyright', 'misinformation', 'other']) {
        reason(key).should('exist');
      }
      reason('spam').should('be.checked');
      cy.findByText(t('trips.report.subtitle')).should('be.visible');
      cy.findByLabelText(t('trips.report.descriptionOptional')).should('be.visible');
    });
  });

  it('sends the reason and the description and shows a confirmation', () => {
    const calls = mockApi({'GET /public-trip/a1': publicTrip, 'POST /public-trip/a1/report': {message: 'Report sent successfully'}});
    open().within(() => {
      reason('inappropriate').check();
      cy.findByLabelText(t('trips.report.descriptionOptional')).type('  Ảnh phản cảm ');
      cy.findByRole('button', {name: t('trips.report.submit')}).click();
    });

    expectCall(calls, 'POST', '/public-trip/a1/report').its('body').should('deep.eq', {reason: 'inappropriate', description: 'Ảnh phản cảm'});
    cy.findByText(t('trips.report.success')).should('be.visible');
    cy.findByText(t('trips.report.successText')).should('be.visible');
  });

  it('the description can stay empty', () => {
    const calls = mockApi({'GET /public-trip/a1': publicTrip, 'POST /public-trip/a1/report': {message: 'ok'}});
    open().within(() => cy.findByRole('button', {name: t('trips.report.submit')}).click());

    expectCall(calls, 'POST', '/public-trip/a1/report').its('body').should('deep.eq', {reason: 'spam'});
  });

  it('the reason "other" needs a description', () => {
    const calls = mockApi({'GET /public-trip/a1': publicTrip, 'POST /public-trip/a1/report': {message: 'ok'}});
    open().within(() => {
      reason('other').check();
      cy.findByRole('button', {name: t('trips.report.submit')}).click();
      cy.findByText(t('trips.report.descriptionRequired')).should('be.visible');
    });
    expectNoCall(calls, 'POST', '/public-trip/a1/report');

    cy.findByLabelText(t('trips.report.descriptionLabel')).type('Lý do khác');
    cy.findByRole('button', {name: t('trips.report.submit')}).click();
    expectCall(calls, 'POST', '/public-trip/a1/report').its('body').should('deep.eq', {reason: 'other', description: 'Lý do khác'});
  });

  it('tells the user when the post was already reported', () => {
    mockApi({'GET /public-trip/a1': publicTrip, 'POST /public-trip/a1/report': reply(409, {message: 'You already reported this post'})});
    open().within(() => cy.findByRole('button', {name: t('trips.report.submit')}).click());

    cy.findByText(t('trips.report.duplicate')).should('be.visible');
    cy.findByText(t('trips.report.success')).should('not.exist');
  });

  it('tells the user when the post no longer exists', () => {
    mockApi({'GET /public-trip/a1': publicTrip, 'POST /public-trip/a1/report': reply(404, {message: 'Post not found'})});
    open().within(() => cy.findByRole('button', {name: t('trips.report.submit')}).click());

    cy.findByText(t('trips.report.unavailable')).should('be.visible');
  });

  it('Cancel closes the dialog without sending anything', () => {
    const calls = mockApi({'GET /public-trip/a1': publicTrip});
    open().within(() => cy.findByRole('button', {name: t('common.cancel')}).click());

    cy.findByRole('dialog').should('not.exist');
    expectNoCall(calls, 'POST', '/public-trip/a1/report');
  });
});

describe('report a post, signed out', () => {
  it('sends the visitor to sign in instead of opening the report', () => {
    mockApi({'GET /public-trip/a1': publicTrip});
    visit('/trip/a1');

    cy.findByRole('link', {name: t('trips.report.signIn')}).should('have.attr', 'href', '/login');
  });
});
