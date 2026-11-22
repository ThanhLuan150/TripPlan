import {ranking} from '../support/fixtures';
import {mockApi, signIn, t, visit} from '../support/helpers';

const api = {
  'GET /rankings/rankingUserHighest': {dataRanks: ranking},
  'GET /rankings/weekly': {dataRanks: []},
  'GET /rankings/monthly': {dataRanks: [{_id: 'u9', fullname: 'Mai', experience: 300}]},
};

describe('ranking', () => {
  beforeEach(() => {
    signIn();
  });

  it('starts with the all-time ranking, everyone listed', () => {
    mockApi(api);
    visit('/ranking');

    cy.findByRole('tab', {name: t('ranking.highest')}).should('have.attr', 'aria-selected', 'true');
    cy.findAllByRole('listitem').should('have.length', ranking.length);
    cy.findAllByText(t('ranking.points', {count: 2500})).first().should('be.visible');
  });

  it('gives a title to each rank of points', () => {
    mockApi(api);
    visit('/ranking');

    const row = (name: string) => cy.findAllByRole('listitem').filter(`:contains("${name}")`);
    row('Bảo').should('contain.text', t('ranking.titleLegend'));
    row('Cúc').should('contain.text', t('ranking.titleKnight'));
    row('Yến').should('contain.text', t('ranking.titleRookie'));
  });

  it('switches between the periods', () => {
    mockApi(api);
    visit('/ranking');
    cy.findAllByText('Tuấn').first().should('be.visible');

    cy.findByRole('tab', {name: t('ranking.weekly')}).click();
    cy.findByText(t('ranking.empty')).should('be.visible');
    cy.findByRole('tab', {name: t('ranking.weekly')}).should('have.attr', 'aria-selected', 'true');

    cy.findByRole('tab', {name: t('ranking.monthly')}).click();
    cy.findAllByText('Mai').first().should('be.visible');
    cy.findByText(t('ranking.empty')).should('not.exist');
  });
});
