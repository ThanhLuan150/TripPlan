import {mockModeration} from '@/__tests__/fixtures/admin/data';
import {openAdmin} from '../../support/admin';
import {expectCall, expectNoCall, reply, t} from '../../support/helpers';

const pending = mockModeration.filter(item => item.status === 'pending');
// the reports are the only list of the page content
const items = () => cy.findByRole('main').findAllByRole('listitem');
const tab = (status: string) => cy.findByRole('button', {name: new RegExp(`^${t(`admin.status.${status}`)}`)});

describe('admin: moderation', () => {
  it('shows the pending reports, six per page, with their counts', () => {
    openAdmin('/admin/moderation');

    items().should('have.length', 6);
    cy.findByText(t('admin.pagination.summary', {from: 1, to: 6, total: 8})).should('be.visible');
    items().first().should('contain.text', pending[0].content);
    tab('pending').should('have.attr', 'aria-pressed', 'true');
    tab('approved').should('contain.text', '3');
    tab('rejected').should('contain.text', '3');
  });

  it('decided reports show their outcome and no buttons', () => {
    openAdmin('/admin/moderation');
    items().should('have.length', 6);

    tab('approved').click();

    items().should('have.length', 3);
    items().first().should('contain.text', t('admin.status.approved')).find('button').should('not.exist');
  });

  it('goes back to the first page when the tab changes', () => {
    openAdmin('/admin/moderation');
    cy.findByRole('button', {name: t('admin.pagination.next')}).click();
    items().should('have.length', 2);

    tab('approved').click();
    tab('pending').click();

    items().should('have.length', 6);
  });

  it('filters by type and searches', () => {
    openAdmin('/admin/moderation');
    items().should('have.length', 6);

    cy.findByLabelText(t('admin.moderation.type')).pick('video');
    items().should('have.length', pending.filter(item => item.type === 'video').length);

    cy.findByLabelText(t('admin.moderation.type')).pick('all');
    cy.findByRole('searchbox', {name: t('admin.moderation.search')}).type('zzzz');
    cy.findByText(t('admin.common.noResults')).should('be.visible');
  });

  it('asks before approving, then approves', () => {
    const calls = openAdmin('/admin/moderation', {
      [`PATCH /admin/moderation/${pending[0].id}`]: {...pending[0], status: 'approved'},
    });
    const approve = () => cy.findByRole('button', {name: t('admin.moderation.approveItem', {name: pending[0].content})});

    approve().click();
    cy.findByRole('alertdialog', {name: t('admin.moderation.approveTitle')})
      .should('contain.text', t('admin.moderation.approveText'))
      .findByRole('button', {name: t('common.cancel')})
      .click();
    expectNoCall(calls, 'PATCH');

    approve().click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.moderation.approve')}).click();

    cy.findByText(t('admin.moderation.approved')).should('be.visible');
    expectCall(calls, 'PATCH', `/admin/moderation/${pending[0].id}`).its('body').should('deep.equal', {status: 'approved'});
  });

  it('asks before rejecting', () => {
    const calls = openAdmin('/admin/moderation', {
      [`PATCH /admin/moderation/${pending[0].id}`]: {...pending[0], status: 'rejected'},
    });

    cy.findByRole('button', {name: t('admin.moderation.rejectItem', {name: pending[0].content})}).click();
    cy.findByRole('alertdialog', {name: t('admin.moderation.rejectTitle')}).findByRole('button', {name: t('admin.moderation.reject')}).click();

    cy.findByText(t('admin.moderation.rejected')).should('be.visible');
    expectCall(calls, 'PATCH', `/admin/moderation/${pending[0].id}`).its('body').should('deep.equal', {status: 'rejected'});
  });

  it('shows the message of the backend when the decision fails', () => {
    openAdmin('/admin/moderation', {
      [`PATCH /admin/moderation/${pending[0].id}`]: reply(404, {message: 'Report not found'}),
    });

    cy.findByRole('button', {name: t('admin.moderation.approveItem', {name: pending[0].content})}).click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.moderation.approve')}).click();

    cy.findByText('Report not found').should('be.visible');
  });

  it('shows the empty state when there is nothing at all', () => {
    openAdmin('/admin/moderation', {'GET /admin/moderation': []});

    cy.findByText(t('admin.common.noResults')).should('be.visible');
  });
});
