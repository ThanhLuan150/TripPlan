import {tripDetail, trips} from '../../support/fixtures';
import {expectCall, expectNoCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

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

  it('adds the trip to the favorites from the detail page, then removes it', () => {
    let favorites: unknown[] = [];
    const calls = mockApi({
      ...api,
      'GET /trip-plan/favorites': () => ({dataTrip: favorites}),
      'POST /trip-plan/t1/favorite': () => {
        favorites = [trips[0]];
        return {isFavorite: true};
      },
      'DELETE /trip-plan/t1/favorite': () => {
        favorites = [];
        return {isFavorite: false};
      },
    });
    visit('/assistant/trips/t1');

    cy.findByRole('button', {name: t('trips.list.favorite')}).should('have.attr', 'aria-pressed', 'false').click();
    expectCall(calls, 'POST', '/trip-plan/t1/favorite');
    cy.findByRole('button', {name: t('trips.list.unfavorite')}).should('have.attr', 'aria-pressed', 'true').click();
    expectCall(calls, 'DELETE', '/trip-plan/t1/favorite');
    cy.findByRole('button', {name: t('trips.list.favorite')}).should('have.attr', 'aria-pressed', 'false');
  });

  it('exports the trip as a PDF', () => {
    const calls = mockApi({...api, 'GET /trip-plan/t1/export-pdf': '%PDF-1.3'});
    visit('/assistant/trips/t1');

    cy.findByRole('button', {name: t('trips.detail.exportPdf')}).click();

    expectCall(calls, 'GET', '/trip-plan/t1/export-pdf').its('query.lang').should('eq', 'vi');
    cy.findByRole('button', {name: t('trips.detail.exportPdf')}).should('be.enabled');
    cy.findByText(t('trips.detail.exportPdfFailed')).should('not.exist');
  });

  it('shares the trip: turns the link on and shows it, then turns it off', () => {
    const off = {isShared: false, permission: null, shareToken: null, sharedAt: null};
    const on = {isShared: true, permission: 'view', shareToken: 'tok123', sharedAt: '2026-01-01'};
    const calls = mockApi({
      ...api,
      'GET /trip-plan/t1/share': off,
      'POST /trip-plan/t1/share': on,
      'DELETE /trip-plan/t1/share': off,
    });
    visit('/assistant/trips/t1');

    cy.findByRole('button', {name: t('trips.share.open')}).click();
    cy.findByText(t('trips.share.statusOff')).should('be.visible');
    cy.findByRole('switch').click();
    expectCall(calls, 'POST', '/trip-plan/t1/share');
    cy.location('origin').then(origin =>
      cy.findByLabelText(t('trips.share.linkLabel')).should('have.value', `${origin}/shared/tok123`),
    );
    cy.findByText(t('trips.share.permissionView')).should('be.visible');

    cy.findByRole('switch').click();
    expectCall(calls, 'DELETE', '/trip-plan/t1/share');
    cy.findByLabelText(t('trips.share.linkLabel')).should('not.exist');
    cy.findByText(t('trips.share.statusOff')).should('be.visible');
  });

  it('shows who can see the trip and lets the owner change it', () => {
    const calls = mockApi({
      ...api,
      'GET /trip-plan/t1/visibility': {visibility: 'private'},
      'PUT /trip-plan/t1/visibility': (call: {body: {visibility: string}}) => ({visibility: call.body.visibility}),
    });
    visit('/assistant/trips/t1');

    cy.findByRole('button', {name: t('trips.visibility.change')}).as('visibility').should('contain.text', t('trips.visibility.private'));

    // going public asks first: cancelling changes nothing
    cy.get('@visibility').click();
    cy.findByText(t('trips.visibility.confirmPublicTitle')).should('be.visible');
    cy.findByRole('button', {name: t('common.cancel')}).click();
    cy.findByText(t('trips.visibility.confirmPublicTitle')).should('not.exist');
    cy.then(() => expectNoCall(calls, 'PUT'));

    cy.get('@visibility').click();
    cy.findByRole('button', {name: t('trips.visibility.confirmPublicAction')}).click();
    cy.then(() => expect(calls.find(c => c.method === 'PUT')?.body).to.deep.eq({visibility: 'public'}));
    cy.get('@visibility').should('contain.text', t('trips.visibility.public'));

    // going private needs no question
    cy.get('@visibility').click();
    cy.get('@visibility').should('contain.text', t('trips.visibility.private'));
  });

  it('adds, edits and deletes a personal note on the trip', () => {
    let notes: unknown[] = [{_id: 'n1', tripId: 't1', content: 'Pack a coat', createdAt: '2026-03-02T09:00:00.000Z', updatedAt: '2026-03-02T09:00:00.000Z'}];
    const calls = mockApi({
      ...api,
      'GET /trip-plan/t1/notes': () => ({notes}),
      'POST /trip-plan/t1/notes': (call: {body: {content: string}}) => {
        const note = {_id: 'n2', tripId: 't1', content: call.body.content, createdAt: '2026-03-03T09:00:00.000Z', updatedAt: '2026-03-03T09:00:00.000Z'};
        notes = [note, ...notes];
        return {note};
      },
      'PUT /trip-plan/t1/notes/n1': (call: {body: {content: string}}) => {
        notes = notes.map((n: any) => (n._id === 'n1' ? {...n, content: call.body.content} : n));
        return {note: notes.find((n: any) => n._id === 'n1')};
      },
      'DELETE /trip-plan/t1/notes/n1': () => {
        notes = notes.filter((n: any) => n._id !== 'n1');
        return {message: 'ok'};
      },
    });
    visit('/assistant/trips/t1');

    cy.findByText('Pack a coat').should('be.visible');

    // validation: an empty note is not sent
    cy.findByRole('button', {name: t('trips.notes.add')}).click();
    cy.findByRole('alert').should('contain.text', t('trips.notes.required'));
    cy.then(() => expectNoCall(calls, 'POST'));

    // add
    cy.findAllByRole('textbox').first().type('Rent a scooter');
    cy.findByRole('button', {name: t('trips.notes.add')}).click();
    expectCall(calls, 'POST', '/trip-plan/t1/notes').its('body').should('deep.eq', {content: 'Rent a scooter'});
    cy.findByText('Rent a scooter').should('be.visible');

    // edit
    cy.findAllByRole('button', {name: t('trips.notes.edit')}).last().click();
    cy.findByDisplayValue('Pack a coat').clear().type('Pack two coats');
    cy.findByRole('button', {name: t('trips.notes.save')}).click();
    expectCall(calls, 'PUT', '/trip-plan/t1/notes/n1').its('body').should('deep.eq', {content: 'Pack two coats'});
    cy.findByText('Pack two coats').should('be.visible');

    // delete asks first
    cy.findAllByRole('button', {name: t('trips.notes.remove')}).last().click();
    cy.findByRole('button', {name: t('common.cancel')}).click();
    cy.then(() => expectNoCall(calls, 'DELETE'));
    cy.findAllByRole('button', {name: t('trips.notes.remove')}).last().click();
    cy.findByRole('dialog').findByRole('button', {name: t('common.delete')}).click();
    expectCall(calls, 'DELETE', '/trip-plan/t1/notes/n1');
    cy.findByText('Pack two coats').should('not.exist');
    cy.findByText('Rent a scooter').should('be.visible');
  });

  it('tells the user when the PDF cannot be created', () => {
    mockApi({...api, 'GET /trip-plan/t1/export-pdf': reply(500)});
    visit('/assistant/trips/t1');

    cy.findByRole('button', {name: t('trips.detail.exportPdf')}).click();

    cy.findByText(t('trips.detail.exportPdfFailed')).should('be.visible');
  });
});
