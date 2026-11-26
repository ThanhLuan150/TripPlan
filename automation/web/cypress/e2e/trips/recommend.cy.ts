import {tripDetail, trips} from '../../support/fixtures';
import {expectCall, expectNoCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

const recommendations = {
  message: 'Suggestions created',
  historyId: 'h1',
  recommendations: [
    {
      name: 'Hồ Xuân Hương',
      province: 'Lâm Đồng',
      description: 'Hồ giữa lòng thành phố',
      reason: 'Không khí mát mẻ',
      inApp: true,
      place: {id: 's1', title: 'Hồ Xuân Hương, Đà Lạt', location: 'Lâm Đồng', imageUrl: '', videos: []},
    },
    {name: 'Thác Datanla', province: 'Lâm Đồng', description: 'Thác nước', reason: 'Thiên nhiên', inApp: false},
  ],
};

const open = (extra: Record<string, unknown> = {}, beforeLoad?: (win: Window) => void) => {
  const calls = mockApi({'GET /chat': {data: []}, 'GET /destinations/history': {items: []}, ...extra});
  visit('/assistant/recommend', {onBeforeLoad: beforeLoad});
  return calls;
};
const ask = (text = 'Nơi mát mẻ') => {
  cy.findByRole('textbox', {name: t('destinations.query')}).type(text);
  cy.findByRole('button', {name: t('destinations.ask')}).click();
};

describe('AI destination recommendation', () => {
  beforeEach(() => {
    signIn();
  });

  it('links to the chat for anything else to ask', () => {
    open();
    cy.findByText(t('destinations.toChatHint')).should('be.visible');
    cy.findByRole('button', {name: t('destinations.toChat')}).click();
    cy.location('pathname').should('eq', '/assistant/chat');
  });

  it('is a tab of the assistant', () => {
    open();
    cy.findByRole('link', {name: t('nav.recommend')}).should('have.attr', 'aria-current', 'page');
  });

  it('needs at least one input', () => {
    const calls = open();
    cy.findByRole('button', {name: t('destinations.ask')}).click();
    cy.findByText(t('destinations.required')).should('be.visible');
    // every field is flagged, like the new-plan form
    cy.findAllByText(t('destinations.orChoose')).should('have.length', 3);
    expectNoCall(calls, 'POST', '/destinations/recommend');

    // the error goes away as soon as any input is given
    cy.findByRole('button', {name: t('trips.create.areaHistory')}).click();
    cy.findByText(t('destinations.required')).should('not.exist');
    cy.findByText(t('destinations.orChoose')).should('not.exist');
  });

  it('sends the needs, interests, region and budget and shows name, description and reason', () => {
    const calls = open({'POST /destinations/recommend': recommendations});
    cy.findByRole('button', {name: t('trips.create.areaHistory')}).click();
    cy.findByPlaceholderText(t('destinations.anyRegion')).type('Đà N');
    cy.findByRole('listbox').findByRole('button', {name: 'Đà Nẵng'}).click();
    cy.findByRole('radio', {name: new RegExp(t('trips.create.budgetMid'))}).click();
    ask();

    cy.findByText('Hồ giữa lòng thành phố').should('be.visible');
    cy.findByText('Không khí mát mẻ').should('be.visible');
    cy.findByText(t('destinations.inApp')).should('be.visible');
    cy.findByText(t('destinations.aiOnly')).should('be.visible');
    cy.findByText(t('destinations.aiOnlyHint')).should('be.visible');
    expectCall(calls, 'POST', '/destinations/recommend')
      .its('body')
      .should('deep.include', {query: 'Nơi mát mẻ', interests: ['Lịch sử'], region: 'Đà Nẵng', budget: '1.000.000 VND - 5.000.000 VND'});
  });

  it('shows the details of a place the app knows', () => {
    open({'POST /destinations/recommend': recommendations});
    ask();

    cy.findAllByRole('button', {name: t('destinations.viewDetails')}).should('have.length', 1).click();
    cy.findByRole('region', {name: t('destinations.detailsOf', {name: 'Hồ Xuân Hương'})}).should('be.visible');
  });

  it('plans a trip from any suggestion, even one only the AI made, with the place as the note', () => {
    mockApi({'GET /chat': {data: []}, 'GET /destinations/history': {items: []}, 'POST /destinations/recommend': recommendations});
    visit('/assistant/recommend');
    ask();

    cy.findByRole('button', {name: t('destinations.planTripFor', {name: 'Thác Datanla'})}).click();
    cy.location('pathname').should('eq', '/assistant/trips/new');
    cy.get('#province').should('have.value', 'Lâm Đồng');
    cy.get('#note').should('have.value', 'Thác Datanla (Lâm Đồng): Thác nước');
  });

  it('says so when the AI finds nothing', () => {
    open({'POST /destinations/recommend': {message: 'none', recommendations: []}});
    ask();
    cy.findByText(t('destinations.empty')).should('be.visible');
  });

  it('shows an error when the AI is unavailable', () => {
    open({'POST /destinations/recommend': reply(503, {message: 'AI service unavailable', code: 'AI_QUOTA'})});
    ask();
    cy.findByText(t('destinations.unavailable')).should('be.visible');
  });

  it('shows an error when the AI answers badly', () => {
    open({'POST /destinations/recommend': reply(502, {message: 'bad', code: 'AI_INVALID_RESPONSE'})});
    ask();
    cy.findByText(t('destinations.invalid')).should('be.visible');
  });

  describe('add to an existing trip', () => {
    const activeTrips = trips.filter(trip => trip.status === 'active');
    const detail = {...tripDetail, dataTripDays: tripDetail.dataTripDays.map((day, i) => ({...day, _id: 'd' + (i + 1)}))};
    const openDialog = (extra: Record<string, unknown> = {}) => {
      const calls = open({
        'POST /destinations/recommend': recommendations,
        'GET /trip-plan/get-trip': {dataTrip: activeTrips},
        'GET /trip-plan/get-trip/t1': {tripDatas: detail},
        ...extra,
      });
      ask();
      cy.findByRole('button', {name: t('destinations.addToTripFor', {name: 'Thác Datanla'})}).click();
      return calls;
    };

    it('walks through trip, day and confirmation before anything is added', () => {
      const calls = openDialog({'POST /trip-plan/t1/places': {challengeId: 'c9', day: {id: 'd2', title: 'Langbiang'}, located: true}});

      cy.findByRole('dialog').within(() => {
        // the trip of the same province comes first and nothing is added yet
        cy.findAllByRole('radio').first().should('contain.text', 'Đà Lạt mộng mơ');
        cy.findByRole('button', {name: t('destinations.addConfirm')}).should('be.disabled');
        cy.findByRole('radio', {name: /Đà Lạt mộng mơ/}).click();
        cy.findByRole('radio', {name: /Langbiang/}).click();
        cy.findByText(t('destinations.addUnverified')).should('be.visible');
        cy.findByRole('button', {name: t('destinations.addConfirm')}).click();
        cy.findByText(t('destinations.addDoneHint')).should('be.visible');
      });
      expectCall(calls, 'POST', '/trip-plan/t1/places')
        .its('body')
        .should('deep.include', {name: 'Thác Datanla', dayId: 'd2', province: 'Lâm Đồng', summary: 'Thác nước'});
    });

    it('explains why a place could not be added and keeps the dialog open', () => {
      openDialog({'POST /trip-plan/t1/places': reply(409, {message: 'dup', code: 'PLACE_ALREADY_IN_TRIP'})});

      cy.findByRole('dialog').within(() => {
        cy.findByRole('radio', {name: /Đà Lạt mộng mơ/}).click();
        cy.findByRole('radio', {name: /Langbiang/}).click();
        cy.findByRole('button', {name: t('destinations.addConfirm')}).click();
        cy.findByText(t('destinations.addDuplicate')).should('be.visible');
        cy.findByRole('button', {name: t('destinations.addConfirm')}).should('be.enabled');
      });
    });

    it('offers to create a trip when the user has none', () => {
      openDialog({'GET /trip-plan/get-trip': {dataTrip: []}});
      cy.findByRole('dialog').findByText(t('destinations.addNoTrips')).should('be.visible');
      cy.findByRole('button', {name: t('destinations.addCreate')}).click();
      cy.location('pathname').should('eq', '/assistant/trips/new');
    });
  });

  describe('draft of the request', () => {
    const key = 'draft:recommend:lan123';

    it('offers an unfinished request after a reload and puts it back with Continue', () => {
      open();
      cy.findByLabelText(t('destinations.query')).type('Nơi mát mẻ');
      cy.findByRole('button', {name: t('trips.create.areaHistory')}).click();
      cy.window().should(win => expect(win.localStorage.getItem(key)).to.contain('Nơi mát mẻ'));

      cy.reload();
      cy.findByText(t('drafts.found')).should('be.visible');
      cy.findByLabelText(t('destinations.query')).should('have.value', '');
      cy.findByRole('button', {name: t('drafts.continue')}).click();
      cy.findByLabelText(t('destinations.query')).should('have.value', 'Nơi mát mẻ');
      cy.findByRole('button', {name: t('trips.create.areaHistory')}).should('have.attr', 'aria-pressed', 'true');
    });

    it('Start new throws the draft away', () => {
      open({}, win => win.localStorage.setItem(key, JSON.stringify({savedAt: Date.now(), value: {query: 'cũ', interests: [], region: '', budgetTier: ''}})));
      cy.findByRole('button', {name: t('drafts.startNew')}).click();
      cy.findByLabelText(t('destinations.query')).should('have.value', '');
      cy.window().should(win => expect(win.localStorage.getItem(key)).to.eq(null));
    });
  });

  describe('history of suggestions', () => {
    const past = (id: string, status: 'draft' | 'created', query: string) => ({
      id,
      query,
      interests: [],
      region: '',
      budget: '',
      count: 2,
      names: ['Hồ Xuân Hương', 'Thác Datanla'],
      status,
      createdAt: '2026-03-01T10:00:00',
    });

    it('shows two groups, opens a suggestion and puts its request back in the form', () => {
      open({
        'GET /destinations/history': {items: [past('a', 'draft', 'Nơi mát mẻ'), past('b', 'created', 'Biển đẹp')]},
        'GET /destinations/history/a': {search: {...past('a', 'draft', 'Nơi mát mẻ'), recommendations: recommendations.recommendations}},
      });

      cy.findByRole('region', {name: t('destinations.historyDrafts')}).findByText('Nơi mát mẻ').should('be.visible');
      cy.findByRole('region', {name: t('destinations.historyCreated')}).findByText('Biển đẹp').should('be.visible');
      cy.findByRole('button', {name: new RegExp('^' + t('destinations.historyOpen') + ': Nơi mát mẻ')}).click();

      cy.findByText('Thác Datanla').should('be.visible');
      cy.findByLabelText(t('destinations.query')).should('have.value', 'Nơi mát mẻ');
    });

    it('deletes a suggestion only after the user confirms', () => {
      const calls = open({
        'GET /destinations/history': {items: [past('a', 'draft', 'Nơi mát mẻ')]},
        'DELETE /destinations/history/a': {message: 'ok'},
      });

      cy.findByRole('button', {name: new RegExp('^' + t('destinations.historyDelete') + ': ')}).click();
      cy.findByText(t('destinations.historyDeleteTitle')).should('be.visible');
      expectNoCall(calls, 'DELETE', '/destinations/history/a');
      cy.findByRole('button', {name: t('destinations.historyDelete')}).click();
      cy.findByText(t('destinations.historyDeleted')).should('be.visible');
      expectCall(calls, 'DELETE', '/destinations/history/a');
    });

    it('says so when there is no history yet', () => {
      open();
      cy.findByText(t('destinations.historyEmpty')).should('be.visible');
    });

    it('moves the suggestion to created when a plan is started from it', () => {
      const calls = open({'POST /destinations/recommend': recommendations, 'PATCH /destinations/history/h1': {message: 'ok'}});
      ask();
      cy.findByRole('button', {name: t('destinations.planTripFor', {name: 'Thác Datanla'})}).click();
      cy.location('pathname').should('eq', '/assistant/trips/new');
      expectCall(calls, 'PATCH', '/destinations/history/h1').its('body').should('deep.include', {status: 'created'});
      // the form tells where it came from
      cy.findByText(t('trips.create.fromSuggestion')).should('be.visible');
    });
  });
});
