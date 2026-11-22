import {generatedPlans, tripDetail} from '../../support/fixtures';
import {expectCall, expectNoCall, fixDate, mockApi, reply, signIn, t, visit} from '../../support/helpers';

// Step 2 of a new plan: the AI suggestions. The page needs the values of the
// form, so every test fills the form first (like a user does).
const openSuggestions = () => {
  visit('/assistant/trips/new');
  cy.get('#province').type('lam');
  cy.findByRole('listbox').findByRole('button', {name: 'Lâm Đồng'}).click();
  cy.findByRole('radio', {name: new RegExp(t('trips.create.budgetMid'))}).click();
  cy.findByRole('button', {name: t('trips.create.areaOutdoor')}).click();
  cy.findByRole('button', {name: t('trips.create.submit')}).click();
};
const choose = () => cy.findAllByRole('button', {name: t('trips.generate.choose')}).first().click();

describe('AI suggestions', () => {
  beforeEach(() => {
    fixDate(new Date(2026, 2, 2, 9, 0));
    signIn();
  });

  it('sends the form values to the AI and shows every plan with its days', () => {
    const calls = mockApi({'POST /trip-plan/': {data: generatedPlans}});
    openSuggestions();

    cy.contains('Hồ Xuân Hương').should('be.visible');
    cy.findByText('Đạp vịt trên hồ').should('be.visible');
    cy.contains('Thung lũng Tình Yêu').should('be.visible');
    cy.findAllByRole('button', {name: t('trips.generate.choose')}).should('have.length', 2);
    expectCall(calls, 'POST', '/trip-plan/')
      .its('body')
      .should('deep.include', {location: 'Lâm Đồng', numberOfPeople: 1, interest: ['Hoạt động ngoài trời']});
  });

  it('saves the chosen plan under a name and opens it', () => {
    const calls = mockApi({
      'POST /trip-plan/': {data: generatedPlans},
      'POST /trip-plan/save-trip': {tripId: 'new1'},
      'GET /trip-plan/get-trip/new1': {tripDatas: tripDetail},
    });
    openSuggestions();

    choose();
    cy.findByRole('textbox', {name: t('trips.generate.nameLabel')}).type('Đà Lạt 2 ngày');
    cy.findByRole('button', {name: t('common.confirm')}).click();

    cy.location('pathname').should('eq', '/assistant/trips/new1');
    expectCall(calls, 'POST', '/trip-plan/save-trip')
      .its('body')
      .should(body => {
        const saved = body as {nameTrip: string; jsonTrip: unknown[]};
        expect(saved.nameTrip).to.eq('Đà Lạt 2 ngày');
        expect(saved.jsonTrip).to.have.length(2);
      });
  });

  it('the name is required, with an error under the field', () => {
    const calls = mockApi({'POST /trip-plan/': {data: generatedPlans}});
    openSuggestions();

    choose();
    cy.findByRole('button', {name: t('common.confirm')}).click();

    cy.findByText(t('trips.generate.nameRequired')).should('be.visible');
    expectNoCall(calls, 'POST', '/trip-plan/save-trip');
  });

  it('the name dialog can be cancelled', () => {
    mockApi({'POST /trip-plan/': {data: generatedPlans}});
    openSuggestions();

    choose();
    cy.findByRole('dialog').should('be.visible');
    cy.findByRole('button', {name: t('common.cancel')}).click();

    cy.findByRole('dialog').should('not.exist');
  });

  it('says when a plan with that name already exists', () => {
    mockApi({
      'POST /trip-plan/': {data: generatedPlans},
      'POST /trip-plan/save-trip': reply(400, {message: 'A trip with the same name already exists'}),
    });
    openSuggestions();

    choose();
    cy.findByRole('textbox', {name: t('trips.generate.nameLabel')}).type('Trùng tên');
    cy.findByRole('button', {name: t('common.confirm')}).click();

    cy.findByText(t('trips.generate.duplicateName')).should('be.visible');
  });

  it('explains a failure of the AI and offers to try again', () => {
    mockApi({'POST /trip-plan/': reply(500)});
    openSuggestions();

    cy.findByText(t('trips.generate.errorTitle'), {timeout: 20_000}).should('be.visible');
    cy.findByRole('button', {name: t('common.retry')}).should('be.visible');
  });

  it('no retry when the dates overlap another trip', () => {
    mockApi({'POST /trip-plan/': reply(400, {message: 'Please choose another day'})});
    openSuggestions();

    cy.findByText(t('trips.generate.overlap'), {timeout: 20_000}).should('be.visible');
    cy.findByRole('button', {name: t('common.retry')}).should('not.exist');
  });

  it('opened without the form values it goes back to the form', () => {
    mockApi();
    visit('/assistant/trips/generate');

    cy.location('pathname').should('eq', '/assistant/trips/new');
  });
});
