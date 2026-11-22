import {user} from '../../support/fixtures';
import {expectCall, mockApi, RED_BORDER, reply, signIn, t, visit} from '../../support/helpers';

// 1x1 PNG chosen as the new photo
const PHOTO = {
  fileName: 'me.png',
  mimeType: 'image/png',
  contents: Cypress.Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
    'base64',
  ),
};

const field = (key: string) => cy.findByLabelText(t(`profile.${key}`));
const save = () => cy.findByRole('button', {name: t('profile.save')}).click();

describe('edit profile', () => {
  beforeEach(() => {
    signIn('user', user);
  });

  it('is filled with the current profile, the e-mail is read-only', () => {
    mockApi();
    visit('/profile/edit');

    field('fullname').should('have.value', 'Lan Nguyễn');
    field('phone').should('have.value', '0901234567');
    field('address').should('have.value', 'Hà Nội');
    field('email').should('have.attr', 'readonly');
  });

  it('every empty field has its own message, with the red border', () => {
    mockApi();
    visit('/profile/edit');

    field('fullname').clear();
    field('phone').clear();
    field('address').clear();
    save();

    cy.findByText(t('profile.errors.fullname')).should('be.visible');
    cy.findByText(t('profile.errors.phone')).should('be.visible');
    cy.findByText(t('profile.errors.address')).should('be.visible');
    field('fullname').should('have.css', 'border-top-color', RED_BORDER);
  });

  it('the phone number takes digits only, and must have 10 of them', () => {
    mockApi();
    visit('/profile/edit');

    field('phone').clear().type('09a01-23');
    field('phone').should('have.value', '090123');
    save();

    cy.findByText(t('profile.invalidPhone')).should('be.visible');
  });

  it('shows an error when a field is left after a change, not before', () => {
    mockApi();
    visit('/profile/edit');
    field('address').focus();
    field('phone').focus();
    cy.findByText(t('profile.errors.address')).should('not.exist');

    field('fullname').clear();
    field('address').focus();

    cy.findByText(t('profile.errors.fullname')).should('be.visible');
  });

  it('saves the profile and goes back to the account', () => {
    const calls = mockApi({'POST /user/profile': {message: 'ok'}});
    visit('/profile/edit');

    field('fullname').clear().type('Lan N.');
    save();

    cy.location('pathname').should('eq', '/profile');
    expectCall(calls, 'POST', '/user/profile')
      .its('body')
      .should('deep.equal', {fullname: 'Lan N.', email: 'lan@x.vn', phone: '0901234567', address: 'Hà Nội', image: 'http://img.e2e/lan.jpg'});
    cy.findByRole('heading', {name: 'Lan N.'}).should('be.visible');
  });

  it('uploads a newly chosen photo, then saves its address', () => {
    const calls = mockApi({
      'POST /upload/image': {url: 'http://img.e2e/new.jpg'},
      'POST /user/profile': {message: 'ok'},
    });
    visit('/profile/edit');

    cy.get('input[type="file"]').selectFile(PHOTO, {force: true});
    cy.get('img[src^="blob:"]').should('exist');
    save();

    cy.location('pathname').should('eq', '/profile');
    expectCall(calls, 'POST', '/upload/image');
    expectCall(calls, 'POST', '/user/profile').its('body').should('deep.include', {image: 'http://img.e2e/new.jpg'});
  });

  it('explains a photo that is too large', () => {
    mockApi({'POST /upload/image': reply(413, {code: 'IMAGE_TOO_LARGE'})});
    visit('/profile/edit');

    cy.get('input[type="file"]').selectFile(PHOTO, {force: true});
    save();

    cy.findByText(t('common.imageTooLarge')).should('be.visible');
    cy.findByRole('button', {name: t('profile.save')}).should('be.enabled');
  });

  it('explains any other failure and lets the user try again', () => {
    mockApi({'POST /user/profile': reply(500)});
    visit('/profile/edit');

    save();

    cy.findByText(t('profile.saveFailed')).should('be.visible');
    cy.location('pathname').should('eq', '/profile/edit');
  });
});
