import {mockVideos} from '@/__tests__/fixtures/admin/data';
import {openAdmin} from '../../support/admin';
import {callsTo, expectCall, expectNoCall, t} from '../../support/helpers';

const video = mockVideos[0];
const cards = () => cy.findByRole('list', {name: t('admin.videos.title')}).findAllByRole('listitem');
const saveButton = () => cy.findByRole('button', {name: t('admin.users.dialogs.saveChanges')});

describe('admin: videos', () => {
  it('shows a grid of video cards', () => {
    openAdmin('/admin/videos');

    cards().should('have.length', 8);
    cy.findByText(t('admin.pagination.summary', {from: 1, to: 8, total: 15})).should('be.visible');
    cards().first().should('contain.text', video.title).and('contain.text', '0:25');
  });

  it('filters by status, goes to the second page and searches', () => {
    openAdmin('/admin/videos');
    cards().should('have.length', 8);

    cy.findByLabelText(t('admin.common.status')).pick('hidden');
    cards().should('have.length', mockVideos.filter(v => v.status === 'hidden').length);

    cy.findByLabelText(t('admin.common.status')).pick('all');
    cy.findByRole('button', {name: t('admin.pagination.next')}).click();
    cards().should('have.length', 7);

    cy.findByRole('searchbox', {name: t('admin.videos.search')}).type('fansipan');
    cards().should('have.length', 1);
  });

  it('says so when nothing matches', () => {
    openAdmin('/admin/videos');
    cards().should('have.length', 8);

    cy.findByRole('searchbox', {name: t('admin.videos.search')}).type('khong co video');

    cy.findByText(t('admin.common.noResults')).should('be.visible');
  });

  it('adds a video: the form checks the title and the link', () => {
    const calls = openAdmin('/admin/videos', {'POST /admin/videos': {...video, id: 'new'}});
    cy.findByRole('button', {name: t('admin.videos.add')}).click();
    const dialog = () => cy.findByRole('dialog', {name: t('admin.videos.add')});

    dialog().findByLabelText(t('admin.videos.fields.youtubeLink')).type('not a link');
    saveButton().click();
    dialog().findByText(t('admin.videos.errors.titleRequired')).should('be.visible');
    dialog().findByText(t('admin.videos.errors.linkInvalid')).should('be.visible');
    expectNoCall(calls, 'POST');

    dialog().findByLabelText(t('admin.videos.fields.title')).type('Video mới');
    dialog().findByLabelText(t('admin.videos.fields.youtubeLink')).clear().type('https://youtu.be/abcdefghijk');
    dialog().findByLabelText(t('admin.videos.fields.showOnHome')).check();
    saveButton().click();

    cy.findByText(t('admin.videos.created')).should('be.visible');
    expectCall(calls, 'POST', '/admin/videos').its('body').should('deep.equal', {
      title: 'Video mới',
      location: '',
      youtubeLink: 'https://youtu.be/abcdefghijk',
      durationSec: 0,
      showOnHome: true,
      status: 'published',
    });
  });

  it('the duration must be a whole number of seconds', () => {
    openAdmin('/admin/videos');
    cy.findByRole('button', {name: t('admin.videos.add')}).click();
    const dialog = () => cy.findByRole('dialog', {name: t('admin.videos.add')});

    dialog().findByLabelText(t('admin.videos.fields.title')).type('Video');
    dialog().findByLabelText(t('admin.videos.fields.duration')).clear().type('-5');
    saveButton().click();

    dialog().findByText(t('admin.videos.errors.duration')).should('be.visible');
  });

  it('edits a video', () => {
    const calls = openAdmin('/admin/videos', {[`PATCH /admin/videos/${video.id}`]: {...video, status: 'hidden'}});
    cy.findByRole('button', {name: t('admin.common.editItem', {name: video.title})}).click();
    const dialog = () => cy.findByRole('dialog', {name: t('admin.videos.edit')});

    dialog().findByLabelText(t('admin.videos.fields.title')).should('have.value', video.title);
    dialog().findByLabelText(t('admin.common.status')).pick('hidden');
    saveButton().click();

    cy.findByText(t('admin.videos.updated')).should('be.visible');
    expectCall(calls, 'PATCH', `/admin/videos/${video.id}`).its('body').should('deep.include', {status: 'hidden', title: video.title});
  });

  it('deletes after asking', () => {
    const calls = openAdmin('/admin/videos', {[`DELETE /admin/videos/${video.id}`]: {message: 'ok'}});

    cy.findByRole('button', {name: t('admin.common.deleteItem', {name: video.title})}).click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText(t('admin.videos.deleted', {name: video.title})).should('be.visible');
    cy.wrap(calls).should(list => expect(callsTo(list, 'DELETE', `/admin/videos/${video.id}`)).to.have.length(1));
  });
});
