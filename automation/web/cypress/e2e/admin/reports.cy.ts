import {openAdmin} from '../../support/admin';
import {callsTo, stubDownloads, t} from '../../support/helpers';

const number = new Intl.NumberFormat('vi');

describe('admin: reports', () => {
  it('shows the last 30 days and the figures of the period', () => {
    openAdmin('/admin/reports');

    cy.findByLabelText(t('admin.reports.period')).should('have.value', '30d');
    cy.findByText(number.format(1763)).should('be.visible');
    cy.findByText('64%').should('be.visible');
  });

  it('breaks trips down by province', () => {
    openAdmin('/admin/reports');

    cy.findByRole('table', {name: t('admin.reports.byProvince')}).within(() => {
      cy.findAllByRole('row').should('have.length', 8);
      cy.findByText('Lâm Đồng').should('be.visible');
    });
  });

  it('asks the API for the chosen period', () => {
    const calls = openAdmin('/admin/reports');
    cy.findByText(number.format(1763)).should('be.visible');

    cy.findByLabelText(t('admin.reports.period')).select('7d');

    cy.findByText('410').should('be.visible');
    cy.wrap(calls).should(list => expect(callsTo(list, 'GET', '/admin/reports').map(call => call.query.period)).to.deep.eq(['30d', '7d']));
  });

  it('exports the report as a CSV file', () => {
    openAdmin('/admin/reports');
    cy.findByText(number.format(1763)).should('be.visible');
    const downloads = stubDownloads();

    cy.findByRole('button', {name: t('admin.common.export')}).click();

    cy.wrap(downloads).should(names => expect(names[0]).to.match(/\.csv$/));
  });
});
