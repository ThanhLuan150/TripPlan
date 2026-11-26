import {fixDate, mockApi, signIn, t, visit} from '../../support/helpers';

const key = 'draft:createTrip:lan123';
const pickProvince = () => {
  cy.get('#province').type('lam');
  cy.findByRole('listbox').findByRole('button', {name: 'Lâm Đồng'}).click();
};

// An unfinished plan form is kept in the browser: a reload or leaving the page does not lose it.
describe('create trip: draft', () => {
  beforeEach(() => {
    fixDate(new Date(2026, 2, 2, 9, 0));
    signIn();
    mockApi();
  });

  it('does not offer anything when nothing was typed', () => {
    visit('/assistant/trips/new');
    cy.get('#province').should('have.value', '');
    cy.findByText(t('drafts.found')).should('not.exist');
  });

  it('offers what was typed after a reload and puts it back with Continue', () => {
    visit('/assistant/trips/new');
    pickProvince();
    cy.findByRole('button', {name: t('trips.create.areaOutdoor')}).click();
    cy.window().should(win => expect(win.localStorage.getItem(key)).to.contain('Lâm Đồng'));

    cy.reload();
    cy.findByText(t('drafts.found')).should('be.visible');
    cy.get('#province').should('have.value', '');
    cy.findByRole('button', {name: t('drafts.continue')}).click();

    cy.get('#province').should('have.value', 'Lâm Đồng');
    cy.findByRole('button', {name: t('trips.create.areaOutdoor')}).should('have.attr', 'aria-pressed', 'true');
    cy.findByText(t('drafts.found')).should('not.exist');
  });

  it('Start new throws the draft away', () => {
    visit('/assistant/trips/new', {
      onBeforeLoad: win =>
        win.localStorage.setItem(key, JSON.stringify({savedAt: Date.now(), value: {location: 'Huế', startDate: '2026-03-02', endDate: '2026-03-02', quantity: 1, budgetTier: '', interests: [], note: ''}})),
    });
    cy.findByRole('button', {name: t('drafts.startNew')}).click();
    cy.get('#province').should('have.value', '');
    cy.window().should(win => expect(win.localStorage.getItem(key)).to.eq(null));
  });

  it('links to the AI destination ideas', () => {
    visit('/assistant/trips/new');
    cy.findByRole('button', {name: t('trips.create.askAi')}).click();
    cy.location('pathname').should('eq', '/assistant/recommend');
  });
});
