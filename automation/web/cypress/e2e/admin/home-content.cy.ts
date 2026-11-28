import {mockShowcase} from '@/__tests__/fixtures/admin/data';
import {openAdmin} from '../../support/admin';
import {callsTo, expectCall, expectNoCall, reply, t} from '../../support/helpers';

const PHOTO = {
  fileName: 'a.png',
  mimeType: 'image/png',
  contents: Cypress.Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
};
const banners = () => cy.findByRole('list', {name: t('admin.showcase.sections.banner')}).findAllByRole('listitem');
const suggestions = () => cy.findByRole('list', {name: t('admin.showcase.sections.suggestion')}).findAllByRole('listitem');
const addButton = (kind: 'banner' | 'suggestion') =>
  cy.findByRole('button', {name: t('admin.showcase.add', {kind: t(`admin.showcase.kinds.${kind}`)})});
const saveButton = () => cy.findByRole('button', {name: t('admin.users.dialogs.saveChanges')});

describe('admin: app home page content', () => {
  it('shows the slider pictures and the suggestions', () => {
    openAdmin('/admin/home');

    banners().should('have.length', 3);
    suggestions().should('have.length', 2);
    banners().eq(2).should('contain.text', t('admin.status.hidden'));
    suggestions().first().should('contain.text', 'Lâm Đồng');
    suggestions().eq(1).should('contain.text', t('admin.showcase.untitled'));
  });

  it('says what the user will see when a section is empty', () => {
    openAdmin('/admin/home', {'GET /admin/showcase': []});

    cy.findByText(t('admin.showcase.empty.banner')).should('be.visible');
    cy.findByText(t('admin.showcase.empty.suggestion')).should('be.visible');
  });

  it('adds a slide: needs a picture, uploads it, saves it', () => {
    const calls = openAdmin('/admin/home', {
      'POST /upload/image': {url: 'https://cdn.example.com/new.jpg'},
      'POST /admin/showcase': {...mockShowcase[0], id: 'new'},
    });
    addButton('banner').click();

    saveButton().click();
    cy.findByRole('dialog').findByText(t('admin.showcase.errors.imageRequired')).should('be.visible');
    expectNoCall(calls, 'POST', '/admin/showcase');
    // a slide has no province
    cy.findByRole('dialog').findByLabelText(t('admin.showcase.fields.location')).should('not.exist');

    cy.findByRole('dialog').find('input[type="file"]').selectFile(PHOTO, {force: true});
    cy.findByRole('dialog').findByLabelText(t('admin.showcase.fields.title')).type(' Hạ Long ');
    saveButton().click();

    cy.findByText(t('admin.showcase.created')).should('be.visible');
    expectCall(calls, 'POST', '/admin/showcase').its('body').should('deep.equal', {
      kind: 'banner',
      imageUrl: 'https://cdn.example.com/new.jpg',
      title: 'Hạ Long',
      location: '',
      sortOrder: 0,
      status: 'published',
    });
  });

  it('adds a suggestion with the province a plan starts for', () => {
    const calls = openAdmin('/admin/home', {
      'POST /upload/image': {url: 'https://cdn.example.com/s.jpg'},
      'POST /admin/showcase': mockShowcase[3],
    });
    addButton('suggestion').click();

    cy.findByRole('dialog').find('input[type="file"]').selectFile(PHOTO, {force: true});
    cy.findByRole('dialog').findByLabelText(t('admin.showcase.fields.location')).type('Ninh Bình');
    cy.findByRole('dialog').findByLabelText(t('admin.common.status')).pick('hidden');
    saveButton().click();

    cy.findByText(t('admin.showcase.created')).should('be.visible');
    expectCall(calls, 'POST', '/admin/showcase').its('body').should('deep.include', {kind: 'suggestion', location: 'Ninh Bình', status: 'hidden'});
  });

  it('validates the order, and shows the message of the backend when saving fails', () => {
    openAdmin('/admin/home', {'PATCH /admin/showcase/sb1': reply(400, {message: 'Invalid imageUrl'})});
    cy.findByRole('button', {name: t('admin.common.editItem', {name: 'Banner 1'})}).click();
    const dialog = () => cy.findByRole('dialog', {name: t('admin.showcase.edit', {kind: t('admin.showcase.kinds.banner')})});
    const order = () => dialog().findByLabelText(t('admin.showcase.fields.order'));

    order().clear().type('99999');
    saveButton().click();
    dialog().findByText(t('admin.showcase.errors.order')).should('be.visible');

    order().clear().type('5');
    saveButton().click();

    dialog().findByRole('alert').should('contain.text', 'Invalid imageUrl');
  });

  it('shows why a picture could not be uploaded', () => {
    openAdmin('/admin/home', {'POST /upload/image': reply(413, {code: 'IMAGE_TOO_LARGE'})});
    cy.findByRole('button', {name: t('admin.common.editItem', {name: 'Banner 1'})}).click();

    cy.findByRole('dialog').find('input[type="file"]').selectFile(PHOTO, {force: true});

    cy.findByRole('dialog').findByText(t('common.imageTooLarge')).should('be.visible');
  });

  it('deletes after asking', () => {
    const calls = openAdmin('/admin/home', {'DELETE /admin/showcase/sb2': {message: 'ok'}});
    const button = () => cy.findByRole('button', {name: t('admin.common.deleteItem', {name: 'Banner 2'})});

    button().click();
    cy.findByRole('alertdialog', {name: t('admin.showcase.deleteTitle')}).findByRole('button', {name: t('common.cancel')}).click();
    expectNoCall(calls, 'DELETE');

    button().click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText(t('admin.showcase.deleted')).should('be.visible');
    cy.wrap(calls).should(list => expect(callsTo(list, 'DELETE', '/admin/showcase/sb2')).to.have.length(1));
  });

  it('shows the message of the backend when deleting fails', () => {
    openAdmin('/admin/home', {'DELETE /admin/showcase/sb2': reply(404, {message: 'Picture not found'})});

    cy.findByRole('button', {name: t('admin.common.deleteItem', {name: 'Banner 2'})}).click();
    cy.findByRole('alertdialog').findByRole('button', {name: t('admin.common.delete')}).click();

    cy.findByText('Picture not found').should('be.visible');
  });
});
