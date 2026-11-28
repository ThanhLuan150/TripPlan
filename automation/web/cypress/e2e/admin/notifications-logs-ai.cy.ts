import {mockActivityLogs, mockAiOverview, mockAnnouncements} from '@/__tests__/fixtures/admin/data';
import {announcementState} from '@/features/admin/notifications/state';
import {bodyRows, openAdmin} from '../../support/admin';
import {callsTo, expectCall, expectNoCall, reply, stubDownloads, t} from '../../support/helpers';

const item = mockAnnouncements[0];
const saveButton = () => cy.findByRole('button', {name: t('admin.users.dialogs.saveChanges')});

describe('admin: notifications', () => {
  it('lists the notifications with their time and status', () => {
    openAdmin('/admin/notifications');

    cy.findByRole('table', {name: t('admin.notifications.title')}).should('be.visible');
    bodyRows().should('have.length', 8);
    cy.findByText(t('admin.pagination.summary', {from: 1, to: 8, total: 12})).should('be.visible');
    bodyRows().first().should('contain.text', item.title).and('contain.text', t('admin.status.scheduled'));
  });

  it('filters by status and searches', () => {
    openAdmin('/admin/notifications');
    bodyRows().should('have.length', 8);

    cy.findByLabelText(t('admin.notifications.columns.status')).pick('scheduled');
    bodyRows().should('have.length', 3);

    cy.findByLabelText(t('admin.notifications.columns.status')).pick('draft');
    bodyRows().should('have.length', mockAnnouncements.filter(a => announcementState(a) === 'draft').length);

    cy.findByLabelText(t('admin.notifications.columns.status')).pick('all');
    cy.findByRole('searchbox', {name: t('admin.notifications.search')}).type('hoan thanh ho so');
    bodyRows().should('have.length', 1);
  });

  it('writes a notification: the title is required', () => {
    const calls = openAdmin('/admin/notifications', {'POST /admin/announcements': {...item, id: 'new'}});
    cy.findByRole('button', {name: t('admin.notifications.create')}).click();
    const dialog = () => cy.findByRole('dialog', {name: t('admin.notifications.create')});

    saveButton().click();
    dialog().findByText(t('admin.notifications.errors.titleRequired')).should('be.visible');
    expectNoCall(calls, 'POST');

    dialog().findByLabelText(t('admin.notifications.columns.title')).type('Bảo trì');
    dialog().findByLabelText(t('admin.notifications.fields.message')).type('Tối nay 22h');
    dialog().findByLabelText(t('admin.common.status')).pick('published');
    saveButton().click();

    cy.findByText(t('admin.notifications.created')).should('be.visible');
    expectCall(calls, 'POST', '/admin/announcements').its('body').should('deep.include', {title: 'Bảo trì', message: 'Tối nay 22h', status: 'published'});
  });

  it('edits a notification', () => {
    const calls = openAdmin('/admin/notifications', {[`PATCH /admin/announcements/${item.id}`]: item});
    cy.findByRole('button', {name: t('admin.common.editItem', {name: item.title})}).click();

    cy.findByRole('dialog', {name: t('admin.notifications.edit')}).findByLabelText(t('admin.notifications.columns.title')).clear().type('Tiêu đề mới');
    saveButton().click();

    cy.findByText(t('admin.notifications.updated')).should('be.visible');
    expectCall(calls, 'PATCH', `/admin/announcements/${item.id}`).its('body').should('deep.include', {title: 'Tiêu đề mới'});
  });

  it('deletes after asking', () => {
    const calls = openAdmin('/admin/notifications', {[`DELETE /admin/announcements/${item.id}`]: {message: 'ok'}});

    cy.findByRole('button', {name: t('admin.common.deleteItem', {name: item.title})}).click();
    cy.findByRole('alertdialog', {name: t('admin.notifications.deleteTitle')}).should('be.visible');
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText(t('admin.notifications.deleted', {name: item.title})).should('be.visible');
    cy.wrap(calls).should(list => expect(callsTo(list, 'DELETE', `/admin/announcements/${item.id}`)).to.have.length(1));
  });
});

describe('admin: activity log', () => {
  it('shows 10 entries per page, newest first', () => {
    openAdmin('/admin/activity-logs');

    cy.findByRole('table', {name: t('admin.activityLogs.title')}).should('be.visible');
    bodyRows().should('have.length', 10);
    cy.findByText(t('admin.pagination.summary', {from: 1, to: 10, total: 42})).should('be.visible');
    bodyRows().first().should('contain.text', mockActivityLogs[0].actor);
  });

  it('filters by level and by action', () => {
    openAdmin('/admin/activity-logs');
    bodyRows().should('have.length', 10);

    cy.findByLabelText(t('admin.activityLogs.columns.level')).pick('warning');
    bodyRows().should('have.length', mockActivityLogs.filter(l => l.level === 'warning').length);

    cy.findByLabelText(t('admin.activityLogs.columns.level')).pick('all');
    cy.findByLabelText(t('admin.activityLogs.columns.action')).pick('deleteUser');
    bodyRows().should('have.length', Math.min(10, mockActivityLogs.filter(l => l.action === 'deleteUser').length));
  });

  it('searches by IP address, and an empty result can be reset', () => {
    openAdmin('/admin/activity-logs');

    cy.findByRole('searchbox', {name: t('admin.activityLogs.search')}).type('khong ton tai');
    cy.findByText(t('admin.common.noResults')).should('be.visible');
    cy.findAllByRole('button', {name: t('admin.common.resetFilters')}).last().click();

    bodyRows().should('have.length', 10);
  });

  it('exports the filtered log as a PDF file', () => {
    const calls = openAdmin('/admin/activity-logs', {'POST /admin/export/pdf': {}});
    bodyRows().should('have.length', 10);
    const downloads = stubDownloads();

    cy.findByRole('button', {name: t('admin.common.export')}).click();

    cy.wrap(downloads).should(names => expect(names[0]).to.match(/\.pdf$/));
    expectCall(calls, 'POST', '/admin/export/pdf').its('body').should('include', {title: t('admin.export.logs.title')});
  });

  it('shows the error when the PDF cannot be made', () => {
    openAdmin('/admin/activity-logs', {'POST /admin/export/pdf': reply(500, {message: 'boom'})});
    bodyRows().should('have.length', 10);

    cy.findByRole('button', {name: t('admin.common.export')}).click();

    cy.findByText(t('admin.common.actionFailed')).should('be.visible');
  });
});

describe('admin: AI usage', () => {
  const chat = mockAiOverview.chats[0];

  it('shows the usage figures, the daily chart and the conversations', () => {
    openAdmin('/admin/ai');

    cy.findByText('21.430').should('be.visible');
    cy.findByText('9.870').should('be.visible');
    cy.findByText(t('admin.common.showTable')).click();
    cy.findByRole('table', {name: t('admin.ai.dailyMessages')}).should('be.visible');
    bodyRows(t('admin.ai.conversations')).should('have.length', 8);
    cy.findByText(t('admin.pagination.summary', {from: 1, to: 8, total: 26})).should('be.visible');
    bodyRows(t('admin.ai.conversations')).first().should('contain.text', chat.title);
  });

  it('searches by user and title', () => {
    openAdmin('/admin/ai');
    bodyRows(t('admin.ai.conversations')).should('have.length', 8);

    cy.findByRole('searchbox', {name: t('admin.ai.search')}).type(chat.user);

    bodyRows(t('admin.ai.conversations')).first().should('contain.text', chat.user);
  });
});
