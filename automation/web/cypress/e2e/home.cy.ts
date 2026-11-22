import {announcements, homeContent, ranking, videos} from '../support/fixtures';
import {mockApi, signIn, t, visit} from '../support/helpers';

const api = {
  'GET /home': homeContent,
  'GET /videos': videos,
  'GET /rankings/rankingUserHighest': {dataRanks: ranking},
  'GET /announcements': announcements,
};

describe('home page', () => {
  beforeEach(() => {
    signIn();
  });

  it('greets the user by name and links to the account', () => {
    mockApi(api);
    visit('/home');

    cy.findByRole('heading', {name: /Lan Nguyễn/}).should('be.visible');
    cy.findAllByRole('link', {name: t('nav.account')}).first().should('have.attr', 'href', '/profile');
  });

  it('shows the banners and the suggestions of the admin', () => {
    mockApi(api);
    visit('/home');

    cy.findByRole('img', {name: 'Banner 1'}).should('exist');
    cy.findByRole('button', {name: t('home.planFor', {place: 'Đà Lạt'})}).should('be.visible');
  });

  it('a suggestion with a province starts a plan for it; one without is not clickable', () => {
    mockApi(api);
    visit('/home');

    cy.findByRole('button', {name: 'Biển xanh'}).should('be.disabled');
    cy.findByRole('button', {name: t('home.planFor', {place: 'Đà Lạt'})}).click();

    cy.location('pathname').should('eq', '/assistant/trips/new');
    // the form is pre-filled with the province
    cy.get('#province').should('have.value', 'Lâm Đồng');
  });

  it('the search box starts a plan for that destination', () => {
    mockApi(api);
    visit('/home');

    cy.findByRole('searchbox', {name: t('home.search')}).type('Đà Lạt{enter}');

    cy.location('pathname').should('eq', '/assistant/trips/new');
    cy.get('#province').should('have.value', 'Đà Lạt');
  });

  it('badges the notifications that were not opened yet', () => {
    mockApi(api);
    visit('/home');

    cy.findByLabelText(t('home.unread', {count: 2})).should('have.text', '2');
  });

  it('opening the notifications clears the badge', () => {
    mockApi(api);
    visit('/home');
    cy.findByLabelText(t('home.unread', {count: 2})).click();

    cy.location('pathname').should('eq', '/notification');
    cy.findByText('Chào mừng Aloca').should('be.visible');
    visit('/home');
    cy.findByRole('heading', {name: /Lan Nguyễn/}).should('be.visible');
    cy.findByLabelText(t('home.unread', {count: 2})).should('not.exist');
  });

  it('plays a featured video in the app, without leaving the page', () => {
    mockApi(api);
    visit('/home');

    cy.findByRole('button', {name: t('videos.play', {title: 'Fansipan'})}).click();

    cy.findByRole('dialog', {name: 'Fansipan'})
      .findByTitle('Fansipan')
      .should('have.attr', 'src')
      .and('match', /youtube-nocookie\.com\/embed\/aaaaaaaaaaa/);
    cy.get('body').type('{esc}');
    cy.findByRole('dialog').should('not.exist');
    cy.location('pathname').should('eq', '/home');
  });

  it('shows the top players', () => {
    mockApi(api);
    visit('/home');

    cy.findAllByText('Tuấn').first().should('be.visible');
    cy.findAllByText('Bảo').first().should('be.visible');
  });

  it('tells when the admin has not published anything yet', () => {
    mockApi({
      'GET /home': {banners: [], suggestions: []},
      'GET /videos': [],
      'GET /rankings/rankingUserHighest': {dataRanks: []},
      'GET /announcements': [],
    });
    visit('/home');

    // (the banner text is hidden on phone-sized screens by design)
    cy.findByText(t('home.bannersEmpty')).should('exist');
    cy.findByText(t('home.suggestionsEmpty')).should('be.visible');
    cy.findByText(t('home.videosEmpty')).should('be.visible');
    cy.findByText(t('home.rankingEmpty')).should('be.visible');
  });

  it('the main navigation moves between the screens', () => {
    mockApi(api);
    visit('/home');
    const nav = () => cy.findAllByRole('navigation', {name: t('nav.main')}).filter(':visible').first();

    nav().findByRole('link', {name: t('nav.ranking')}).click();
    cy.location('pathname').should('eq', '/ranking');
    nav().findByRole('link', {name: t('nav.account')}).click();
    cy.location('pathname').should('eq', '/profile');
    nav().findByRole('link', {name: t('nav.home')}).click();
    cy.location('pathname').should('eq', '/home');
  });
});
