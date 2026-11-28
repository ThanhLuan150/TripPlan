import {expectCall, mockApi, reply, signIn, t, visit} from '../../support/helpers';

const card = (id: string, nameTrip: string, extra: Record<string, unknown> = {}) => ({
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
  ...extra,
});

const everything = {page: 1, limit: 12, total: 2, items: [card('a1', 'Đà Lạt 3 ngày'), card('b2', 'Huế 2 ngày')]};

// the mocked list answers the keyword it was asked for
const list = (call: {query: Record<string, string>}) => {
  const {q, page} = call.query;
  if (!q) {
    return everything;
  }
  if (q === 'zzz') {
    return {q, page: 1, limit: 12, total: 0, items: []};
  }
  return {q, page: Number(page ?? 1), limit: 1, total: 2, items: [card(`h${page ?? 1}`, `Huế plan ${page ?? 1}`, {postContent: 'Sông Hương và cơm hến'})]};
};

const searchBox = () => cy.findByRole('searchbox', {name: t('trips.explore.searchLabel')});

describe('search posts', () => {
  beforeEach(() => {
    signIn();
  });

  it('has a search box above the list of public plans', () => {
    mockApi({'GET /public-trip': list});
    visit('/explore');

    searchBox().should('be.visible').and('have.attr', 'placeholder', t('trips.explore.searchPlaceholder')).and('have.attr', 'maxlength', '100');
    cy.findByText('Đà Lạt 3 ngày').should('be.visible');
  });

  it('searches while typing and shows the matching plans with their count', () => {
    const calls = mockApi({'GET /public-trip': list});
    visit('/explore');

    searchBox().type('huế');

    cy.findByText('Huế plan 1').should('be.visible');
    cy.findByText('Sông Hương và cơm hến').should('be.visible');
    cy.findByRole('status').should('contain.text', t('trips.explore.results', {q: 'huế', count: 2}));
    cy.location('search').should('eq', `?q=${encodeURIComponent('huế')}`);
    expectCall(calls, 'GET', '/public-trip').its('query').should('deep.include', {page: '1'});
  });

  it('Enter searches at once, with the spaces around the keyword removed', () => {
    const calls = mockApi({'GET /public-trip': list});
    visit('/explore');

    searchBox().type('  huế  {enter}');

    cy.findByText('Huế plan 1').should('be.visible');
    cy.wrap(calls).should(all => expect(all.some(call => call.query.q === 'huế')).to.eq(true));
  });

  it('pages the results of a search', () => {
    const calls = mockApi({'GET /public-trip': list});
    visit('/explore');

    searchBox().type('huế{enter}');
    cy.findByText('Huế plan 1').should('be.visible');
    cy.findByRole('button', {name: t('trips.explore.next')}).click();

    cy.findByText('Huế plan 2').should('be.visible');
    cy.wrap(calls).should(all => expect(all.some(call => call.query.q === 'huế' && call.query.page === '2')).to.eq(true));
    cy.findByRole('button', {name: t('trips.explore.next')}).should('be.disabled');
  });

  it('says so when nothing matches and clearing the keyword brings the whole list back', () => {
    mockApi({'GET /public-trip': list});
    visit('/explore');

    searchBox().type('zzz{enter}');
    cy.findByText(t('trips.explore.noResults', {q: 'zzz'})).should('be.visible');
    cy.findByText(t('trips.explore.noResultsHint')).should('be.visible');

    cy.findAllByRole('button', {name: t('trips.explore.clearSearch')}).last().click();

    cy.findByText('Đà Lạt 3 ngày').should('be.visible');
    searchBox().should('have.value', '');
    cy.location('search').should('eq', '');
  });

  it('the x of the box clears the keyword and shows the full list', () => {
    mockApi({'GET /public-trip': list});
    visit('/explore');
    searchBox().type('huế{enter}');
    cy.findByText('Huế plan 1').should('be.visible');

    cy.findAllByRole('button', {name: t('trips.explore.clearSearch')}).first().click();

    cy.findByText('Đà Lạt 3 ngày').should('be.visible');
    cy.findByRole('button', {name: t('trips.explore.clearSearch')}).should('not.exist');
  });

  it('opens with the keyword of the address', () => {
    mockApi({'GET /public-trip': list});
    visit('/explore?q=hu%E1%BA%BF');

    cy.findByText('Huế plan 1').should('be.visible');
    searchBox().should('have.value', 'huế');
  });

  it('a keyword of only spaces does not search', () => {
    const calls = mockApi({'GET /public-trip': list});
    visit('/explore');
    cy.findByText('Đà Lạt 3 ngày').should('be.visible');

    searchBox().type('   {enter}');

    cy.wrap(calls).should(all => expect(all.filter(call => call.path === '/public-trip').every(call => !call.query.q)).to.eq(true));
  });

  it('shows an error when the search fails and lets the user try again', () => {
    mockApi({'GET /public-trip': (call: {query: Record<string, string>}) => (call.query.q ? reply(500, {message: 'boom'}) : everything)});
    visit('/explore');
    cy.findByText('Đà Lạt 3 ngày').should('be.visible');

    searchBox().type('lạt{enter}');

    cy.findByRole('alert').should('contain.text', t('trips.explore.searchFailed'));
    cy.findByRole('button', {name: t('common.retry')}).should('be.visible');
  });

});
