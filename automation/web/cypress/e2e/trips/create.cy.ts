import {fixDate, mockApi, RED_BORDER, signIn, t, visit} from '../../support/helpers';

const date = (iso: string) => cy.get(`[data-date="${iso}"]`);
const startButton = () => cy.findByRole('button', {name: t('trips.create.startDate')});
const endButton = () => cy.findByRole('button', {name: t('trips.create.endDate')});
const submit = () => cy.findByRole('button', {name: t('trips.create.submit')}).click();

const pickProvince = () => {
  cy.get('#province').type('lam');
  cy.findByRole('listbox').findByRole('button', {name: 'Lâm Đồng'}).click();
};

// Trip planning form: its own field components, the calendar, and a required
// choice in every field.
describe('create trip', () => {
  beforeEach(() => {
    // 9:00, Monday 2 March 2026: the calendars and "too late today" are predictable
    fixDate(new Date(2026, 2, 2, 9, 0));
    signIn();
    mockApi();
    visit('/assistant/trips/new');
  });

  it('lists what is missing, field by field, after Submit', () => {
    submit();

    cy.findByText(t('trips.create.errorProvince')).should('be.visible');
    cy.findByText(t('trips.create.errorMissing')).should('be.visible');
    cy.findByText(t('trips.create.errorInterests')).should('be.visible');
    cy.get('#province').should('have.css', 'border-top-color', RED_BORDER);
  });

  it('every error goes away when its field is filled', () => {
    submit();
    cy.findByText(t('trips.create.errorProvince')).should('be.visible');

    pickProvince();
    cy.findByRole('radio', {name: new RegExp(t('trips.create.budgetLow'))}).click();
    cy.findByRole('button', {name: t('trips.create.areaHistory')}).click();

    cy.findAllByRole('alert').should('have.length', 0);
  });

  it('a destination that is not a province is refused', () => {
    cy.get('#province').type('Sài Gòn');
    submit();

    cy.findByText(t('trips.create.errorProvince')).should('be.visible');
  });

  it('the dates use a calendar, not the browser date input', () => {
    cy.get('input[type="date"]').should('not.exist');
    startButton().should('have.text', '02/03/2026');

    startButton().click();
    cy.findByRole('dialog').should('be.visible');
    // days in the past cannot be picked
    date('2026-03-01').should('be.disabled');
    date('2026-03-10').click();

    cy.findByRole('dialog').should('not.exist');
    startButton().should('have.text', '10/03/2026');
    // the end date follows, and cannot be before the start
    endButton().should('have.text', '10/03/2026');
    endButton().click();
    date('2026-03-09').should('be.disabled');
  });

  it('a trip of more than 7 days marks the end date', () => {
    endButton().click();
    date('2026-03-12').click();

    cy.findByText(t('trips.create.errorMaxDays')).should('be.visible');
    endButton().should('have.css', 'border-top-color', RED_BORDER);
  });

  it('the calendar closes with Escape', () => {
    startButton().click();
    cy.findByRole('dialog').should('be.visible');

    cy.focused().type('{esc}');

    cy.findByRole('dialog').should('not.exist');
  });

  it('keeps the number of people between 1 and 10', () => {
    cy.get('#quantity').clear().type('15').blur();

    cy.get('#quantity').should('have.value', '10');
    cy.findByRole('button', {name: t('trips.create.increase')}).should('be.disabled');
  });

  it('a complete form opens the AI suggestions with its values', () => {
    pickProvince();
    cy.findByRole('radio', {name: new RegExp(t('trips.create.budgetMid'))}).click();
    cy.findByRole('button', {name: t('trips.create.areaOutdoor')}).click();
    cy.get('#note').type('ăn lẩu gà lá é');
    cy.findByText('14/1500').should('be.visible');

    submit();

    cy.location('pathname').should('eq', '/assistant/trips/generate');
  });
});
